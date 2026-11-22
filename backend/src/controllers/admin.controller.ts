import { Response } from "express";
import { AppDataSource } from "../data-source";
import { DriverVerification, VerificationStatus } from "../entities/DriverVerification";
import { User, UserRole } from "../entities/User";
import { AuditAction } from "../entities/AuditLog";
import { SentinelService } from "../services/SentinelService";
import { AuthRequest } from "../middleware/auth.middleware";

// All handlers here run behind authMiddleware + adminOnly, and every query is
// limited to the admin's own tenant.

export const listDriverApplications = async (req: AuthRequest, res: Response) => {
    const status = (req.query.status as VerificationStatus) || VerificationStatus.PENDING;
    const applications = await AppDataSource.getRepository(DriverVerification).find({
        where: { status, user: { tenantId: req.user.tenantId } },
        relations: ["user"],
        order: { createdAt: "ASC" },
    });
    res.json(applications);
};

const findApplication = (id: string, tenantId: string) =>
    AppDataSource.getRepository(DriverVerification).findOne({
        where: { id, user: { tenantId } },
        relations: ["user"],
    });

export const approveDriverApplication = async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const application = await findApplication(id, req.user.tenantId);
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (application.status !== VerificationStatus.PENDING) {
        return res.status(409).json({ message: `Application is already ${application.status}` });
    }

    // Both writes or neither — an approved application with a rider account
    // (or the reverse) would leave the driver unable to work or unvetted.
    await AppDataSource.transaction(async (manager) => {
        application.status = VerificationStatus.APPROVED;
        application.rejectionReason = undefined;
        await manager.save(application);
        await manager.update(User, { id: application.user.id }, { role: UserRole.DRIVER });
    });

    await SentinelService.log(AuditAction.PROFILE_UPDATE, application.user.id, {
        action: "DRIVER_APPROVED",
        approvedBy: req.user.id,
    });

    res.json({ message: "Driver approved. They'll get driver access next time they log in." });
};

export const rejectDriverApplication = async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "A rejection reason is required" });

    const application = await findApplication(id, req.user.tenantId);
    if (!application) return res.status(404).json({ message: "Application not found" });
    if (application.status !== VerificationStatus.PENDING) {
        return res.status(409).json({ message: `Application is already ${application.status}` });
    }

    application.status = VerificationStatus.REJECTED;
    application.rejectionReason = reason.trim();
    await AppDataSource.getRepository(DriverVerification).save(application);

    await SentinelService.log(AuditAction.PROFILE_UPDATE, application.user.id, {
        action: "DRIVER_REJECTED",
        rejectedBy: req.user.id,
        reason: application.rejectionReason,
    });

    res.json({ message: "Application rejected." });
};

import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Ride } from "../entities/Ride";
import { KycService } from "../services/KycService";
import { ReferralService } from "../services/ReferralService";
import { SupportTicket } from "../entities/SupportTicket";
import { EmergencyContact } from "../entities/EmergencyContact";
import { AuditAction } from "../entities/AuditLog";
import { SentinelService } from "../services/SentinelService";
import { TenantRequest } from "../middleware/tenant.middleware";

// Public (no auth required — these are marketing numbers), but still scoped
// to the requesting tenant (resolveTenant runs ahead of this on every
// /api/platform route) — otherwise one operator's rider count and revenue
// would be visible to every other operator sharing this backend.
export const getPlatformStats = async (req: TenantRequest, res: Response) => {
    const tenantId = req.tenant!.id;
    const userRepository = AppDataSource.getRepository(User);
    const rideRepository = AppDataSource.getRepository(Ride);

    const totalUsers = await userRepository.count({ where: { tenantId } });
    const totalRides = await rideRepository.count({ where: { tenantId } });
    const totalRevenue = await rideRepository
        .createQueryBuilder("ride")
        .select("SUM(ride.platformFee)", "sum")
        .where("ride.tenantId = :tenantId", { tenantId })
        .getRawOne();

    res.json({
        totalUsers,
        totalRides,
        platformEarnings: totalRevenue.sum || 0
    });
};

// Public, tenant-scoped branding — lets a single app build render a
// different name/color/logo per operator at runtime instead of needing a
// separate store listing and rebuild for every white-labeled tenant.
export const getTenantConfig = async (req: TenantRequest, res: Response) => {
    const tenant = req.tenant!;
    res.json({
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
    });
};

export const verifyKyc = async (req: Request, res: Response) => {
    // userId must come from the authenticated session, never the request
    // body — otherwise any logged-in user could KYC-verify any other
    // account (e.g. mark an unverified driver as verified).
    const userId = (req as any).user.id;
    const { governmentId, idType } = req.body;
    const success = await KycService.verifyIdentity(userId, governmentId, idType);
    if (success) {
        res.json({ message: "Identity Verified successfully" });
    } else {
        res.status(400).json({ message: "Identity Verification failed" });
    }
};

export const setupReferral = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });

    if (user && !user.referralCode) {
        user.referralCode = ReferralService.generateReferralCode();
        await userRepository.save(user);
    }

    res.json({ referralCode: user?.referralCode });
};

export const createSupportTicket = async (req: Request, res: Response) => {
    const ticketRepository = AppDataSource.getRepository(SupportTicket);
    const { subject, message } = req.body;
    const userId = (req as any).user.id;

    const ticket = ticketRepository.create({
        user: { id: userId },
        subject,
        message
    });

    await ticketRepository.save(ticket);
    res.json({ message: "Ticket created successfully", ticketId: ticket.id });
};

export const getEmergencyContacts = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const contacts = await AppDataSource.getRepository(EmergencyContact).find({
        where: { user: { id: userId } },
        order: { createdAt: "ASC" },
    });
    res.json(contacts);
};

export const addEmergencyContact = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { name, phoneNumber } = req.body;
    if (!name || !phoneNumber) {
        return res.status(400).json({ message: "Name and phone number are required" });
    }

    const repo = AppDataSource.getRepository(EmergencyContact);
    const contact = await repo.save(repo.create({ user: { id: userId } as any, name, phoneNumber }));
    res.status(201).json(contact);
};

export const removeEmergencyContact = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { contactId } = req.params as { contactId: string };
    // Scoped to the caller's own contacts — a contact id alone isn't enough.
    const result = await AppDataSource.getRepository(EmergencyContact).delete({ id: contactId, user: { id: userId } });
    if (!result.affected) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact removed" });
};

// Records the emergency server-side (with location and ride) and returns the
// caller's contacts. No SMS provider is configured, so the app itself sends
// the alert through the phone's own SMS app — this endpoint must never be
// the only thing standing between a rider and getting help, which is why
// the app opens the SMS composer even if this call fails.
export const triggerSos = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { lat, lng, rideId } = req.body;

    await SentinelService.log(AuditAction.EMERGENCY_TRIGGER, userId, { lat, lng, rideId }, req.ip);

    const contacts = await AppDataSource.getRepository(EmergencyContact).find({ where: { user: { id: userId } } });
    res.json({ recorded: true, contacts });
};

export const getMyTickets = async (req: Request, res: Response) => {
    const ticketRepository = AppDataSource.getRepository(SupportTicket);
    const userId = (req as any).user.id;

    const tickets = await ticketRepository.find({
        where: { user: { id: userId } },
        order: { createdAt: "DESC" }
    });

    res.json(tickets);
};

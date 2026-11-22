import { Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";
import { User, UserRole } from "../entities/User";
import { AuthRequest } from "./auth.middleware";

// Mount after authMiddleware. Checks the stored role rather than the one in
// the token, which can be up to 7 days stale — demoting an admin has to take
// effect immediately. Scoped to the request's tenant, so an admin of one
// operator has no admin rights over another.
export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = await AppDataSource.getRepository(User).findOneBy({
        id: req.user?.id,
        tenantId: req.user?.tenantId,
    });
    if (!user || user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};

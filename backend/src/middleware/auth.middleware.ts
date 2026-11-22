import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { TenantRequest } from "./tenant.middleware";

export interface AuthRequest extends TenantRequest {
    user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = verifyToken(token) as any;

        // A token minted for one tenant must never authenticate against a
        // different tenant's data, even though they share this backend —
        // resolveTenant (mounted earlier) has already set req.tenant from
        // the request's own X-Tenant-Slug header.
        if (!req.tenant || decoded.tenantId !== req.tenant.id) {
            return res.status(401).json({ message: "Token does not match this tenant" });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
};

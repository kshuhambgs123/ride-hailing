import { Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { AppDataSource } from "../data-source";
import { Tenant } from "../entities/Tenant";
import { DEFAULT_TENANT_SLUG } from "./tenant.middleware";

// Without this, any websocket client can claim to be any user — chat
// senderId and driver tracking driverId were previously taken straight from
// the client payload with no verification at all.
export const socketAuth = async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token;
    const tenantSlug = socket.handshake.auth?.tenantSlug || DEFAULT_TENANT_SLUG;

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {
        const decoded = verifyToken(token) as { id: string; role: string; tenantId: string };

        const tenant = await AppDataSource.getRepository(Tenant).findOne({ where: { slug: tenantSlug } });
        // Mirrors authMiddleware's HTTP-side check — a token minted for one
        // tenant must not authenticate a socket connection opened under a
        // different tenant's slug.
        if (!tenant || !tenant.isActive || decoded.tenantId !== tenant.id) {
            return next(new Error("Token does not match this tenant"));
        }

        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        socket.data.tenantId = decoded.tenantId;
        next();
    } catch (err) {
        next(new Error("Invalid or expired token"));
    }
};

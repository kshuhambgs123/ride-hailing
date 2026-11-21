import { Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";

// Without this, any websocket client can claim to be any user — chat
// senderId and driver tracking driverId were previously taken straight from
// the client payload with no verification at all.
export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {
        const decoded = verifyToken(token) as { id: string; role: string };
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        next();
    } catch (err) {
        next(new Error("Invalid or expired token"));
    }
};

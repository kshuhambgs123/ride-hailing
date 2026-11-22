import { Server as SocketServer } from "socket.io";
import { RedisService } from "./RedisService";

export class TrackingService {
    private static io: SocketServer;

    static setIO(io: SocketServer) {
        this.io = io;

        this.io.on("connection", (socket) => {
            console.log("Client connected for tracking:", socket.id);

            // driverId comes from the authenticated socket, never the client
            // payload — otherwise any connected client could spoof any
            // driver's live GPS location.
            socket.on("updateLocation", async (data: { lat: number, lng: number }) => {
                if (socket.data.role !== "driver") {
                    console.warn(`Socket ${socket.id} denied location update: not a driver`);
                    return;
                }

                const driverId = socket.data.userId;
                const { lat, lng } = data;
                await RedisService.updateDriverLocation(driverId, lat, lng);

                // Broadcast to passengers watching this driver
                this.io.emit(`tracking:${driverId}`, { lat, lng });
            });
        });
    }

    // Scoped to the ride's room (same room ChatService uses), not broadcast
    // globally — only the passenger and driver on this specific ride ever
    // join it, via `join_ride_chat`.
    static emitRideStatusUpdate(rideId: string, status: string, extra: Record<string, unknown> = {}) {
        if (this.io) {
            this.io.to(rideId).emit(`rideStatus:${rideId}`, { status, ...extra });
        }
    }
}

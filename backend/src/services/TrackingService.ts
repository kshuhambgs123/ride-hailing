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

    static emitRideStatusUpdate(rideId: string, status: string) {
        if (this.io) {
            this.io.emit(`rideStatus:${rideId}`, { status });
        }
    }
}

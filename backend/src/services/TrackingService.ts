import { Server as SocketServer } from "socket.io";
import { RedisService } from "./RedisService";

export class TrackingService {
    private static io: SocketServer;

    static setIO(io: SocketServer) {
        this.io = io;

        this.io.on("connection", (socket) => {
            console.log("Client connected for tracking:", socket.id);

            socket.on("updateLocation", async (data: { driverId: string, lat: number, lng: number }) => {
                const { driverId, lat, lng } = data;
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

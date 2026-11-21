import { Server, Socket } from "socket.io";
import { AppDataSource } from "../data-source";
import { Message } from "../entities/Message";
import { User } from "../entities/User";
import { Ride } from "../entities/Ride";

export class ChatService {
    private static io: Server;

    static init(io: Server) {
        this.io = io;
        this.io.on("connection", (socket: Socket) => {
            console.log("User connected to chat:", socket.id);

            socket.on("join_ride_chat", async (rideId: string) => {
                const isParticipant = await ChatService.isRideParticipant(rideId, socket.data.userId);
                if (!isParticipant) {
                    console.warn(`Socket ${socket.id} denied join on ride ${rideId}: not a participant`);
                    return;
                }
                socket.join(rideId);
                console.log(`Socket ${socket.id} joined ride chat: ${rideId}`);
            });

            // senderId comes from the authenticated socket, never the client
            // payload — otherwise any connected client could post messages
            // (and receiverId pairings) as any other user.
            socket.on("send_message", async (data: { rideId: string, receiverId: string, content: string }) => {
                const senderId = socket.data.userId;
                const isParticipant = await ChatService.isRideParticipant(data.rideId, senderId);
                if (!isParticipant) {
                    console.warn(`Socket ${socket.id} denied send on ride ${data.rideId}: not a participant`);
                    return;
                }

                const messageRepository = AppDataSource.getRepository(Message);

                const message = messageRepository.create({
                    ride: { id: data.rideId } as Ride,
                    sender: { id: senderId } as User,
                    receiver: { id: data.receiverId } as User,
                    content: data.content
                });

                await messageRepository.save(message);

                // Broadcast to the ride room
                this.io.to(data.rideId).emit("new_message", message);
            });

            socket.on("disconnect", () => {
                console.log("User disconnected from chat");
            });
        });
    }

    static async isRideParticipant(rideId: string, userId: string): Promise<boolean> {
        if (!rideId || !userId) return false;
        const rideRepository = AppDataSource.getRepository(Ride);
        const ride = await rideRepository.findOne({
            where: { id: rideId },
            relations: ["passenger", "driver"],
        });
        if (!ride) return false;
        return ride.passenger?.id === userId || ride.driver?.id === userId;
    }

    static async getChatHistory(rideId: string) {
        const messageRepository = AppDataSource.getRepository(Message);
        return await messageRepository.find({
            where: { ride: { id: rideId } },
            relations: ["sender"],
            order: { createdAt: "ASC" }
        });
    }
}

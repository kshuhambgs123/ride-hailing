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

            socket.on("join_ride_chat", (rideId: string) => {
                socket.join(rideId);
                console.log(`Socket ${socket.id} joined ride chat: ${rideId}`);
            });

            socket.on("send_message", async (data: { rideId: string, senderId: string, receiverId: string, content: string }) => {
                const messageRepository = AppDataSource.getRepository(Message);

                const message = messageRepository.create({
                    ride: { id: data.rideId } as Ride,
                    sender: { id: data.senderId } as User,
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

    static async getChatHistory(rideId: string) {
        const messageRepository = AppDataSource.getRepository(Message);
        return await messageRepository.find({
            where: { ride: { id: rideId } },
            relations: ["sender"],
            order: { createdAt: "ASC" }
        });
    }
}

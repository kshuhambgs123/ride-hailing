import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Ride } from "../entities/Ride";
import { KycService } from "../services/KycService";
import { ReferralService } from "../services/ReferralService";
import { SupportTicket } from "../entities/SupportTicket";

export const getPlatformStats = async (req: Request, res: Response) => {
    const userRepository = AppDataSource.getRepository(User);
    const rideRepository = AppDataSource.getRepository(Ride);

    const totalUsers = await userRepository.count();
    const totalRides = await rideRepository.count();
    const totalRevenue = await rideRepository
        .createQueryBuilder("ride")
        .select("SUM(ride.platformFee)", "sum")
        .getRawOne();

    res.json({
        totalUsers,
        totalRides,
        platformEarnings: totalRevenue.sum || 0
    });
};

export const verifyKyc = async (req: Request, res: Response) => {
    const { userId, governmentId, idType } = req.body;
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

export const getMyTickets = async (req: Request, res: Response) => {
    const ticketRepository = AppDataSource.getRepository(SupportTicket);
    const userId = (req as any).user.id;

    const tickets = await ticketRepository.find({
        where: { user: { id: userId } },
        order: { createdAt: "DESC" }
    });

    res.json(tickets);
};

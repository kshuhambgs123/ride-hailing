import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Review } from "../entities/Review";
import { Ride } from "../entities/Ride";
import { User } from "../entities/User";

export const createReview = async (req: Request, res: Response) => {
    const reviewRepository = AppDataSource.getRepository(Review);
    const rideRepository = AppDataSource.getRepository(Ride);
    const { rideId, revieweeId, rating, comment } = req.body;
    const reviewerId = (req as any).user.id;

    try {
        const ride = await rideRepository.findOneBy({ id: rideId });
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        const review = reviewRepository.create({
            ride,
            reviewer: { id: reviewerId } as User,
            reviewee: { id: revieweeId } as User,
            rating,
            comment,
        });

        await reviewRepository.save(review);
        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: "Error creating review", error });
    }
};

export const getReviewsForUser = async (req: Request, res: Response) => {
    const reviewRepository = AppDataSource.getRepository(Review);
    const { userId } = req.params;

    try {
        const reviews = await reviewRepository.find({
            where: { reviewee: { id: userId as string } },
            relations: ["reviewer"],
        });
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Error fetching reviews", error });
    }
};

import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../data-source";
import { Ride, RideStatus } from "../entities/Ride";
import { User } from "../entities/User";
import { MatchmakingService } from "../services/MatchmakingService";
import { SuggestionService } from "../services/SuggestionService";
import { VoiceNlpService } from "../services/VoiceNlpService";
import { PaymentService } from "../services/PaymentService";
import { WalletService } from "../services/WalletService";
import { LocationService } from "../services/LocationService";
import { DiscoveryService } from "../services/DiscoveryService";
import { SentinelService } from "../services/SentinelService";
import { PricingService } from "../services/PricingService";
import { SchedulingService } from "../services/SchedulingService";
import { AuditAction } from "../entities/AuditLog";

export const requestRide = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);
    const userRepository = AppDataSource.getRepository(User);
    const { pickupLat, pickupLng, destinationLat, destinationLng, fare } = req.body;
    const passengerId = req.user.id;

    try {
        const passenger = await userRepository.findOneBy({ id: passengerId });
        if (!passenger) return res.status(404).json({ message: "Passenger not found" });

        const ride = rideRepository.create({
            passenger,
            pickupLat,
            pickupLng,
            destinationLat,
            destinationLng,
            fare,
            status: RideStatus.PENDING,
        });

        await rideRepository.save(ride);
        res.status(201).json(ride);
    } catch (error) {
        res.status(500).json({ message: "Error requesting ride", error });
    }
};

export const acceptRide = async (req: AuthRequest, res: Response) => {
    // ... (keep existing)
};

export const publishRide = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);
    const { pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress, departureTime, fare, totalSeats, rideType } = req.body;
    const driverId = req.user.id;

    try {
        const ride = rideRepository.create({
            driver: { id: driverId },
            pickupLat, pickupLng, destinationLat, destinationLng,
            pickupAddress, destinationAddress, departureTime,
            fare, totalSeats, availableSeats: totalSeats,
            rideType,
            status: RideStatus.PENDING,
        });

        await rideRepository.save(ride);
        res.status(201).json(ride);
    } catch (error) {
        res.status(500).json({ message: "Error publishing ride", error });
    }
};

export const searchRides = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);
    const { pLat, pLng, dLat, dLng } = req.query;

    try {
        const pickup = { lat: Number(pLat), lng: Number(pLng) };
        const destination = { lat: Number(dLat), lng: Number(dLng) };

        const offset = 0.5; // Approx 50km bounding box for initial filtering
        const matches = await rideRepository.createQueryBuilder("ride")
            .leftJoinAndSelect("ride.driver", "driver")
            .where("ride.status = :status", { status: RideStatus.PENDING })
            .andWhere("ride.pickupLat BETWEEN :minLat AND :maxLat", {
                minLat: pickup.lat - offset,
                maxLat: pickup.lat + offset
            })
            .andWhere("ride.pickupLng BETWEEN :minLng AND :maxLng", {
                minLng: pickup.lng - offset,
                maxLng: pickup.lng + offset
            })
            .getMany();

        // Final precise filtering using Segment Match logic
        const preciseMatches = matches.filter(offer => {
            if (!offer.driver) return false;
            return MatchmakingService.isMatch(
                { lat: Number(offer.pickupLat), lng: Number(offer.pickupLng) },
                { lat: Number(offer.destinationLat), lng: Number(offer.destinationLng) },
                pickup,
                destination
            );
        });

        res.json(preciseMatches);
    } catch (error) {
        res.status(500).json({ message: "Error searching rides", error });
    }
};

export const getSmartSuggestions = async (req: AuthRequest, res: Response) => {
    const { lat, lng } = req.query;
    const userId = req.user.id;

    try {
        const suggestions = await SuggestionService.getSuggestions(
            userId,
            Number(lat),
            Number(lng)
        );
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: "Error getting suggestions", error });
    }
};

export const parseVoiceBooking = async (req: AuthRequest, res: Response) => {
    const { command } = req.body;

    try {
        const intent = await VoiceNlpService.parseBookingCommand(command);
        res.json(intent);
    } catch (error) {
        res.status(500).json({ message: "Error parsing voice command", error });
    }
};

export const payRide = async (req: AuthRequest, res: Response) => {
    const { rideId, amount, provider } = req.body;
    const userId = req.user.id;
    const rideRepo = AppDataSource.getRepository(Ride);

    try {
        const ride = await rideRepo.findOneBy({ id: rideId });
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        // ELITE SETTLEMENT: Subtract already-paid scheduling fee from final fare
        const depositPaid = Number(ride.schedulingFee) || 0;
        const remainingToPay = Math.max(0, Number(ride.fare) - depositPaid);

        if (provider === "wallet") {
            const newBalance = await WalletService.debitWallet(userId, remainingToPay, rideId);
            ride.paymentStatus = "paid" as any;
            await rideRepo.save(ride);

            return res.json({
                message: `Settled! Fare: $${ride.fare} (Deposit $${depositPaid} used, Paid remaining $${remainingToPay})`,
                newBalance
            });
        }

        // External providers
        const result = await PaymentService.createPaymentIntent(remainingToPay, "usd", provider, rideId, userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Payment failed", error: (error as Error).message });
    }
};

export const cancelRide = async (req: AuthRequest, res: Response) => {
    const { rideId } = req.body;
    const userId = req.user.id;
    const rideRepo = AppDataSource.getRepository(Ride);

    try {
        const ride = await rideRepo.findOne({
            where: { id: rideId, passenger: { id: userId } }
        });

        if (!ride) return res.status(404).json({ message: "Ride not found" });

        const CANCELLATION_FEE = 2.00;
        let responseMessage = "Ride cancelled.";

        // ELITE COMPENSATION: If driver already accepted, compensate them
        if (ride.status === RideStatus.ACCEPTED && ride.driver) {
            await WalletService.debitWallet(userId, CANCELLATION_FEE, `CANCEL_FEE_RIDE_${rideId}`);
            await WalletService.creditWallet(ride.driver.id, CANCELLATION_FEE, `DRIVER_COMP_RIDE_${rideId}`);
            ride.cancellationFee = CANCELLATION_FEE;
            responseMessage = `Ride cancelled. A $${CANCELLATION_FEE} fee was charged to compensate the driver.`;

            await SentinelService.log(AuditAction.WALLET_DEBIT, userId, { rideId, amount: CANCELLATION_FEE, type: "CANCELLATION_PENALTY" });
            await SentinelService.log(AuditAction.WALLET_CREDIT, ride.driver.id, { rideId, amount: CANCELLATION_FEE, type: "DRIVER_COMPENSATION" });
        }

        // CHRONOS REFUND: If scheduled ride is cancelled before matching, refund deposit
        if (ride.status === RideStatus.SCHEDULED && Number(ride.schedulingFee) > 0) {
            await WalletService.creditWallet(userId, Number(ride.schedulingFee), `REFUND_CHRONOS_${rideId}`);
            await SentinelService.log(AuditAction.WALLET_CREDIT, userId, { rideId, amount: ride.schedulingFee, type: "CHRONOS_REFUND" });
            responseMessage = "Scheduled ride cancelled and deposit refunded.";
        }

        ride.status = RideStatus.CANCELLED;
        await rideRepo.save(ride);

        await SentinelService.log(AuditAction.RIDE_CANCELLED, userId, { rideId });

        res.json({ message: responseMessage });
    } catch (error) {
        res.status(500).json({ message: "Cancellation failed", error });
    }
};

export const getFareEstimate = async (req: AuthRequest, res: Response) => {
    const { distanceKm, rideType, seats } = req.body;
    try {
        const fare = PricingService.calculatePrice(distanceKm, rideType, seats);
        res.json({ fare });
    } catch (error) {
        res.status(500).json({ message: "Failed to estimate fare" });
    }
};

export const searchPlaces = async (req: AuthRequest, res: Response) => {
    const { query } = req.query;
    try {
        const results = await LocationService.searchPlaces(query as string);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: "Search failed" });
    }
};

export const getRecommendations = async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    try {
        const results = await DiscoveryService.getRecommendations(userId);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: "Failed to get recommendations" });
    }
};
export const scheduleRide = async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    try {
        const result = await SchedulingService.scheduleOneOffRide(userId, req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to schedule ride", error });
    }
};

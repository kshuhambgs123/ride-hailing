import { Response } from "express";
import { IsNull } from "typeorm";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppDataSource } from "../data-source";
import { Ride, RideStatus, RideType, PaymentStatus } from "../entities/Ride";
import { TrackingService } from "../services/TrackingService";
import { User } from "../entities/User";
import { MatchmakingService } from "../services/MatchmakingService";
import { SuggestionService } from "../services/SuggestionService";
import { VoiceNlpService } from "../services/VoiceNlpService";
import { PaymentService } from "../services/PaymentService";
import { WalletService } from "../services/WalletService";
import { LocationService } from "../services/LocationService";
import { DiscoveryService } from "../services/DiscoveryService";
import { SentinelService } from "../services/SentinelService";
import { PricingService, TripValidationError } from "../services/PricingService";
import { SchedulingService } from "../services/SchedulingService";
import { AuditAction } from "../entities/AuditLog";
import { Transaction, TransactionType, TransactionStatus } from "../entities/Transaction";
import { Tenant } from "../entities/Tenant";

export const requestRide = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);
    const userRepository = AppDataSource.getRepository(User);
    // Any `fare` in the body is deliberately ignored — the price is computed
    // here from the coordinates, so a client can't book a ride for 1.
    const { pickupLat, pickupLng, destinationLat, destinationLng, rideType, seats } = req.body;
    const passengerId = req.user.id;
    const pickup = { lat: Number(pickupLat), lng: Number(pickupLng) };
    const destination = { lat: Number(destinationLat), lng: Number(destinationLng) };

    if (!PricingService.isValidCoordinate(pickup) || !PricingService.isValidCoordinate(destination)) {
        return res.status(400).json({ message: "Valid pickup and destination coordinates are required" });
    }

    try {
        const passenger = await userRepository.findOneBy({ id: passengerId });
        if (!passenger) return res.status(404).json({ message: "Passenger not found" });

        const quote = PricingService.quote(pickup, destination, rideType, Number(seats) || 1);
        const tooFar = PricingService.distanceLimitError(quote.distanceKm, rideType);
        if (tooFar) return res.status(400).json({ message: tooFar });

        const ride = rideRepository.create({
            tenantId: req.user.tenantId,
            passenger,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            fare: quote.fare,
            baseFare: quote.breakdown.baseFare,
            distance: String(quote.distanceKm),
            totalSeats: Number(seats) || 1,
            rideType: rideType === RideType.INTERCITY ? RideType.INTERCITY : RideType.LOCAL,
            status: RideStatus.PENDING,
        });

        await rideRepository.save(ride);
        res.status(201).json(ride);
    } catch (error) {
        res.status(500).json({ message: "Error requesting ride", error });
    }
};

export const acceptRide = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);
    const userRepository = AppDataSource.getRepository(User);
    const { rideId } = req.params as { rideId: string };
    const driverId = req.user.id;

    try {
        const driver = await userRepository.findOneBy({ id: driverId, tenantId: req.user.tenantId });
        if (!driver) return res.status(404).json({ message: "Driver not found" });

        // Conditional UPDATE (not read-then-write) so two drivers racing to
        // accept the same request can't both succeed — only the first
        // UPDATE matching "still pending, no driver yet, same tenant" affects
        // a row.
        const result = await rideRepository.createQueryBuilder()
            .update(Ride)
            .set({ driver, status: RideStatus.ACCEPTED })
            .where("id = :rideId", { rideId })
            .andWhere("status = :pending", { pending: RideStatus.PENDING })
            .andWhere("driverId IS NULL")
            .andWhere("tenantId = :tenantId", { tenantId: req.user.tenantId })
            .execute();

        if (!result.affected) {
            return res.status(409).json({ message: "Ride is no longer available" });
        }

        const ride = await rideRepository.findOne({ where: { id: rideId }, relations: ["passenger", "driver"] });

        TrackingService.emitRideStatusUpdate(rideId, "accepted", {
            driverId: driver.id,
            driverName: driver.displayName || "Your driver",
        });

        res.json(ride);
    } catch (error) {
        res.status(500).json({ message: "Error accepting ride", error });
    }
};

export const getPendingRideRequests = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);

    try {
        // Carpool offers (created via /publish) always have a driver already
        // set, so filtering on driver IS NULL here naturally returns only
        // on-demand requests waiting to be matched.
        const requests = await rideRepository.find({
            where: { status: RideStatus.PENDING, driver: IsNull(), tenantId: req.user.tenantId },
            relations: ["passenger"],
            order: { createdAt: "ASC" },
            take: 50,
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching ride requests", error });
    }
};

export const publishRide = async (req: AuthRequest, res: Response) => {
    const rideRepository = AppDataSource.getRepository(Ride);
    const { pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress, departureTime, fare, totalSeats, rideType } = req.body;
    const driverId = req.user.id;

    try {
        const ride = rideRepository.create({
            tenantId: req.user.tenantId,
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
            .andWhere("ride.tenantId = :tenantId", { tenantId: req.user.tenantId })
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
    const { rideId, provider } = req.body;
    const userId = req.user.id;
    const rideRepo = AppDataSource.getRepository(Ride);
    const userRepo = AppDataSource.getRepository(User);

    try {
        const ride = await rideRepo.findOneBy({ id: rideId, tenantId: req.user.tenantId });
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        // ELITE SETTLEMENT: Subtract already-paid scheduling fee from final fare
        const depositPaid = Number(ride.schedulingFee) || 0;
        const remainingToPay = Math.max(0, Number(ride.fare) - depositPaid);

        if (provider === "wallet") {
            const newBalance = await WalletService.debitWallet(userId, remainingToPay, req.user.tenantId, rideId);
            ride.paymentStatus = "paid" as any;
            await rideRepo.save(ride);

            return res.json({
                message: `Settled! Fare: $${ride.fare} (Deposit $${depositPaid} used, Paid remaining $${remainingToPay})`,
                newBalance
            });
        }

        if (provider === "cash") {
            // Cash changes hands directly between rider and driver, so the
            // rider alone selecting it here is not proof it was paid —
            // paymentStatus stays PENDING until the driver confirms receipt
            // (confirmCashPayment below). This just records the intent and
            // tells the driver's app what to expect and show its "Confirm
            // Cash Received" action for.
            ride.paymentMethod = "cash";
            await rideRepo.save(ride);

            TrackingService.emitRideStatusUpdate(rideId, "cash_selected", {
                amount: remainingToPay,
            });

            return res.json({ message: `Pay the driver $${remainingToPay.toFixed(2)} in cash at the end of your trip.` });
        }

        // External gateways — the response only carries a pending intent /
        // checkout link; paymentStatus only ever moves to "paid" via that
        // gateway's webhook (see webhook.controller.ts), never from here.
        const payer = await userRepo.findOneBy({ id: userId });
        const defaultCurrency = provider === "razorpay" ? "INR" : "USD";
        const result = await PaymentService.createPaymentIntent(
            remainingToPay,
            defaultCurrency,
            provider,
            rideId,
            userId,
            req.user.tenantId,
            { name: payer?.displayName, contact: payer?.phoneNumber }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Payment failed", error: (error as Error).message });
    }
};

// Driver-only: the one place a cash ride is actually allowed to move from
// PENDING to PAID. Scoped to whoever is assigned as this ride's driver —
// not just "any driver" — so a rider can't call this themselves and a
// different driver can't falsely confirm someone else's cash collection.
export const confirmCashPayment = async (req: AuthRequest, res: Response) => {
    const { rideId } = req.params as { rideId: string };
    const driverId = req.user.id;
    const rideRepo = AppDataSource.getRepository(Ride);

    try {
        const ride = await rideRepo.findOne({ where: { id: rideId, tenantId: req.user.tenantId }, relations: ["driver", "passenger"] });
        if (!ride) return res.status(404).json({ message: "Ride not found" });
        if (ride.driver?.id !== driverId) {
            return res.status(403).json({ message: "Only this ride's assigned driver can confirm payment" });
        }
        if (ride.paymentMethod !== "cash") {
            return res.status(409).json({ message: "This ride was not set up for cash payment" });
        }
        if (ride.paymentStatus === PaymentStatus.PAID) {
            return res.status(409).json({ message: "Already confirmed" });
        }

        const depositPaid = Number(ride.schedulingFee) || 0;
        const remainingToPay = Math.max(0, Number(ride.fare) - depositPaid);

        ride.paymentStatus = PaymentStatus.PAID;
        await rideRepo.save(ride);

        const txRepo = AppDataSource.getRepository(Transaction);
        await txRepo.save(txRepo.create({
            tenantId: req.user.tenantId,
            user: { id: ride.passenger?.id },
            ride: { id: rideId },
            type: TransactionType.CASH,
            grossAmount: remainingToPay,
            netAmount: remainingToPay,
            currency: "usd",
            status: TransactionStatus.COMPLETED,
            provider: "cash",
        }));

        TrackingService.emitRideStatusUpdate(rideId, "cash_confirmed", { amount: remainingToPay });

        res.json({ message: `Confirmed: $${remainingToPay.toFixed(2)} received in cash.` });
    } catch (error) {
        res.status(500).json({ message: "Error confirming cash payment", error: (error as Error).message });
    }
};

// Driver-only, and only this ride's assigned driver. Without this, finished
// rides stayed "accepted" forever and the platform fee was never recorded.
export const completeRide = async (req: AuthRequest, res: Response) => {
    const { rideId } = req.params as { rideId: string };
    const rideRepo = AppDataSource.getRepository(Ride);

    try {
        const ride = await rideRepo.findOne({ where: { id: rideId, tenantId: req.user.tenantId }, relations: ["driver"] });
        if (!ride) return res.status(404).json({ message: "Ride not found" });
        if (ride.driver?.id !== req.user.id) {
            return res.status(403).json({ message: "Only this ride's assigned driver can complete it" });
        }
        if (ride.status !== RideStatus.ACCEPTED && ride.status !== RideStatus.ONGOING) {
            return res.status(409).json({ message: `Ride is ${ride.status}, not in progress` });
        }

        // Commission comes from the operator's own rate (Tenant.commissionRate),
        // not a hardcoded platform-wide percentage.
        const tenant = await AppDataSource.getRepository(Tenant).findOneBy({ id: req.user.tenantId });
        const rate = Number(tenant?.commissionRate ?? 0);

        await AppDataSource.transaction(async (manager) => {
            ride.status = RideStatus.COMPLETED;
            ride.platformFee = Math.round(Number(ride.fare) * rate * 100) / 100;
            await manager.save(ride);
            await manager.increment(User, { id: req.user.id }, "completedRideCount", 1);
        });

        await SentinelService.log(AuditAction.RIDE_COMPLETED, req.user.id, { rideId, platformFee: ride.platformFee });
        TrackingService.emitRideStatusUpdate(rideId, "completed");

        res.json({ message: "Trip completed.", platformFee: ride.platformFee });
    } catch (error) {
        res.status(500).json({ message: "Error completing ride", error: (error as Error).message });
    }
};

export const getMyRidesAsPassenger = async (req: AuthRequest, res: Response) => {
    const rides = await AppDataSource.getRepository(Ride).find({
        where: { passenger: { id: req.user.id }, tenantId: req.user.tenantId },
        order: { createdAt: "DESC" },
        take: 100,
    });
    res.json(rides);
};

export const cancelRide = async (req: AuthRequest, res: Response) => {
    const { rideId } = req.body;
    const userId = req.user.id;
    const rideRepo = AppDataSource.getRepository(Ride);

    try {
        const ride = await rideRepo.findOne({
            where: { id: rideId, passenger: { id: userId }, tenantId: req.user.tenantId }
        });

        if (!ride) return res.status(404).json({ message: "Ride not found" });

        const CANCELLATION_FEE = 2.00;
        let responseMessage = "Ride cancelled.";

        // ELITE COMPENSATION: If driver already accepted, compensate them
        if (ride.status === RideStatus.ACCEPTED && ride.driver) {
            await WalletService.debitWallet(userId, CANCELLATION_FEE, req.user.tenantId, `CANCEL_FEE_RIDE_${rideId}`);
            await WalletService.creditWallet(ride.driver.id, CANCELLATION_FEE, req.user.tenantId, `DRIVER_COMP_RIDE_${rideId}`);
            ride.cancellationFee = CANCELLATION_FEE;
            responseMessage = `Ride cancelled. A $${CANCELLATION_FEE} fee was charged to compensate the driver.`;

            await SentinelService.log(AuditAction.WALLET_DEBIT, userId, { rideId, amount: CANCELLATION_FEE, type: "CANCELLATION_PENALTY" });
            await SentinelService.log(AuditAction.WALLET_CREDIT, ride.driver.id, { rideId, amount: CANCELLATION_FEE, type: "DRIVER_COMPENSATION" });
        }

        // CHRONOS REFUND: If scheduled ride is cancelled before matching, refund deposit
        if (ride.status === RideStatus.SCHEDULED && Number(ride.schedulingFee) > 0) {
            await WalletService.creditWallet(userId, Number(ride.schedulingFee), req.user.tenantId, `REFUND_CHRONOS_${rideId}`);
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

// Takes coordinates, not a distance — the server works out the distance so
// the estimate always matches what requestRide will actually charge.
export const getFareEstimate = async (req: AuthRequest, res: Response) => {
    const { pickupLat, pickupLng, destinationLat, destinationLng, rideType, seats } = req.body;
    const pickup = { lat: Number(pickupLat), lng: Number(pickupLng) };
    const destination = { lat: Number(destinationLat), lng: Number(destinationLng) };

    if (!PricingService.isValidCoordinate(pickup) || !PricingService.isValidCoordinate(destination)) {
        return res.status(400).json({ message: "Valid pickup and destination coordinates are required" });
    }

    const quote = PricingService.quote(pickup, destination, rideType, Number(seats) || 1);
    const tooFar = PricingService.distanceLimitError(quote.distanceKm, rideType);
    if (tooFar) return res.status(400).json({ message: tooFar, distanceKm: quote.distanceKm });
    res.json(quote);
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
        const result = await SchedulingService.scheduleOneOffRide(userId, req.user.tenantId, req.body);
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof TripValidationError) return res.status(400).json({ message: error.message });
        res.status(500).json({ message: "Failed to schedule ride", error });
    }
};

import { AppDataSource } from "../data-source";
import { Ride, RideStatus, RideType } from "../entities/Ride";
import { WalletService } from "./WalletService";
import { PricingService, TripValidationError } from "./PricingService";
import { SentinelService } from "./SentinelService";
import { AuditAction } from "../entities/AuditLog";
import { serviceAreaError } from "../config/market";

export class SchedulingService {
    /**
     * Auto-Schedule Recurring Commute
     * Set once, travel forever.
     */
    static async scheduleRecurringRide(userId: string, data: {
        pickup: any,
        destination: any,
        time: string,
        days: string[] // ['Mon', 'Tue', ...]
    }) {
        console.log(`[Volo Infinity] Scheduling recurring commute for user ${userId} at ${data.time}`);

        // In a real system, this would be a CRON job or a scheduled task in Redis
        // For now, we simulate the intent storage
        return {
            success: true,
            message: "Commute automated! We will find your match every day at " + data.time,
            automationId: `COMMUTE_${Date.now()}`
        };
    }

    /**
     * Predictive Zero-Click Pre-Booking
     * Based on user habits, suggest or auto-book a ride.
     */
    static async getZeroClickIntent(userId: string): Promise<any> {
        // Mocking habit detection
        const hour = new Date().getHours();

        if (hour >= 8 && hour <= 10) {
            return {
                type: "COMMUTE_WORK",
                destination: "Office / Work HQ",
                confidence: 0.95,
                countdown: 10 // Seconds until auto-book
            };
        }

        if (hour >= 17 && hour <= 19) {
            return {
                type: "COMMUTE_HOME",
                destination: "Main Residence",
                confidence: 0.92,
                countdown: 10
            };
        }
        return null;
    }

    /**
     * Volo Chronos: One-Off Advance Booking
     * Precision scheduling for future rides.
     */
    static async scheduleOneOffRide(userId: string, tenantId: string, data: {
        pickupLat: number,
        pickupLng: number,
        destinationLat: number,
        destinationLng: number,
        pickupAddress: string,
        destinationAddress: string,
        departureTime: Date,
        payDeposit?: boolean
    }) {
        const pickup = { lat: Number(data.pickupLat), lng: Number(data.pickupLng) };
        const destination = { lat: Number(data.destinationLat), lng: Number(data.destinationLng) };
        // Validated before the deposit is taken, so a bad request can't
        // charge the rider for a ride that then fails to be created.
        if (!PricingService.isValidCoordinate(pickup) || !PricingService.isValidCoordinate(destination)) {
            throw new TripValidationError("Valid pickup and destination coordinates are required");
        }
        // Priced server-side, same as an on-demand request — a fare sent by
        // the app is never trusted.
        const outside = serviceAreaError(pickup, destination);
        if (outside) throw new TripValidationError(outside);

        const quote = PricingService.quote(pickup, destination, "local", 1);
        const tooFar = PricingService.distanceLimitError(quote.distanceKm, "local");
        if (tooFar) throw new TripValidationError(tooFar);

        const SCHEDULING_FEE = data.payDeposit ? 1.00 : 0;

        // 1. Debit the minimal scheduling fee ONLY if priority is requested
        if (SCHEDULING_FEE > 0) {
            await WalletService.debitWallet(userId, SCHEDULING_FEE, tenantId, "CHRONOS_PRIORITY_DEPOSIT");
        }

        const rideRepo = AppDataSource.getRepository(Ride);
        const ride = rideRepo.create({
            tenantId,
            passenger: { id: userId } as any,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            pickupAddress: data.pickupAddress,
            destinationAddress: data.destinationAddress,
            departureTime: data.departureTime,
            fare: quote.fare,
            baseFare: quote.breakdown.baseFare,
            distance: String(quote.distanceKm),
            schedulingFee: SCHEDULING_FEE,
            status: RideStatus.SCHEDULED,
            rideType: RideType.LOCAL
        });

        await rideRepo.save(ride);

        // 2. Log elite action with priority context
        await SentinelService.log(AuditAction.RIDE_REQUEST, userId, {
            rideId: ride.id,
            type: "ADVANCE_BOOKING",
            priority: data.payDeposit,
            fee: SCHEDULING_FEE
        });

        console.log(`[Volo Chronos] Advance ride scheduled for user ${userId} at ${data.departureTime} (Priority: ${data.payDeposit})`);

        return {
            success: true,
            message: data.payDeposit
                ? "Priority ride scheduled! $1.00 deposit paid and will be settled later."
                : "Ride scheduled for free! You can pay the full fare after your journey.",
            rideId: ride.id
        };
    }
}

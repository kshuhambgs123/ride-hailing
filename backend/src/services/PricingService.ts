export class PricingService {
    static calculatePrice(distanceKm: number, rideType: string, seats: number = 1, surgeMultiplier: number = 1.0): number {
        const baseRate = rideType === "intercity" ? 10 : 20;
        const perKmRate = rideType === "intercity" ? 5 : 12;

        // Apply Surge Multiplier (Elite Feature)
        let total = (baseRate + (distanceKm * perKmRate)) * surgeMultiplier;

        // Multi-seat discount for carpooling
        if (seats > 1) {
            total = total * (1 - (seats * 0.05)); // 5% off per extra seat
        }

        return parseFloat(total.toFixed(2));
    }

    /**
     * Elite Surge Algorithm: Calculates multiplier based on demand vs supply.
     * In a real app, this would query Redis/DB for nearby active requests vs available drivers.
     */
    static calculateSurge(demandCount: number, supplyCount: number): number {
        if (supplyCount === 0) return 2.5; // Max surge if no drivers
        const ratio = demandCount / supplyCount;

        if (ratio > 2.0) return 2.0;
        if (ratio > 1.5) return 1.5;
        if (ratio > 1.2) return 1.2;

        return 1.0;
    }
}

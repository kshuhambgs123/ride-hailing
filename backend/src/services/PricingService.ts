export type LatLng = { lat: number; lng: number };

export type FareQuote = {
    distanceKm: number;
    fare: number;
    breakdown: {
        baseFare: number;
        distanceFare: number;
        surgeMultiplier: number;
        seatDiscount: number;
    };
};

// Rates per ride type. One place to change, and the natural thing to move
// onto Tenant later so each operator can set its own prices.
const RATES: Record<string, { base: number; perKm: number }> = {
    local: { base: 20, perKm: 12 },
    intercity: { base: 10, perKm: 5 },
};

// Roads are longer than a straight line between two points; ~1.3x is the
// usual rule of thumb for city driving. Replace estimateDistanceKm with a
// routing service (Google Distance Matrix, OSRM) for real road distance.
const ROAD_FACTOR = 1.3;
const EARTH_RADIUS_KM = 6371;

export class PricingService {
    static isValidCoordinate(p: Partial<LatLng> | undefined): p is LatLng {
        return !!p
            && typeof p.lat === "number" && Number.isFinite(p.lat) && p.lat >= -90 && p.lat <= 90
            && typeof p.lng === "number" && Number.isFinite(p.lng) && p.lng >= -180 && p.lng <= 180;
    }

    // Great-circle (haversine) distance in km.
    static straightLineKm(a: LatLng, b: LatLng): number {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
    }

    static estimateDistanceKm(pickup: LatLng, destination: LatLng): number {
        return Math.round(this.straightLineKm(pickup, destination) * ROAD_FACTOR * 100) / 100;
    }

    static calculatePrice(distanceKm: number, rideType: string, seats: number = 1, surgeMultiplier: number = 1.0): number {
        return this.priceFromDistance(distanceKm, rideType, seats, surgeMultiplier).fare;
    }

    private static priceFromDistance(distanceKm: number, rideType: string, seats: number, surgeMultiplier: number) {
        const rates = RATES[rideType] ?? RATES.local;
        const distanceFare = distanceKm * rates.perKm;
        let total = (rates.base + distanceFare) * surgeMultiplier;

        // Carpool discount: 5% per seat once more than one seat is booked
        // (2 seats = 10%, 3 = 15% — see tests/pricing.test.ts), capped at 30%
        // so a large seat count can't make a ride free.
        const seatCount = Math.max(1, Math.floor(seats));
        const seatDiscount = seatCount > 1 ? Math.min(seatCount * 0.05, 0.3) : 0;
        total = total * (1 - seatDiscount);

        return {
            fare: Math.round(total * 100) / 100,
            breakdown: {
                baseFare: rates.base,
                distanceFare: Math.round(distanceFare * 100) / 100,
                surgeMultiplier,
                seatDiscount,
            },
        };
    }

    // The single source of truth for what a trip costs. Every place that
    // stores a fare (request, schedule) calls this — never trusts a fare
    // sent by the app, which anyone calling the API directly could set to 1.
    static quote(pickup: LatLng, destination: LatLng, rideType: string = "local", seats: number = 1): FareQuote {
        const distanceKm = this.estimateDistanceKm(pickup, destination);
        const { fare, breakdown } = this.priceFromDistance(distanceKm, rideType, seats, 1.0);
        return { distanceKm, fare, breakdown };
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

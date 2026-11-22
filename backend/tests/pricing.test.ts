import { PricingService } from "../src/services/PricingService";

// Connaught Place → India Gate, New Delhi: ~2.4 km apart in a straight line.
const CONNAUGHT_PLACE = { lat: 28.6315, lng: 77.2167 };
const INDIA_GATE = { lat: 28.6129, lng: 77.2295 };

describe("PricingService", () => {
    test("should calculate price correctly for local ride with 1 seat", () => {
        const price = PricingService.calculatePrice(10, "local", 1);
        expect(price).toBe(140); // 20 (base) + (10 * 12) = 140
    });

    test("should calculate price correctly for intercity ride with 2 seats", () => {
        const price = PricingService.calculatePrice(100, "intercity", 2);
        // base 10 + (100 * 5) = 510
        // discount 2 seats = 10%
        // 510 * 0.9 = 459
        expect(price).toBe(459);
    });

    test("should handle multi-seat discounts", () => {
        const price1 = PricingService.calculatePrice(50, "local", 1);
        const price2 = PricingService.calculatePrice(50, "local", 3);

        // base 20 + (50 * 12) = 620
        // 3 seats = 15% discount -> 620 * 0.85 = 527
        expect(price2).toBeLessThan(price1);
        expect(price2).toBe(527);
    });

    test("straight-line distance matches a known pair of points", () => {
        const km = PricingService.straightLineKm(CONNAUGHT_PLACE, INDIA_GATE);
        expect(km).toBeGreaterThan(2.3);
        expect(km).toBeLessThan(2.5);
    });

    test("distance depends on the two locations, not a fixed number", () => {
        const near = PricingService.quote(CONNAUGHT_PLACE, INDIA_GATE);
        const far = PricingService.quote(CONNAUGHT_PLACE, { lat: 28.5562, lng: 77.1000 }); // Delhi airport
        expect(far.distanceKm).toBeGreaterThan(near.distanceKm * 3);
        expect(far.fare).toBeGreaterThan(near.fare);
    });

    test("estimated road distance applies the 1.3x road factor", () => {
        const straight = PricingService.straightLineKm(CONNAUGHT_PLACE, INDIA_GATE);
        const road = PricingService.estimateDistanceKm(CONNAUGHT_PLACE, INDIA_GATE);
        expect(road).toBeCloseTo(straight * 1.3, 1);
    });

    test("local fare is base 20 + 12 per km", () => {
        expect(PricingService.calculatePrice(10, "local")).toBe(140);
    });

    test("intercity fare is base 10 + 5 per km", () => {
        expect(PricingService.calculatePrice(100, "intercity")).toBe(510);
    });

    test("unknown ride type falls back to local rates", () => {
        expect(PricingService.calculatePrice(10, "helicopter")).toBe(140);
    });

    test("seat discount is capped at 30% so a large booking is never free", () => {
        expect(PricingService.calculatePrice(10, "local", 6)).toBe(98);    // 30%
        expect(PricingService.calculatePrice(10, "local", 20)).toBe(98);   // still 30%, not 100%
    });

    test("same pickup and destination costs the base fare", () => {
        const q = PricingService.quote(CONNAUGHT_PLACE, CONNAUGHT_PLACE);
        expect(q.distanceKm).toBe(0);
        expect(q.fare).toBe(20);
    });

    test("rejects invalid coordinates", () => {
        expect(PricingService.isValidCoordinate({ lat: 28.6, lng: 77.2 })).toBe(true);
        expect(PricingService.isValidCoordinate({ lat: 91, lng: 77.2 })).toBe(false);
        expect(PricingService.isValidCoordinate({ lat: NaN, lng: 77.2 })).toBe(false);
        expect(PricingService.isValidCoordinate({ lat: 28.6 } as any)).toBe(false);
        expect(PricingService.isValidCoordinate(undefined)).toBe(false);
    });
});

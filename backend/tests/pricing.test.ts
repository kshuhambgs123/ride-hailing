import { PricingService } from "../src/services/PricingService";

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
});

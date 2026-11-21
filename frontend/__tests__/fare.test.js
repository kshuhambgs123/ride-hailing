import { calculateFare } from "../src/utils/fare";

describe("calculateFare utility", () => {
    test("calculates core fare", () => {
        expect(calculateFare(10, 1)).toBe(140);
    });

    test("applies discount for multiple seats", () => {
        const single = calculateFare(10, 1);
        const multi = calculateFare(10, 2);
        expect(multi).toBeLessThan(single * 2);
    });
});

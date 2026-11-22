import { isInServiceArea, serviceAreaError, formatMoney } from "../src/config/market";

const INSIDE = {
    "Connaught Place, Delhi": { lat: 28.6315, lng: 77.2167 },
    "Cyber City, Gurugram": { lat: 28.4950, lng: 77.0890 },
    "Sector 18, Noida": { lat: 28.5708, lng: 77.3261 },
    "Indirapuram, Ghaziabad": { lat: 28.6460, lng: 77.3695 },
    "Raj Nagar Extension, Ghaziabad": { lat: 28.6980, lng: 77.4250 },
    "Faridabad": { lat: 28.4089, lng: 77.3178 },
    "Greater Noida (Pari Chowk)": { lat: 28.4672, lng: 77.5133 },
    "IGI Airport T3": { lat: 28.5562, lng: 77.1000 },
};

const OUTSIDE = {
    "Mumbai": { lat: 19.0760, lng: 72.8777 },
    "Meerut": { lat: 28.9845, lng: 77.7064 },
    "Jaipur": { lat: 26.9124, lng: 75.7873 },
    "Agra": { lat: 27.1767, lng: 78.0081 },
};

describe("Delhi NCR service area", () => {
    test.each(Object.entries(INSIDE))("%s is inside", (_name, point) => {
        expect(isInServiceArea(point)).toBe(true);
    });

    test.each(Object.entries(OUTSIDE))("%s is outside", (_name, point) => {
        expect(isInServiceArea(point)).toBe(false);
    });

    test("a trip within NCR is allowed", () => {
        expect(serviceAreaError(INSIDE["Indirapuram, Ghaziabad"], INSIDE["Cyber City, Gurugram"])).toBeNull();
    });

    test("says which end of the trip is outside", () => {
        expect(serviceAreaError(OUTSIDE["Meerut"], INSIDE["Sector 18, Noida"])).toContain("pickup is outside");
        expect(serviceAreaError(INSIDE["Sector 18, Noida"], OUTSIDE["Agra"])).toContain("destination is outside");
    });
});

describe("money formatting", () => {
    test("uses rupees", () => {
        expect(formatMoney(170)).toBe("₹170.00");
    });
});

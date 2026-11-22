import { LatLng } from "../services/PricingService";

// Launch market: Delhi NCR. One place for everything that's region-specific,
// so a second city later is a config change, not a code hunt. (Natural next
// step once operators run in different cities: move this onto Tenant.)
export const MARKET = {
    name: "Delhi NCR",
    currency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    emergencyNumber: "112",
    // Bounding box around Delhi, Gurugram, Faridabad, Noida, Greater Noida
    // and Ghaziabad. A rectangle is deliberately simple: it includes some
    // edges beyond NCR proper, which is fine for launch — replace with a
    // polygon if rides from those edges become a problem.
    serviceArea: {
        minLat: 28.25,
        maxLat: 28.95,
        minLng: 76.80,
        maxLng: 77.65,
    },
    serviceAreaDescription: "Delhi, Gurugram, Noida, Ghaziabad and Faridabad",
};

export function isInServiceArea(p: LatLng): boolean {
    const a = MARKET.serviceArea;
    return p.lat >= a.minLat && p.lat <= a.maxLat && p.lng >= a.minLng && p.lng <= a.maxLng;
}

// Returns a rider-facing reason if either end of the trip is outside the
// service area, else null.
export function serviceAreaError(pickup: LatLng, destination: LatLng): string | null {
    if (!isInServiceArea(pickup)) {
        return `We're only in ${MARKET.name} right now (${MARKET.serviceAreaDescription}). Your pickup is outside it.`;
    }
    if (!isInServiceArea(destination)) {
        return `We're only in ${MARKET.name} right now (${MARKET.serviceAreaDescription}). That destination is outside it.`;
    }
    return null;
}

export function formatMoney(amount: number): string {
    return `${MARKET.currencySymbol}${Number(amount).toFixed(2)}`;
}

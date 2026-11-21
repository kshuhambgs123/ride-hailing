import { AppDataSource } from "../data-source";
import { Ride } from "../entities/Ride";

export class SuggestionService {
    /**
     * Predictive Suggester: Returns top 3 suggested destinations
     * based on user's history and current location proximity.
     */
    static async getSuggestions(userId: string, currentLat: number, currentLng: number) {
        const rideRepo = AppDataSource.getRepository(Ride);

        // 1. Get user's last 50 successful rides
        const history = await rideRepo.find({
            where: { passenger: { id: userId }, status: "completed" as any },
            order: { createdAt: "DESC" },
            take: 50
        });

        const suggestions: Array<{ address: string; lat: number; lng: number; frequency: number; proximity: number }> = [];

        // 2. Identify common destinations
        const destMap = new Map<string, any>();

        history.forEach(ride => {
            const key = ride.destinationAddress || `${ride.destinationLat},${ride.destinationLng}`;
            if (!destMap.has(key)) {
                destMap.set(key, {
                    address: ride.destinationAddress,
                    lat: ride.destinationLat,
                    lng: ride.destinationLng,
                    count: 0,
                    pickupLat: ride.pickupLat,
                    pickupLng: ride.pickupLng
                });
            }
            destMap.get(key).count += 1;
        });

        // 3. Weight by frequency and proximity of current location to the PREVIOUS pickup point
        destMap.forEach((data, key) => {
            const distToOldPickup = this.getDistance(currentLat, currentLng, Number(data.pickupLat), Number(data.pickupLng));

            // If user is within 1km of where they usually start this trip...
            if (distToOldPickup < 1.0) {
                suggestions.push({
                    address: data.address || "Unknown Location",
                    lat: Number(data.lat),
                    lng: Number(data.lng),
                    frequency: data.count,
                    proximity: distToOldPickup
                });
            }
        });

        // 4. Sort by frequency (most common first)
        return suggestions
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 3);
    }

    private static getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

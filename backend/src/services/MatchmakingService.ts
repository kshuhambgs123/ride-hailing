export interface Point {
    lat: number;
    lng: number;
}

export class MatchmakingService {
    /**
     * Checks if a rider's request is compatible with a driver's planned route.
     * For now, uses a simplified "Proximity to Segment" algorithm.
     */
    static isMatch(
        driverStart: Point,
        driverEnd: Point,
        riderStart: Point,
        riderEnd: Point,
        thresholdKm: number = 2.0
    ): boolean {
        // 1. Is rider pickup near the driver's path?
        const pickupOnPath = this.getDistanceFromPointToSegment(riderStart, driverStart, driverEnd) <= thresholdKm;

        // 2. Is rider dropoff near the driver's path?
        const dropoffOnPath = this.getDistanceFromPointToSegment(riderEnd, driverStart, driverEnd) <= thresholdKm;

        if (!pickupOnPath || !dropoffOnPath) return false;

        // 3. Directional check: Is pickup closer to driverStart than dropoff is?
        // (Simplified: check projections onto the driver's vector)
        const dX = driverEnd.lng - driverStart.lng;
        const dY = driverEnd.lat - driverStart.lat;

        const projectionPickup = ((riderStart.lng - driverStart.lng) * dX + (riderStart.lat - driverStart.lat) * dY) / (dX * dX + dY * dY);
        const projectionDropoff = ((riderEnd.lng - driverStart.lng) * dX + (riderEnd.lat - driverStart.lat) * dY) / (dX * dX + dY * dY);

        return projectionPickup < projectionDropoff && projectionPickup >= 0 && projectionDropoff <= 1;
    }

    private static getDistanceFromPointToSegment(p: Point, s1: Point, s2: Point): number {
        // Simplified Euclidean distance mapped to approximate KM
        const R = 6371; // Earth radius in KM
        const dLat = (s2.lat - s1.lat) * Math.PI / 180;
        const dLon = (s2.lng - s1.lng) * Math.PI / 180;
        const distSeg = Math.sqrt(dLat * dLat + dLon * dLon) * R;

        const projection = ((p.lng - s1.lng) * (s2.lng - s1.lng) + (p.lat - s1.lat) * (s2.lat - s1.lat)) /
            (Math.pow(s2.lng - s1.lng, 2) + Math.pow(s2.lat - s1.lat, 2));

        if (projection <= 0) return this.getDistance(p, s1);
        if (projection >= 1) return this.getDistance(p, s2);

        const target = {
            lat: s1.lat + projection * (s2.lat - s1.lat),
            lng: s1.lng + projection * (s2.lng - s1.lng)
        };
        return this.getDistance(p, target);
    }

    private static getDistance(p1: Point, p2: Point): number {
        const R = 6371;
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLon = (p2.lng - p1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

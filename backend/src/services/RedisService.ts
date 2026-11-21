import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => null // Disable retry if it fails once
});

redis.on("error", (err) => {
    console.warn("Redis connection failed. Real-time features will be disabled.", err.message);
});

export class RedisService {
    static async updateDriverLocation(driverId: string, lat: number, lng: number) {
        if (redis.status !== "ready") return;

        try {
            const key = `driver_loc:${driverId}`;
            await redis.set(key, JSON.stringify({ lat, lng }), "EX", 60);
            await redis.geoadd("drivers_geo", lng, lat, driverId);
        } catch (err) {
            console.error("Redis update failed", err);
        }
    }

    static async getNearbyDrivers(lat: number, lng: number, radiusKm: number = 5) {
        if (redis.status !== "ready") return [];

        try {
            return await redis.georadius("drivers_geo", lng, lat, radiusKm, "km");
        } catch (err) {
            console.error("Redis search failed", err);
            return [];
        }
    }
}

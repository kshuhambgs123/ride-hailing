import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Fail fast
    connectTimeout: 2000 // 2 second timeout
});

/**
 * Volo Elite: Sentinel Shield Middleware 🛡️
 * Standardizes billion-scale rate limiting for global security.
 */
export const sentinelShield = async (req: Request, res: Response, next: NextFunction) => {
    // ELITE FAILOVER: If Redis is not ready, we skip limiting to prevent engine blackout
    if (redis.status !== "ready") {
        return next();
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || "anonymous";
    const key = `sentinel:limit:${ip}`;
    const limit = 60; // 60 requests
    const window = 60; // per 60 seconds

    try {
        const current = await redis.get(key);
        const count = current ? parseInt(current) : 0;

        if (count >= limit) {
            return res.status(429).json({
                error: "Sentinel Blockade",
                message: "Too many requests. Please slow down and respect the elite engine.",
                retryAfter: "60s"
            });
        }

        if (!current) {
            await redis.set(key, 1, "EX", window);
        } else {
            await redis.incr(key);
        }

        next();
    } catch (err) {
        // Fallback: If Redis is down, we allow traffic to prevent system blackout
        console.error("Sentinel Shield degraded: Redis connection error", err);
        next();
    }
};

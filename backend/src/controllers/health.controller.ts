import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import Redis from "ioredis";
import * as dotenv from "dotenv";

dotenv.config();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    connectTimeout: 2000
});

export const checkHealth = async (req: Request, res: Response) => {
    const health = {
        status: "Elite",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
            database: "unhealthy",
            redis: "unhealthy",
            memory: "ok"
        },
        system: {
            platform: process.platform,
            nodeVersion: process.version
        }
    };

    try {
        // DB Check
        const isConnected = AppDataSource.isInitialized;
        health.checks.database = isConnected ? "healthy" : "reconnecting";

        // Redis Check
        const redisStatus = redis.status;
        health.checks.redis = redisStatus === "ready" ? "healthy" : "disconnected";

        const statusCode = (health.checks.database === "healthy" && health.checks.redis === "healthy") ? 200 : 503;

        res.status(statusCode).json(health);
    } catch (err) {
        res.status(500).json({ ...health, status: "Critical Failure", error: (err as any).message });
    }
};

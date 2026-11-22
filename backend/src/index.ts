import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { AppDataSource } from "./data-source";
import { swaggerDocs } from "./swagger";

import http from "http";
import authRoutes from "./routes/auth.routes";
import rideRoutes from "./routes/ride.routes";
import reviewRoutes from "./routes/review.routes";
import platformRoutes from "./routes/platform.routes";
import walletRoutes from "./routes/wallet.routes";
import uploadRoutes from "./routes/upload.routes";
import healthRoutes from "./routes/health.routes";
import webhookRoutes from "./routes/webhook.routes";
import { sentinelShield } from "./middleware/sentinelShield";
import path from "path";
import { TrackingService } from "./services/TrackingService";
import { ChatService } from "./services/ChatService";
import { SentinelService } from "./services/SentinelService";
import { AuditAction } from "./entities/AuditLog";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { socketAuth } from "./middleware/socketAuth";
import { resolveTenant, DEFAULT_TENANT_SLUG } from "./middleware/tenant.middleware";
import { Tenant } from "./entities/Tenant";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
io.use(socketAuth);
const PORT = process.env.PORT || 5000;

// Without this, chat/live-tracking events only reach sockets connected to the
// SAME backend instance — running more than one instance behind a load
// balancer silently breaks delivery for anyone not on that instance.
if (process.env.REDIS_URL) {
    const pubClient = new Redis(process.env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    pubClient.on("error", (err) => console.warn("Socket.io Redis adapter pub client error", err.message));
    subClient.on("error", (err) => console.warn("Socket.io Redis adapter sub client error", err.message));
} else {
    console.warn("REDIS_URL not set — Socket.io running without the Redis adapter. Do not run more than one backend instance in this state.");
}

app.use(helmet());
app.use(cors());

// Mounted before express.json(): Stripe signature verification needs the
// raw request body, which a global JSON parser would already have consumed.
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health Check (infra-level — intentionally not tenant-scoped)
app.use("/api/health", healthRoutes);

// Routes — resolveTenant runs first so even login/signup knows which
// operator's data to read/write (see tenant.middleware.ts).
app.use("/api/auth", resolveTenant, authRoutes);
app.use("/api/rides", resolveTenant, rideRoutes);
app.use("/api/reviews", resolveTenant, reviewRoutes);
app.use("/api/platform", resolveTenant, platformRoutes);
app.use("/api/wallet", resolveTenant, walletRoutes);
app.use("/api/upload", resolveTenant, uploadRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Initialize Services with Socket.io
TrackingService.setIO(io);
ChatService.init(io);

app.get("/", (req, res) => {
    res.send("Volo Global API is running...");
});

AppDataSource.initialize()
    .then(async () => {
        console.log("Data Source has been initialized!");

        // Ensures resolveTenant's fallback slug always resolves to something,
        // so a single-tenant deployment (or this app's own existing data)
        // keeps working with no header and no manual setup step.
        const tenantRepo = AppDataSource.getRepository(Tenant);
        const existing = await tenantRepo.findOne({ where: { slug: DEFAULT_TENANT_SLUG } });
        if (!existing) {
            await tenantRepo.save(tenantRepo.create({ slug: DEFAULT_TENANT_SLUG, name: "Volo" }));
            console.log(`Seeded default tenant "${DEFAULT_TENANT_SLUG}"`);
        }

        await SentinelService.log(AuditAction.USER_LOGIN, undefined, { event: "SYSTEM_START" }); // Reusing USER_LOGIN for system start as a placeholder
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Error during Data Source initialization", err);
    });

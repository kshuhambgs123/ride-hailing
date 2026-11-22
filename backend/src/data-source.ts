import "reflect-metadata";
import path from "path";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Ride } from "./entities/Ride";
import { Review } from "./entities/Review";
import { Coupon } from "./entities/Coupon";
import { SupportTicket } from "./entities/SupportTicket";
import { Message } from "./entities/Message";
import { RecurringRide } from "./entities/RecurringRide";
import { EmergencyContact } from "./entities/EmergencyContact";
import { Badge } from "./entities/Badge";
import { DriverVerification } from "./entities/DriverVerification";
import { Transaction } from "./entities/Transaction";
import { AuditLog } from "./entities/AuditLog";
import { Tenant } from "./entities/Tenant";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "volo",
    // Hosted Postgres (Supabase, Neon, RDS) requires TLS; local/docker-compose
    // Postgres does not speak TLS at all, so this must stay opt-in via env var.
    // rejectUnauthorized: false because these providers use certs not in Node's
    // default trust store — fine for connection encryption, not for pinning.
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    // Auto-sync is fine in dev (and is what docker-compose relies on today)
    // but is a well-known source of production data loss/corruption, and is
    // unsafe with more than one instance booting concurrently (the
    // production ECS service runs 2+ by design). Production schema changes
    // must go through `npm run migration:run` as a one-off deploy step,
    // never through synchronize.
    synchronize: process.env.NODE_ENV !== "production",
    logging: false,
    entities: [Tenant, User, Ride, Review, Coupon, SupportTicket, Message, RecurringRide, EmergencyContact, Badge, DriverVerification, Transaction, AuditLog],
    // __dirname-relative (not "src/migrations/*.ts"): a path relative to the
    // repo root only resolves under ts-node run from the repo root. The
    // production image ships only dist/, with no src/ folder at all, so a
    // repo-root-relative glob would silently match zero migrations there.
    // Matching both extensions covers ts-node (dev, .ts) and node (prod, .js).
    migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
    subscribers: [],
});

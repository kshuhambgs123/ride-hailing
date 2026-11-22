import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

// One row per white-labeled operator sharing this backend. Every tenant-
// scoped entity (User, Ride, Transaction, ...) carries a tenantId so one
// operator's data is never visible to another, even though they all run
// through the same deployment.
@Entity()
export class Tenant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    // Sent by each white-labeled app build as the X-Tenant-Slug header (see
    // tenant.middleware.ts) — baked in per build via EXPO_PUBLIC_TENANT_SLUG,
    // not something a rider/driver ever types in.
    @Column({ unique: true })
    slug!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    logoUrl?: string;

    @Column({ default: "#6200ee" })
    primaryColor!: string;

    // Platform's cut of each fare, as a fraction (0.20 = 20%). Lets each
    // operator be sold a different commission rate.
    @Column("decimal", { precision: 5, scale: 4, default: 0.2 })
    commissionRate!: number;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

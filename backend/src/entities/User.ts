import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from "typeorm";
import { Tenant } from "./Tenant";

export enum UserRole {
    USER = "user",
    DRIVER = "driver",
    FLEET_OWNER = "fleet_owner",
    ADMIN = "admin"
}

// Uniqueness is per-tenant, not global: the same phone number can hold a
// separate account under each white-labeled operator — they're different
// marketplaces sharing a backend, not one combined user base.
@Index(["tenantId", "phoneNumber"], { unique: true })
@Index(["tenantId", "referralCode"], { unique: true, where: '"referralCode" IS NOT NULL' })
@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Tenant)
    tenant!: Tenant;

    @Column()
    tenantId!: string;

    @Column()
    phoneNumber!: string;

    @Column({ nullable: true })
    displayName?: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER
    })
    role!: UserRole;

    @Column({ default: false })
    isVerified!: boolean;

    @Column({ type: "float", default: 5.0 })
    rating!: number;

    @Column({ nullable: true })
    governmentId?: string;

    @Column({ nullable: true })
    idType?: string; // e.g. "Passport", "DriverLicense", "NationalID"

    @Column({ default: false })
    isKycVerified!: boolean;

    @Column({ nullable: true })
    referralCode?: string;

    @Column({ nullable: true })
    referredBy?: string;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    walletBalance!: number;

    @Column({ nullable: true })
    fcmToken?: string;

    // Travel Preferences
    @Column({ default: false })
    prefMusic!: boolean;

    @Column({ default: false })
    prefSmoking!: boolean;

    @Column({ default: false })
    prefPets!: boolean;

    @Column({ default: false })
    prefLadiesOnly!: boolean;

    @Column({ type: "int", default: 2 }) // 1: Quiet, 2: Normal, 3: Chatty
    prefChattiness!: number;

    // Trust & Verification (Volo Elite)
    @Column({ default: false })
    isEmailVerified!: boolean;

    @Column({ nullable: true })
    email?: string;

    @Column({ default: false })
    isFacebookLinked!: boolean;

    @Column({ default: false })
    isLinkedInLinked!: boolean;

    @Column({ type: "int", default: 0 })
    trustScore!: number;

    @Column({ default: 0 })
    completedRideCount!: number;

    @ManyToOne(() => User, { nullable: true })
    managedBy?: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

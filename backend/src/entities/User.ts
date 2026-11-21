import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";

export enum UserRole {
    USER = "user",
    DRIVER = "driver",
    FLEET_OWNER = "fleet_owner",
    ADMIN = "admin"
}

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
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

    @Column({ unique: true, nullable: true })
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

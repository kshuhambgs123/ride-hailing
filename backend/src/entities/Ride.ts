import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from "typeorm";
import { User } from "./User";
import { Tenant } from "./Tenant";

export enum RideStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    ONGOING = "ongoing",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    SCHEDULED = "scheduled"
}

export enum RideType {
    LOCAL = "local",
    INTERCITY = "intercity"
}

export enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded"
}

@Entity()
export class Ride {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Tenant)
    @Index()
    tenant!: Tenant;

    @Column()
    tenantId!: string;

    @ManyToOne(() => User)
    passenger!: User;

    @ManyToOne(() => User, { nullable: true })
    driver?: User;

    @Column("decimal", { precision: 10, scale: 7 })
    pickupLat!: number;

    @Index()
    @Column("decimal", { precision: 10, scale: 7 })
    pickupLng!: number;

    @Column("decimal", { precision: 10, scale: 7 })
    destinationLat!: number;

    @Index()
    @Column("decimal", { precision: 10, scale: 7 })
    destinationLng!: number;
    @Column({ nullable: true })
    pickupAddress?: string;

    @Column({ nullable: true })
    destinationAddress?: string;

    @Column({ type: "timestamp", nullable: true })
    departureTime?: Date;

    @Index()
    @Column({
        type: "enum",
        enum: RideStatus,
        default: RideStatus.PENDING
    })
    status!: RideStatus;

    @Column({
        type: "enum",
        enum: RideType,
        default: RideType.LOCAL
    })
    rideType!: RideType;

    @Column("decimal", { precision: 10, scale: 2 })
    fare!: number;

    @Column({ default: 1 })
    totalSeats!: number;

    @Column({ default: 1 })
    availableSeats!: number;

    @Column({ nullable: true })
    stripePaymentIntentId?: string;

    @Column({
        type: "enum",
        enum: PaymentStatus,
        default: PaymentStatus.PENDING
    })
    paymentStatus!: PaymentStatus;

    // Set when the rider picks "cash" in PaymentScreen — paymentStatus stays
    // PENDING until the driver confirms they actually received it (see
    // confirmCashPayment in ride.controller.ts). Every other method instead
    // settles via its own gateway webhook, so this column only matters for cash.
    @Column({ nullable: true })
    paymentMethod?: string;

    @Column({ nullable: true })
    distance?: string;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    baseFare!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    taxAmount!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    platformFee!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    discountAmount!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    schedulingFee!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    cancellationFee!: number;

    @Column({ nullable: true })
    couponId?: string;

    @Column("simple-json", { nullable: true })
    waypoints?: Array<{ lat: number; lng: number; address?: string }>;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

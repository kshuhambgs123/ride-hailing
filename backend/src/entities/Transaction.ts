import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from "typeorm";
import { User } from "./User";
import { Ride } from "./Ride";
import { Tenant } from "./Tenant";

export enum TransactionType {
    PAYMENT = "payment",
    REFUND = "refund",
    PAYOUT = "payout",
    ADJUSTMENT = "adjustment",
    CASH = "cash",
    CREDIT = "credit",
    DEBIT = "debit"
}

export enum TransactionStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REVERSED = "reversed"
}

@Entity()
export class Transaction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Tenant)
    @Index()
    tenant!: Tenant;

    @Column()
    tenantId!: string;

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Ride, { nullable: true })
    ride?: Ride;

    @Column({
        type: "enum",
        enum: TransactionType
    })
    type!: TransactionType;

    @Column("decimal", { precision: 10, scale: 2 })
    grossAmount!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    taxAmount!: number;

    @Column("decimal", { precision: 10, scale: 2, default: 0 })
    feeAmount!: number;

    @Column("decimal", { precision: 10, scale: 2 })
    netAmount!: number;

    @Column()
    currency!: string;

    @Column({
        type: "enum",
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status!: TransactionStatus;

    @Column({ nullable: true })
    externalId?: string; // Stripe/Razorpay PaymentID

    @Column({ nullable: true })
    provider?: string;

    @Column({ type: "jsonb", nullable: true })
    metadata?: any;

    @CreateDateColumn()
    createdAt!: Date;
}

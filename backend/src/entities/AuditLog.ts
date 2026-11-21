import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne } from "typeorm";
import { User } from "./User";

export enum AuditAction {
    USER_LOGIN = "user_login",
    WALLET_CREDIT = "wallet_credit",
    WALLET_DEBIT = "wallet_debit",
    RIDE_REQUEST = "ride_request",
    RIDE_ACCEPT = "ride_accept",
    RIDE_COMPLETED = "ride_completed",
    RIDE_CANCELLED = "ride_cancelled",
    PROFILE_UPDATE = "profile_update",
    EMERGENCY_TRIGGER = "emergency_trigger"
}

@Entity()
export class AuditLog {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column({
        type: "enum",
        enum: AuditAction
    })
    action!: AuditAction;

    @ManyToOne(() => User, { nullable: true })
    user?: User;

    @Column("jsonb", { nullable: true })
    metadata?: any;

    @Column({ nullable: true })
    ipAddress?: string;

    @CreateDateColumn()
    createdAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from "typeorm";
import { Tenant } from "./Tenant";

// Codes are unique per tenant, not globally — two operators can each run
// their own "WELCOME50" without one being redeemable on the other's rides.
@Index(["tenantId", "code"], { unique: true })
@Entity()
export class Coupon {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Tenant)
    tenant!: Tenant;

    @Column()
    tenantId!: string;

    @Column()
    code!: string;

    @Column("int")
    discountPercentage!: number;

    @Column("decimal", { precision: 10, scale: 2 })
    maxDiscountValue!: number;

    @Column("decimal", { precision: 10, scale: 2 })
    minRideValue!: number;

    @Column()
    expiryDate!: Date;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Coupon {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ unique: true })
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

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export enum DayOfWeek {
    MONDAY = "monday",
    TUESDAY = "tuesday",
    WEDNESDAY = "wednesday",
    THURSDAY = "thursday",
    FRIDAY = "friday",
    SATURDAY = "saturday",
    SUNDAY = "sunday"
}

@Entity()
export class RecurringRide {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    @Column("decimal", { precision: 10, scale: 7 })
    pickupLat!: number;

    @Column("decimal", { precision: 10, scale: 7 })
    pickupLng!: number;

    @Column("decimal", { precision: 10, scale: 7 })
    destinationLat!: number;

    @Column("decimal", { precision: 10, scale: 7 })
    destinationLng!: number;

    @Column("time")
    departureTime!: string;

    @Column("simple-array")
    days!: DayOfWeek[];

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}

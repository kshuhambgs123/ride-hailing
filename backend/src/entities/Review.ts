import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { Ride } from "./Ride";

@Entity()
export class Review {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Ride)
    ride!: Ride;

    @ManyToOne(() => User)
    reviewer!: User;

    @ManyToOne(() => User)
    reviewee!: User;

    @Column({ type: "int" })
    rating!: number;

    @Column({ type: "text", nullable: true })
    comment?: string;

    @CreateDateColumn()
    createdAt!: Date;
}

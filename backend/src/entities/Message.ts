import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";
import { Ride } from "./Ride";

@Entity()
export class Message {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    sender!: User;

    @ManyToOne(() => User)
    receiver!: User;

    @ManyToOne(() => Ride)
    ride!: Ride;

    @Column("text")
    content!: string;

    @Column({ default: false })
    isRead!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}

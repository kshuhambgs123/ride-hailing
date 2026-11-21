import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

export enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed"
}

@Entity()
export class SupportTicket {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    @Column()
    subject!: string;

    @Column("text")
    message!: string;

    @Column({
        type: "enum",
        enum: TicketStatus,
        default: TicketStatus.OPEN
    })
    status!: TicketStatus;

    @CreateDateColumn()
    createdAt!: Date;
}

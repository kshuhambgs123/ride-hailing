import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class EmergencyContact {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    @Column()
    name!: string;

    @Column()
    phoneNumber!: string;

    @Column({ default: true })
    isVerified!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Badge {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    @Column()
    name!: string;

    @Column({ nullable: true })
    description?: string;

    @Column()
    iconUrl!: string;

    @CreateDateColumn()
    earnedAt!: Date;
}

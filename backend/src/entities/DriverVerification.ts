import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";

export enum VerificationStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}

@Entity()
export class DriverVerification {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @OneToOne(() => User)
    @JoinColumn()
    user!: User;

    @Column()
    licenseNumber!: string;

    @Column()
    licenseCountry!: string; // ISO 3166-1 alpha-2

    @Column()
    licenseExpiry!: Date;

    @Column({ nullable: true })
    frontIdUrl?: string;

    @Column({ nullable: true })
    backIdUrl?: string;

    @Column({ nullable: true })
    selfieUrl?: string;

    @Column()
    vehicleModel!: string;

    @Column()
    vehiclePlateNumber!: string;

    @Column()
    vehicleYear!: number;

    @Column({ default: false })
    isCriminalRecordChecked!: boolean;

    @Column({ nullable: true })
    insurancePolicyNumber?: string;

    @Column({ nullable: true })
    insuranceExpiry?: Date;

    @Column({ nullable: true })
    fitnessCertificateUrl?: string;

    @Column({
        type: "enum",
        enum: VerificationStatus,
        default: VerificationStatus.PENDING
    })
    status!: VerificationStatus;

    @Column({ nullable: true })
    rejectionReason?: string;

    @CreateDateColumn()
    createdAt!: Date;
}

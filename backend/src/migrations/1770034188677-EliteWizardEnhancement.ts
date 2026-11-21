import { MigrationInterface, QueryRunner } from "typeorm";

export class EliteWizardEnhancement1770034188677 implements MigrationInterface {
    name = 'EliteWizardEnhancement1770034188677'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."audit_log_action_enum" AS ENUM('user_login', 'wallet_credit', 'wallet_debit', 'ride_request', 'ride_accept', 'ride_completed', 'ride_cancelled', 'profile_update', 'emergency_trigger')`);
        await queryRunner.query(`CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" "public"."audit_log_action_enum" NOT NULL, "metadata" jsonb, "ipAddress" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_951e6339a77994dfbad976b35c" ON "audit_log" ("action") `);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "licenseImageUrl"`);
        await queryRunner.query(`ALTER TABLE "ride" ADD "schedulingFee" numeric(10,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "frontIdUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "backIdUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "selfieUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "isCriminalRecordChecked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "insurancePolicyNumber" character varying`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "insuranceExpiry" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "fitnessCertificateUrl" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."ride_status_enum" RENAME TO "ride_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ride_status_enum" AS ENUM('pending', 'accepted', 'ongoing', 'completed', 'cancelled', 'scheduled')`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "status" TYPE "public"."ride_status_enum" USING "status"::"text"::"public"."ride_status_enum"`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."ride_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_2621409ebc295c5da7ff3e41396" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_2621409ebc295c5da7ff3e41396"`);
        await queryRunner.query(`CREATE TYPE "public"."ride_status_enum_old" AS ENUM('pending', 'accepted', 'ongoing', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "status" TYPE "public"."ride_status_enum_old" USING "status"::"text"::"public"."ride_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."ride_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ride_status_enum_old" RENAME TO "ride_status_enum"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "fitnessCertificateUrl"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "insuranceExpiry"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "insurancePolicyNumber"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "isCriminalRecordChecked"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "selfieUrl"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "backIdUrl"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP COLUMN "frontIdUrl"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "schedulingFee"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD "licenseImageUrl" character varying`);
        await queryRunner.query(`DROP INDEX "public"."IDX_951e6339a77994dfbad976b35c"`);
        await queryRunner.query(`DROP TABLE "audit_log"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_action_enum"`);
    }

}

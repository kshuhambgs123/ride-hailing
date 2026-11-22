import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1795330766654 implements MigrationInterface {
    name = 'InitialSchema1795330766654'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Squashed baseline: the full current schema in one migration, so a
        // brand-new database (fresh RDS/Supabase) can be stood up from
        // migrations alone. Dev databases built by TypeORM's synchronize
        // already match this schema, so skip rather than fail on them.
        if (await queryRunner.hasTable("tenant")) {
            return;
        }
        if (await queryRunner.hasTable("user")) {
            throw new Error(
                "Found a pre-multi-tenancy schema (\"user\" exists, \"tenant\" doesn't). " +
                "This baseline only creates a fresh database; migrate that data manually."
            );
        }

        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "tenant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "logoUrl" character varying, "primaryColor" character varying NOT NULL DEFAULT '#6200ee', "commissionRate" numeric(5,4) NOT NULL DEFAULT '0.2', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_abfd243f7bd832e806d19c5a919" UNIQUE ("slug"), CONSTRAINT "PK_da8c6efd67bb301e810e56ac139" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'driver', 'fleet_owner', 'admin')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "phoneNumber" character varying NOT NULL, "displayName" character varying, "role" "public"."user_role_enum" NOT NULL DEFAULT 'user', "isVerified" boolean NOT NULL DEFAULT false, "rating" double precision NOT NULL DEFAULT '5', "governmentId" character varying, "idType" character varying, "isKycVerified" boolean NOT NULL DEFAULT false, "referralCode" character varying, "referredBy" character varying, "walletBalance" numeric(10,2) NOT NULL DEFAULT '0', "fcmToken" character varying, "prefMusic" boolean NOT NULL DEFAULT false, "prefSmoking" boolean NOT NULL DEFAULT false, "prefPets" boolean NOT NULL DEFAULT false, "prefLadiesOnly" boolean NOT NULL DEFAULT false, "prefChattiness" integer NOT NULL DEFAULT '2', "isEmailVerified" boolean NOT NULL DEFAULT false, "email" character varying, "isFacebookLinked" boolean NOT NULL DEFAULT false, "isLinkedInLinked" boolean NOT NULL DEFAULT false, "trustScore" integer NOT NULL DEFAULT '0', "completedRideCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "managedById" uuid, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7c2b39aecf0bea66f8840b8338" ON "user" ("tenantId", "referralCode") WHERE "referralCode" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a0d86ec1ba4486ac4742eb2e2c" ON "user" ("tenantId", "phoneNumber") `);
        await queryRunner.query(`CREATE TYPE "public"."ride_status_enum" AS ENUM('pending', 'accepted', 'ongoing', 'completed', 'cancelled', 'scheduled')`);
        await queryRunner.query(`CREATE TYPE "public"."ride_ridetype_enum" AS ENUM('local', 'intercity')`);
        await queryRunner.query(`CREATE TYPE "public"."ride_paymentstatus_enum" AS ENUM('pending', 'paid', 'failed', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "ride" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "pickupLat" numeric(10,7) NOT NULL, "pickupLng" numeric(10,7) NOT NULL, "destinationLat" numeric(10,7) NOT NULL, "destinationLng" numeric(10,7) NOT NULL, "pickupAddress" character varying, "destinationAddress" character varying, "departureTime" TIMESTAMP, "status" "public"."ride_status_enum" NOT NULL DEFAULT 'pending', "rideType" "public"."ride_ridetype_enum" NOT NULL DEFAULT 'local', "fare" numeric(10,2) NOT NULL, "totalSeats" integer NOT NULL DEFAULT '1', "availableSeats" integer NOT NULL DEFAULT '1', "stripePaymentIntentId" character varying, "paymentStatus" "public"."ride_paymentstatus_enum" NOT NULL DEFAULT 'pending', "paymentMethod" character varying, "distance" character varying, "baseFare" numeric(10,2) NOT NULL DEFAULT '0', "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "platformFee" numeric(10,2) NOT NULL DEFAULT '0', "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "schedulingFee" numeric(10,2) NOT NULL DEFAULT '0', "cancellationFee" numeric(10,2) NOT NULL DEFAULT '0', "couponId" character varying, "waypoints" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "passengerId" uuid, "driverId" uuid, CONSTRAINT "PK_f6bc30c4dd875370bafcb54af1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9dc200b7aa72160815c41f302c" ON "ride" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7f0fbd6a88c04c7deba7cd38ea" ON "ride" ("pickupLng") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d92ae207c7fe926ce3292d7ed" ON "ride" ("destinationLng") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5e2cfa23856583505a4fee554" ON "ride" ("status") `);
        await queryRunner.query(`CREATE TABLE "review" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rating" integer NOT NULL, "comment" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "rideId" uuid, "reviewerId" uuid, "revieweeId" uuid, CONSTRAINT "PK_2e4299a343a81574217255c00ca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coupon" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "discountPercentage" integer NOT NULL, "maxDiscountValue" numeric(10,2) NOT NULL, "minRideValue" numeric(10,2) NOT NULL, "expiryDate" TIMESTAMP NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fcbe9d72b60eed35f46dc35a682" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_73ba76e45ff3f8d7ee98416ce5" ON "coupon" ("tenantId", "code") `);
        await queryRunner.query(`CREATE TYPE "public"."support_ticket_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TABLE "support_ticket" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subject" character varying NOT NULL, "message" text NOT NULL, "status" "public"."support_ticket_status_enum" NOT NULL DEFAULT 'open', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_506b4b9f579fb3adbaebe3950c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "senderId" uuid, "receiverId" uuid, "rideId" uuid, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "recurring_ride" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pickupLat" numeric(10,7) NOT NULL, "pickupLng" numeric(10,7) NOT NULL, "destinationLat" numeric(10,7) NOT NULL, "destinationLng" numeric(10,7) NOT NULL, "departureTime" TIME NOT NULL, "days" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_10f28bc98eda1b13420fcf5bb5d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "emergency_contact" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "isVerified" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_922933ddef34a7e1ed99ae692ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "badge" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "iconUrl" character varying NOT NULL, "earnedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_76b7011c864d4521a14a5196c49" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."driver_verification_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "driver_verification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "licenseNumber" character varying NOT NULL, "licenseCountry" character varying NOT NULL, "licenseExpiry" TIMESTAMP NOT NULL, "frontIdUrl" character varying, "backIdUrl" character varying, "selfieUrl" character varying, "vehicleModel" character varying NOT NULL, "vehiclePlateNumber" character varying NOT NULL, "vehicleYear" integer NOT NULL, "isCriminalRecordChecked" boolean NOT NULL DEFAULT false, "insurancePolicyNumber" character varying, "insuranceExpiry" TIMESTAMP, "fitnessCertificateUrl" character varying, "status" "public"."driver_verification_status_enum" NOT NULL DEFAULT 'pending', "rejectionReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "REL_383fee74d769e195c2d8e37c94" UNIQUE ("userId"), CONSTRAINT "PK_88eeda078fa38c606d3a53d40e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_type_enum" AS ENUM('payment', 'refund', 'payout', 'adjustment', 'cash', 'credit', 'debit')`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_status_enum" AS ENUM('pending', 'completed', 'failed', 'reversed')`);
        await queryRunner.query(`CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "type" "public"."transaction_type_enum" NOT NULL, "grossAmount" numeric(10,2) NOT NULL, "taxAmount" numeric(10,2) NOT NULL DEFAULT '0', "feeAmount" numeric(10,2) NOT NULL DEFAULT '0', "netAmount" numeric(10,2) NOT NULL, "currency" character varying NOT NULL, "status" "public"."transaction_status_enum" NOT NULL DEFAULT 'pending', "externalId" character varying, "provider" character varying, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "rideId" uuid, CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_59362ae6c545b38be85351a0cc" ON "transaction" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."audit_log_action_enum" AS ENUM('user_login', 'wallet_credit', 'wallet_debit', 'ride_request', 'ride_accept', 'ride_completed', 'ride_cancelled', 'profile_update', 'emergency_trigger')`);
        await queryRunner.query(`CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" "public"."audit_log_action_enum" NOT NULL, "metadata" jsonb, "ipAddress" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_951e6339a77994dfbad976b35c" ON "audit_log" ("action") `);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_685bf353c85f23b6f848e4dcded" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_19d435a878e9b07ded14b52c914" FOREIGN KEY ("managedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ride" ADD CONSTRAINT "FK_9dc200b7aa72160815c41f302cc" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ride" ADD CONSTRAINT "FK_1699e40f3304c5b41371e271128" FOREIGN KEY ("passengerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ride" ADD CONSTRAINT "FK_a212335bd593ecd23b665309e9d" FOREIGN KEY ("driverId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review" ADD CONSTRAINT "FK_ed657f9f280e48da0be08230ff2" FOREIGN KEY ("rideId") REFERENCES "ride"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review" ADD CONSTRAINT "FK_34413365b39e3bf5bea866569b4" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "review" ADD CONSTRAINT "FK_2bbe7b10857bd93ca651699037b" FOREIGN KEY ("revieweeId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD CONSTRAINT "FK_86e95ee23640c91ea4028e40881" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "support_ticket" ADD CONSTRAINT "FK_7df66b3c96ac736a25423c54e2d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_71fb36906595c602056d936fc13" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_ecaf584a47f4c074c34fca3ca47" FOREIGN KEY ("rideId") REFERENCES "ride"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_ride" ADD CONSTRAINT "FK_af7870415b84b41ba279036928c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emergency_contact" ADD CONSTRAINT "FK_d2919dae2dcbb09fd225517daab" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "badge" ADD CONSTRAINT "FK_e3655a46bc77b0c5f46aa80f4be" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "driver_verification" ADD CONSTRAINT "FK_383fee74d769e195c2d8e37c944" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_59362ae6c545b38be85351a0cca" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_605baeb040ff0fae995404cea37" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_ad8b2424f238be3ba8e0789b803" FOREIGN KEY ("rideId") REFERENCES "ride"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_log" ADD CONSTRAINT "FK_2621409ebc295c5da7ff3e41396" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // Default tenant that resolveTenant falls back to when a request
        // carries no X-Tenant-Slug header (see tenant.middleware.ts).
        await queryRunner.query(`INSERT INTO "tenant" ("slug", "name") VALUES ('volo', 'Volo')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_log" DROP CONSTRAINT "FK_2621409ebc295c5da7ff3e41396"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_ad8b2424f238be3ba8e0789b803"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_605baeb040ff0fae995404cea37"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_59362ae6c545b38be85351a0cca"`);
        await queryRunner.query(`ALTER TABLE "driver_verification" DROP CONSTRAINT "FK_383fee74d769e195c2d8e37c944"`);
        await queryRunner.query(`ALTER TABLE "badge" DROP CONSTRAINT "FK_e3655a46bc77b0c5f46aa80f4be"`);
        await queryRunner.query(`ALTER TABLE "emergency_contact" DROP CONSTRAINT "FK_d2919dae2dcbb09fd225517daab"`);
        await queryRunner.query(`ALTER TABLE "recurring_ride" DROP CONSTRAINT "FK_af7870415b84b41ba279036928c"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_ecaf584a47f4c074c34fca3ca47"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_71fb36906595c602056d936fc13"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_bc096b4e18b1f9508197cd98066"`);
        await queryRunner.query(`ALTER TABLE "support_ticket" DROP CONSTRAINT "FK_7df66b3c96ac736a25423c54e2d"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP CONSTRAINT "FK_86e95ee23640c91ea4028e40881"`);
        await queryRunner.query(`ALTER TABLE "review" DROP CONSTRAINT "FK_2bbe7b10857bd93ca651699037b"`);
        await queryRunner.query(`ALTER TABLE "review" DROP CONSTRAINT "FK_34413365b39e3bf5bea866569b4"`);
        await queryRunner.query(`ALTER TABLE "review" DROP CONSTRAINT "FK_ed657f9f280e48da0be08230ff2"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP CONSTRAINT "FK_a212335bd593ecd23b665309e9d"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP CONSTRAINT "FK_1699e40f3304c5b41371e271128"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP CONSTRAINT "FK_9dc200b7aa72160815c41f302cc"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_19d435a878e9b07ded14b52c914"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_685bf353c85f23b6f848e4dcded"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_951e6339a77994dfbad976b35c"`);
        await queryRunner.query(`DROP TABLE "audit_log"`);
        await queryRunner.query(`DROP TYPE "public"."audit_log_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59362ae6c545b38be85351a0cc"`);
        await queryRunner.query(`DROP TABLE "transaction"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_type_enum"`);
        await queryRunner.query(`DROP TABLE "driver_verification"`);
        await queryRunner.query(`DROP TYPE "public"."driver_verification_status_enum"`);
        await queryRunner.query(`DROP TABLE "badge"`);
        await queryRunner.query(`DROP TABLE "emergency_contact"`);
        await queryRunner.query(`DROP TABLE "recurring_ride"`);
        await queryRunner.query(`DROP TABLE "message"`);
        await queryRunner.query(`DROP TABLE "support_ticket"`);
        await queryRunner.query(`DROP TYPE "public"."support_ticket_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73ba76e45ff3f8d7ee98416ce5"`);
        await queryRunner.query(`DROP TABLE "coupon"`);
        await queryRunner.query(`DROP TABLE "review"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5e2cfa23856583505a4fee554"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6d92ae207c7fe926ce3292d7ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f0fbd6a88c04c7deba7cd38ea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9dc200b7aa72160815c41f302c"`);
        await queryRunner.query(`DROP TABLE "ride"`);
        await queryRunner.query(`DROP TYPE "public"."ride_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ride_ridetype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ride_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a0d86ec1ba4486ac4742eb2e2c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7c2b39aecf0bea66f8840b8338"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "tenant"`);
    }

}

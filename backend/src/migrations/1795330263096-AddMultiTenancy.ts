import { MigrationInterface, QueryRunner } from "typeorm";

// Backfills every existing row onto one seeded "volo" tenant, so this is
// safe to run against a live database with existing data — nothing becomes
// orphaned or loses its tenantId partway through.
export class AddMultiTenancy1795330263096 implements MigrationInterface {
    name = 'AddMultiTenancy1795330263096'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "tenant" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "slug" character varying NOT NULL,
                "name" character varying NOT NULL,
                "logoUrl" character varying,
                "primaryColor" character varying NOT NULL DEFAULT '#6200ee',
                "commissionRate" numeric(5,4) NOT NULL DEFAULT 0.2,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tenant_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_tenant" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`INSERT INTO "tenant" ("slug", "name") VALUES ('volo', 'Volo')`);

        // --- user: drop the old global-unique constraints, replace with
        // per-tenant composite ones (same phone number can hold a separate
        // account under each operator) ---
        await queryRunner.query(`ALTER TABLE "user" ADD "tenantId" uuid`);
        await queryRunner.query(`UPDATE "user" SET "tenantId" = (SELECT "id" FROM "tenant" WHERE "slug" = 'volo')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "tenantId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_user_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // The original unique constraints were auto-named by TypeORM at
        // creation time, so their exact names aren't known here — find and
        // drop them dynamically instead of guessing.
        await queryRunner.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
                FOR r IN
                    SELECT con.conname
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
                    WHERE rel.relname = 'user' AND con.contype = 'u' AND att.attname IN ('phoneNumber', 'referralCode')
                LOOP
                    EXECUTE format('ALTER TABLE "user" DROP CONSTRAINT %I', r.conname);
                END LOOP;
            END $$;
        `);

        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_tenant_phone" ON "user" ("tenantId", "phoneNumber")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_user_tenant_referral" ON "user" ("tenantId", "referralCode") WHERE "referralCode" IS NOT NULL`);

        // --- ride ---
        await queryRunner.query(`ALTER TABLE "ride" ADD "tenantId" uuid`);
        await queryRunner.query(`UPDATE "ride" SET "tenantId" = (SELECT "id" FROM "tenant" WHERE "slug" = 'volo')`);
        await queryRunner.query(`ALTER TABLE "ride" ALTER COLUMN "tenantId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ride" ADD CONSTRAINT "FK_ride_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX "IDX_ride_tenant" ON "ride" ("tenantId")`);

        // --- transaction ---
        await queryRunner.query(`ALTER TABLE "transaction" ADD "tenantId" uuid`);
        await queryRunner.query(`UPDATE "transaction" SET "tenantId" = (SELECT "id" FROM "tenant" WHERE "slug" = 'volo')`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "tenantId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX "IDX_transaction_tenant" ON "transaction" ("tenantId")`);

        // --- coupon: per-tenant codes instead of globally unique ones ---
        await queryRunner.query(`ALTER TABLE "coupon" ADD "tenantId" uuid`);
        await queryRunner.query(`UPDATE "coupon" SET "tenantId" = (SELECT "id" FROM "tenant" WHERE "slug" = 'volo')`);
        await queryRunner.query(`ALTER TABLE "coupon" ALTER COLUMN "tenantId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD CONSTRAINT "FK_coupon_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
            DO $$
            DECLARE r RECORD;
            BEGIN
                FOR r IN
                    SELECT con.conname
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
                    WHERE rel.relname = 'coupon' AND con.contype = 'u' AND att.attname = 'code'
                LOOP
                    EXECUTE format('ALTER TABLE "coupon" DROP CONSTRAINT %I', r.conname);
                END LOOP;
            END $$;
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_coupon_tenant_code" ON "coupon" ("tenantId", "code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_coupon_tenant_code"`);
        await queryRunner.query(`ALTER TABLE "coupon" ADD CONSTRAINT "UQ_coupon_code" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP CONSTRAINT "FK_coupon_tenant"`);
        await queryRunner.query(`ALTER TABLE "coupon" DROP COLUMN "tenantId"`);

        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_tenant"`);
        await queryRunner.query(`DROP INDEX "IDX_transaction_tenant"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "tenantId"`);

        await queryRunner.query(`ALTER TABLE "ride" DROP CONSTRAINT "FK_ride_tenant"`);
        await queryRunner.query(`DROP INDEX "IDX_ride_tenant"`);
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "tenantId"`);

        await queryRunner.query(`DROP INDEX "IDX_user_tenant_referral"`);
        await queryRunner.query(`DROP INDEX "IDX_user_tenant_phone"`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_phoneNumber" UNIQUE ("phoneNumber")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_referralCode" UNIQUE ("referralCode")`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_tenant"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "tenantId"`);

        await queryRunner.query(`DROP TABLE "tenant"`);
    }
}

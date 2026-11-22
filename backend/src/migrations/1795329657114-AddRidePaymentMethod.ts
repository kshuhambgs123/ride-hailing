import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRidePaymentMethod1795329657114 implements MigrationInterface {
    name = 'AddRidePaymentMethod1795329657114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" ADD "paymentMethod" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "paymentMethod"`);
    }
}

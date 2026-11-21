import { MigrationInterface, QueryRunner } from "typeorm";

export class QuantumGapsEnhancement1770035381664 implements MigrationInterface {
    name = 'QuantumGapsEnhancement1770035381664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" ADD "cancellationFee" numeric(10,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ride" DROP COLUMN "cancellationFee"`);
    }

}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeFieldsToUser1774830000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "stripeCustomerId" varchar,
        ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" varchar,
        ADD COLUMN IF NOT EXISTS "stripePriceId" varchar,
        ADD COLUMN IF NOT EXISTS "planStatus" varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "trialEndsAt" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "stripeCustomerId",
        DROP COLUMN IF EXISTS "stripeSubscriptionId",
        DROP COLUMN IF EXISTS "stripePriceId",
        DROP COLUMN IF EXISTS "planStatus",
        DROP COLUMN IF EXISTS "trialEndsAt"
    `);
  }
}

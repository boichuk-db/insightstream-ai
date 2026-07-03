import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeEventsAndOrdering1774840000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stripe_events" (
        "id" character varying NOT NULL,
        "type" character varying NOT NULL,
        "subscriptionId" character varying,
        "eventCreatedAt" TIMESTAMP NOT NULL,
        "processedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stripe_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stripe_events_subscriptionId" ON "stripe_events" ("subscriptionId")`,
    );
    // Nullable + DB default: adding it this way backfills existing rows to the
    // epoch and never trips a `SET NOT NULL` on a populated table (which dev
    // `synchronize` cannot do). The default keeps every future row non-null too.
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastStripeEventAt" TIMESTAMP DEFAULT '1970-01-01 00:00:00'`,
    );
    // Repair rows from a half-applied dev sync that added the column without a default.
    await queryRunner.query(
      `UPDATE "users" SET "lastStripeEventAt" = '1970-01-01 00:00:00' WHERE "lastStripeEventAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "lastStripeEventAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stripe_events_subscriptionId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "stripe_events"`);
  }
}

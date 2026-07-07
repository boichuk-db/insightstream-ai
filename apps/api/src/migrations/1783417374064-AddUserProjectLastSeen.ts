import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProjectLastSeen1783417374064 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS: dev/test/e2e environments run with `synchronize: true`
    // (see app.module.ts), which may have already created this table straight
    // from the entity, before this migration ever ran there. Production never
    // had `synchronize` on, so this is the only place the table gets created
    // there. Same pattern already used in AddStripeEventsAndOrdering.
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_project_last_seen" ("userId" uuid NOT NULL, "projectId" uuid NOT NULL, "seenAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_ad559f8ecde1513cb2a5503a316" PRIMARY KEY ("userId", "projectId"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_project_last_seen"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamAsTenant1774910000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Billing columns on teams (nullable/defaulted — safe on populated table)
    await queryRunner.query(`
      ALTER TABLE "teams"
        ADD COLUMN IF NOT EXISTS "plan" varchar(20) NOT NULL DEFAULT 'FREE',
        ADD COLUMN IF NOT EXISTS "planUpdatedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "planStatus" varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "stripeCustomerId" varchar,
        ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" varchar,
        ADD COLUMN IF NOT EXISTS "stripePriceId" varchar,
        ADD COLUMN IF NOT EXISTS "trialEndsAt" timestamp,
        ADD COLUMN IF NOT EXISTS "lastStripeEventAt" timestamp DEFAULT '1970-01-01 00:00:00'
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_teams_stripeCustomerId" ON "teams" ("stripeCustomerId")`,
    );

    // 2. Personal team for every user without an owned team (+ owner membership)
    await queryRunner.query(`
      INSERT INTO "teams" ("id", "name", "ownerId", "createdAt")
      SELECT gen_random_uuid(), split_part(u."email", '@', 1) || '''s Team', u."id", now()
      FROM "users" u
      WHERE NOT EXISTS (SELECT 1 FROM "teams" t WHERE t."ownerId" = u."id")
    `);
    await queryRunner.query(`
      INSERT INTO "team_members" ("id", "teamId", "userId", "role", "joinedAt")
      SELECT gen_random_uuid(), t."id", t."ownerId", 'owner', now()
      FROM "teams" t
      WHERE NOT EXISTS (
        SELECT 1 FROM "team_members" m WHERE m."teamId" = t."id" AND m."userId" = t."ownerId"
      )
    `);

    // 3. Copy billing user -> their oldest owned team
    await queryRunner.query(`
      UPDATE "teams" t SET
        "plan" = u."plan",
        "planUpdatedAt" = u."planUpdatedAt",
        "planStatus" = u."planStatus",
        "stripeCustomerId" = u."stripeCustomerId",
        "stripeSubscriptionId" = u."stripeSubscriptionId",
        "stripePriceId" = u."stripePriceId",
        "trialEndsAt" = u."trialEndsAt",
        "lastStripeEventAt" = COALESCE(u."lastStripeEventAt", '1970-01-01 00:00:00')
      FROM "users" u
      WHERE t."ownerId" = u."id"
        AND t."id" = (
          SELECT t2."id" FROM "teams" t2
          WHERE t2."ownerId" = u."id"
          ORDER BY t2."createdAt" ASC, t2."id" ASC LIMIT 1
        )
    `);

    // 4. Backfill projects.teamId with the creator's oldest owned team
    await queryRunner.query(`
      UPDATE "projects" p SET "teamId" = (
        SELECT t."id" FROM "teams" t
        WHERE t."ownerId" = p."userId"
        ORDER BY t."createdAt" ASC, t."id" ASC LIMIT 1
      )
      WHERE p."teamId" IS NULL
    `);

    // 5. NOT NULL + replace the SET NULL FK with CASCADE
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "teamId" SET NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      DECLARE fk text;
      BEGIN
        SELECT tc.constraint_name INTO fk
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'projects'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'teamId'
          AND kcu.table_name = tc.table_name
          AND tc.table_schema = current_schema();
        IF fk IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "projects" DROP CONSTRAINT %I', fk);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD CONSTRAINT "FK_projects_teamId" FOREIGN KEY ("teamId")
        REFERENCES "teams"("id") ON DELETE CASCADE
    `);

    // 6. Drop billing columns from users
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ab9126a074980674ba95d4cd35"`,
    );
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "plan",
        DROP COLUMN IF EXISTS "planUpdatedAt",
        DROP COLUMN IF EXISTS "planStatus",
        DROP COLUMN IF EXISTS "stripeCustomerId",
        DROP COLUMN IF EXISTS "stripeSubscriptionId",
        DROP COLUMN IF EXISTS "stripePriceId",
        DROP COLUMN IF EXISTS "trialEndsAt",
        DROP COLUMN IF EXISTS "lastStripeEventAt"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reverse: restore user columns, copy back from owned team,
    // relax projects.teamId. Team billing columns are left in place.
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "plan" varchar(20) NOT NULL DEFAULT 'FREE',
        ADD COLUMN IF NOT EXISTS "planUpdatedAt" timestamp,
        ADD COLUMN IF NOT EXISTS "planStatus" varchar(20) NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "stripeCustomerId" varchar,
        ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" varchar,
        ADD COLUMN IF NOT EXISTS "stripePriceId" varchar,
        ADD COLUMN IF NOT EXISTS "trialEndsAt" timestamp,
        ADD COLUMN IF NOT EXISTS "lastStripeEventAt" timestamp DEFAULT '1970-01-01 00:00:00'
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ab9126a074980674ba95d4cd35" ON "users" ("stripeCustomerId")`,
    );
    await queryRunner.query(`
      UPDATE "users" u SET
        "plan" = t."plan", "planUpdatedAt" = t."planUpdatedAt",
        "planStatus" = t."planStatus", "stripeCustomerId" = t."stripeCustomerId",
        "stripeSubscriptionId" = t."stripeSubscriptionId", "stripePriceId" = t."stripePriceId",
        "trialEndsAt" = t."trialEndsAt", "lastStripeEventAt" = t."lastStripeEventAt"
      FROM "teams" t
      WHERE t."ownerId" = u."id"
        AND t."id" = (
          SELECT t2."id" FROM "teams" t2
          WHERE t2."ownerId" = u."id" ORDER BY t2."createdAt" ASC, t2."id" ASC LIMIT 1
        )
    `);
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_teamId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "teamId" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "projects"
        ADD CONSTRAINT "FK_projects_teamId" FOREIGN KEY ("teamId")
        REFERENCES "teams"("id") ON DELETE SET NULL
    `);
  }
}

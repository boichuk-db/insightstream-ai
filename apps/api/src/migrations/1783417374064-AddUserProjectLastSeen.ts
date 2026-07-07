import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProjectLastSeen1783417374064 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_project_last_seen" ("userId" uuid NOT NULL, "projectId" uuid NOT NULL, "seenAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_ad559f8ecde1513cb2a5503a316" PRIMARY KEY ("userId", "projectId"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_project_last_seen"`);
  }
}

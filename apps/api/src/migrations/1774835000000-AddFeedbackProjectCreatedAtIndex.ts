import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackProjectCreatedAtIndex1774835000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_feedbacks_projectId_createdAt"
        ON "feedbacks" ("projectId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_feedbacks_projectId_createdAt"
    `);
  }
}

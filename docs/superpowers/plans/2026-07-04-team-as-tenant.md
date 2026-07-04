# Team as Tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Team` the single tenant: billing + plan limits move from `User` to `Team`, `Project.teamId` becomes NOT NULL, WS events go to `team-{id}` rooms, digests go to all team members.

**Architecture:** One decisive schema switch (entities + migration in Task 1), then module-by-module rework of every consumer (plans → projects → feedback/AI → teams → stripe → digest → events → auth → web). Global `pnpm typecheck` is expected RED from Task 1 until Task 9 — each task makes its own module's tests green; Task 11 is the full verification gate.

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL 15, Stripe, Socket.io, BullMQ, Next.js 16 + TanStack Query 5, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-04-team-as-tenant-design.md` (approved 2026-07-04). Read it first.

**Approved decisions:** full billing move to Team; digest to all members (no opt-out); team with projects cannot be deleted; project creation requires role ≥ ADMIN; `Project.userId` kept as creator attribution only.

**Branch:** create `feat/team-as-tenant` from `main` before Task 1.

---

## File Structure Map

| File | Change |
|---|---|
| `packages/database/src/entities/team.entity.ts` | + billing columns |
| `packages/database/src/entities/user.entity.ts` | − billing columns |
| `packages/database/src/entities/project.entity.ts` | `teamId` NOT NULL + CASCADE |
| `packages/shared-types/src/user.types.ts` | − `plan` |
| `apps/api/src/migrations/1774910000000-TeamAsTenant.ts` | new |
| `apps/api/src/modules/plans/plan-limits.service.ts` (+spec) | userId → teamId keys |
| `apps/api/src/modules/plans/plans.controller.ts` | `/usage?teamId=` |
| `apps/api/src/modules/projects/projects.service.ts` (+controller) | teamId required, membership-only access |
| `apps/api/src/modules/feedback/feedback.service.ts` (+spec) | team-keyed limits/AI level |
| `apps/api/src/modules/ai/ai-queue.service.ts`, `ai-sweep.service.ts` (+spec) | job `ownerId` → `teamId` |
| `apps/api/src/modules/teams/teams.service.ts` | owned-team `ensurePersonalTeam`, delete guard |
| `apps/api/src/modules/invitations/invitations.service.ts` | `team.plan` instead of owner plan |
| `apps/api/src/modules/stripe/*` (+webhook spec) | customer/subscription per team |
| `apps/api/src/modules/digest/digest.service.ts` (+spec) | team plan gate, all-member send |
| `apps/api/src/modules/events/events.gateway.ts`, `events.service.ts` (+spec) | `team-{id}` rooms |
| `apps/api/src/modules/auth/auth.service.ts`, `jwt.strategy.ts` | − `plan` in payload/response |
| `apps/web/src/lib/queries.ts`, `hooks/use-plan-usage.ts` | team-scoped queries |
| `apps/web/src/components/billing/*`, `dashboard/Sidebar.tsx`, `dashboard/CreateProjectModal.tsx` | active-team billing UI |
| `apps/e2e/tests/**` | adjust to team-scoped project APIs |
| `docs/architecture/PLAN.md`, `system-architecture.drawio` | mark #7 done, ER update |

---

### Task 1: Schema switch — entities, shared-types, migration

**Files:**
- Modify: `packages/database/src/entities/team.entity.ts`
- Modify: `packages/database/src/entities/user.entity.ts`
- Modify: `packages/database/src/entities/project.entity.ts`
- Modify: `packages/shared-types/src/user.types.ts` (remove `plan: string;` line)
- Create: `apps/api/src/migrations/1774910000000-TeamAsTenant.ts`

- [ ] **Step 1: Add billing fields to `Team`**

Insert into `team.entity.ts` after the `owner` relation (import stays as-is):

```typescript
  @Column({ type: "varchar", length: 20, default: "FREE" })
  plan: string;

  @Column({ type: "timestamp", nullable: true })
  planUpdatedAt: Date | null;

  @Column({ type: "varchar", length: 20, default: "active" })
  planStatus: string;

  @Index()
  @Column({ type: "varchar", nullable: true, default: null })
  stripeCustomerId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripeSubscriptionId: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripePriceId: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  trialEndsAt: Date | null;

  /**
   * `created` of the last Stripe subscription event applied to this team.
   * Ordering guard for out-of-order webhooks (see StripeWebhookService).
   * Nullable + epoch DB default so dev `synchronize` never needs a
   * `SET NOT NULL` on a populated table.
   */
  @Column({ type: "timestamp", nullable: true, default: () => "'1970-01-01 00:00:00'" })
  lastStripeEventAt: Date | null;
```

Add `Index` to the typeorm import in `team.entity.ts`.

- [ ] **Step 2: Remove billing fields from `User`**

Delete from `user.entity.ts`: `plan`, `planUpdatedAt`, `stripeCustomerId` (and its `@Index()`), `stripeSubscriptionId`, `stripePriceId`, `planStatus`, `trialEndsAt`, `lastStripeEventAt` (with its doc comment). Keep everything else (`apiKey`, OAuth ids, reset fields).

- [ ] **Step 3: `Project.teamId` NOT NULL + CASCADE**

Replace in `project.entity.ts`:

```typescript
  @Column({ type: "uuid" })
  @Index()
  teamId: string;

  @ManyToOne("Team", (team: Team) => team.projects, { onDelete: "CASCADE" })
  @JoinColumn({ name: "teamId" })
  team: Team;
```

Also change the doc-meaning of `userId` — add a comment above it:

```typescript
  /** Creator attribution only — access control goes through teamId membership. */
```

- [ ] **Step 4: Remove `plan: string;` from `packages/shared-types/src/user.types.ts`**

- [ ] **Step 5: Write the migration**

Create `apps/api/src/migrations/1774910000000-TeamAsTenant.ts`:

```typescript
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
          ORDER BY t2."createdAt" ASC LIMIT 1
        )
    `);

    // 4. Backfill projects.teamId with the creator's oldest owned team
    await queryRunner.query(`
      UPDATE "projects" p SET "teamId" = (
        SELECT t."id" FROM "teams" t
        WHERE t."ownerId" = p."userId"
        ORDER BY t."createdAt" ASC LIMIT 1
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
          AND kcu.column_name = 'teamId';
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
          WHERE t2."ownerId" = u."id" ORDER BY t2."createdAt" ASC LIMIT 1
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
```

- [ ] **Step 6: Rebuild the database package** (apps/api loads entities from `dist` — stale dist breaks dev synchronize)

Run: `pnpm --filter @insightstream/database build && pnpm --filter @insightstream/shared-types build`
Expected: both build clean.

- [ ] **Step 7: Reset the local dev DB** (dev `synchronize` cannot `SET NOT NULL` on populated tables; local data is worthless)

Run: `docker compose down -v && docker compose up -d`
Expected: fresh PostgreSQL + Redis containers.

- [ ] **Step 8: Commit**

```bash
git add packages/database packages/shared-types apps/api/src/migrations
git commit -m "feat(tenant): move billing schema to Team, projects.teamId NOT NULL"
```

Note: `pnpm typecheck` is RED from here until Task 9 — expected; each following task fixes its module.

---

### Task 2: PlanLimitsService — team-keyed (TDD)

**Files:**
- Modify: `apps/api/src/modules/plans/plan-limits.service.ts`
- Modify: `apps/api/src/modules/plans/plan-limits.service.spec.ts` (rewrite)
- Modify: `apps/api/src/modules/plans/plans.controller.ts`

- [ ] **Step 1: Rewrite the spec against the new team-keyed API**

Replace `plan-limits.service.spec.ts` body with tests for the new surface (keep the existing mock-repo helper style of the current file — `getRepositoryToken` + jest mocks):

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import {
  User, Project, Feedback, TeamMember, Team, PlanType,
} from '@insightstream/database';
import { PlanLimitsService } from './plan-limits.service';

const repoMock = () => ({
  findOne: jest.fn(),
  count: jest.fn(),
});

describe('PlanLimitsService (team-keyed)', () => {
  let service: PlanLimitsService;
  let teamRepo: ReturnType<typeof repoMock>;
  let projectRepo: ReturnType<typeof repoMock>;
  let feedbackRepo: ReturnType<typeof repoMock>;
  let memberRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    teamRepo = repoMock();
    projectRepo = repoMock();
    feedbackRepo = repoMock();
    memberRepo = repoMock();
    const module = await Test.createTestingModule({
      providers: [
        PlanLimitsService,
        { provide: getRepositoryToken(User), useValue: repoMock() },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Team), useValue: teamRepo },
      ],
    }).compile();
    service = module.get(PlanLimitsService);
  });

  describe('getTeamPlan', () => {
    it('returns the team plan', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'active' });
      expect(await service.getTeamPlan('t1')).toBe(PlanType.PRO);
    });
    it('degrades past_due/canceled to FREE', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'PRO', planStatus: 'past_due' });
      expect(await service.getTeamPlan('t1')).toBe(PlanType.FREE);
    });
    it('defaults to FREE for a missing team', async () => {
      teamRepo.findOne.mockResolvedValue(null);
      expect(await service.getTeamPlan('t1')).toBe(PlanType.FREE);
    });
  });

  describe('canCreateProject', () => {
    it('counts projects by teamId against the team plan', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'FREE', planStatus: 'active' });
      projectRepo.count.mockResolvedValue(1);
      const res = await service.canCreateProject('t1');
      expect(projectRepo.count).toHaveBeenCalledWith({ where: { teamId: 't1' } });
      expect(res.allowed).toBe(false); // FREE allows 1 project
    });
  });

  describe('canCreateFeedback', () => {
    it('counts this month feedback via project.teamId', async () => {
      teamRepo.findOne.mockResolvedValue({ plan: 'FREE', planStatus: 'active' });
      feedbackRepo.count.mockResolvedValue(0);
      const res = await service.canCreateFeedback('t1');
      expect(feedbackRepo.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ project: { teamId: 't1' } }),
        }),
      );
      expect(res.allowed).toBe(true);
    });
  });

  describe('canCreateFeedbackForProject', () => {
    it('resolves project.teamId and delegates', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'p1', teamId: 't1' });
      teamRepo.findOne.mockResolvedValue({ plan: 'FREE', planStatus: 'active' });
      feedbackRepo.count.mockResolvedValue(0);
      const res = await service.canCreateFeedbackForProject('p1');
      expect(res.allowed).toBe(true);
    });
    it('disallows for a missing project', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      const res = await service.canCreateFeedbackForProject('p1');
      expect(res.allowed).toBe(false);
    });
  });

  describe('canInviteMember', () => {
    it('uses the team plan directly (no owner join)', async () => {
      teamRepo.findOne.mockResolvedValue({ id: 't1', plan: 'FREE', planStatus: 'active' });
      memberRepo.count.mockResolvedValue(1);
      const res = await service.canInviteMember('t1');
      expect(res.allowed).toBe(false); // FREE maxTeamMembers = 1
    });
  });

  it('assertAllowed throws ForbiddenException with plan payload', () => {
    expect(() =>
      service.assertAllowed(
        { allowed: false, current: 1, max: 1 },
        'projects',
        PlanType.FREE,
      ),
    ).toThrow(ForbiddenException);
  });
});
```

(Adjust the FREE-plan expectations to the actual numbers in `packages/database/src/plans/plan-config.ts` — read it first; the intent is: one test at the limit boundary per counter.)

- [ ] **Step 2: Run the spec — must FAIL** (`getTeamPlan` doesn't exist yet)

Run: `pnpm --filter api test -- plan-limits.service.spec`
Expected: FAIL — `service.getTeamPlan is not a function`.

- [ ] **Step 3: Rewrite the service**

Replace the userId-keyed methods in `plan-limits.service.ts`:

```typescript
  /** Effective plan of a team; past_due/canceled degrade to FREE. */
  async getTeamPlan(teamId: string): Promise<PlanType> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    const planStatus = team?.planStatus ?? 'active';
    if (planStatus === 'past_due' || planStatus === 'canceled') {
      return PlanType.FREE;
    }
    return (team?.plan as PlanType) || PlanType.FREE;
  }

  async canCreateProject(
    teamId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const current = await this.projectRepo.count({ where: { teamId } });
    return { allowed: current < limits.maxProjects, current, max: limits.maxProjects };
  }

  async canCreateFeedback(
    teamId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const current = await this.feedbackRepo.count({
      where: { project: { teamId }, createdAt: MoreThanOrEqual(startOfMonth) },
      relations: ['project'],
    });
    return {
      allowed: current < limits.maxFeedbacksPerMonth,
      current,
      max: limits.maxFeedbacksPerMonth,
    };
  }

  async canCreateFeedbackForProject(
    projectId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) return { allowed: false, current: 0, max: 0 };
    return this.canCreateFeedback(project.teamId);
  }

  async canUseFeature(teamId: string, feature: keyof PlanLimits): Promise<boolean> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value !== 'none';
    if (typeof value === 'number') return value > 0;
    return false;
  }

  async canInviteMember(
    teamId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const current = await this.memberRepo.count({ where: { teamId } });
    return { allowed: current < limits.maxTeamMembers, current, max: limits.maxTeamMembers };
  }

  async getUsageSummary(teamId: string) {
    const plan = await this.getTeamPlan(teamId);
    const limits = this.getLimits(plan);
    const projectCheck = await this.canCreateProject(teamId);
    const feedbackCheck = await this.canCreateFeedback(teamId);
    return {
      plan,
      planName: PLAN_CONFIGS[plan].name,
      price: PLAN_CONFIGS[plan].price,
      projects: { current: projectCheck.current, max: limits.maxProjects },
      feedbacksThisMonth: { current: feedbackCheck.current, max: limits.maxFeedbacksPerMonth },
      features: {
        aiAnalysis: limits.aiAnalysis,
        weeklyDigest: limits.weeklyDigest,
        widgetCustomization: limits.widgetCustomization,
        dataExport: limits.dataExport,
      },
    };
  }
```

Delete `getUserPlan`. Keep `getLimits` and `assertAllowed` unchanged. The `User` repo injection can be removed if nothing else in the service uses it.

- [ ] **Step 4: Run the spec — must PASS**

Run: `pnpm --filter api test -- plan-limits.service.spec`
Expected: PASS.

- [ ] **Step 5: `GET /plans/usage?teamId=` with membership check**

In `plans.controller.ts` replace `getUsage`:

```typescript
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Request() req: any, @Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('teamId is required');
    const member = await this.memberRepo.findOne({
      where: { teamId, userId: req.user.id },
    });
    if (!member) throw new ForbiddenException('Not a member of this team');
    const summary = await this.planLimitsService.getUsageSummary(teamId);
    return {
      ...summary,
      projects: {
        ...summary.projects,
        max: summary.projects.max === Infinity ? null : summary.projects.max,
      },
      feedbacksThisMonth: {
        ...summary.feedbacksThisMonth,
        max: summary.feedbacksThisMonth.max === Infinity ? null : summary.feedbacksThisMonth.max,
      },
    };
  }
```

Swap the injected `User` repo for `TeamMember` (`@InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>`), add `Query`, `BadRequestException`, `ForbiddenException` imports. Ensure `TeamMember` is in `TypeOrmModule.forFeature([...])` of `plans.module.ts` (it already imports `TeamMember` for the service — verify).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/plans
git commit -m "feat(tenant): PlanLimitsService keyed by teamId"
```

---

### Task 3: Projects — teamId required, membership-only access

**Files:**
- Modify: `apps/api/src/modules/projects/projects.service.ts`
- Modify: `apps/api/src/modules/projects/projects.controller.ts`
- Modify: `apps/api/src/modules/projects/projects.module.ts` (ensure `Team` repo available)

- [ ] **Step 1: Rewrite `ProjectsService`**

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Project,
  Team,
  TeamMember,
  TeamRole,
  hasMinRole,
} from '@insightstream/database';
import { PlanLimitsService } from '../plans/plan-limits.service';
import * as crypto from 'crypto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    private planLimitsService: PlanLimitsService,
  ) {}

  async create(
    userId: string,
    data: { name: string; domain?: string; teamId: string },
  ): Promise<Project> {
    if (!data.teamId) throw new BadRequestException('teamId is required');
    const member = await this.memberRepo.findOne({
      where: { teamId: data.teamId, userId },
    });
    if (!member || !hasMinRole(member.role, TeamRole.ADMIN)) {
      throw new ForbiddenException('Requires admin role in this team');
    }

    const check = await this.planLimitsService.canCreateProject(data.teamId);
    const plan = await this.planLimitsService.getTeamPlan(data.teamId);
    this.planLimitsService.assertAllowed(check, 'projects', plan);

    const project = this.projectsRepository.create({
      name: data.name,
      domain: data.domain,
      userId,
      teamId: data.teamId,
      apiKey: crypto.randomUUID(),
    });
    return this.projectsRepository.save(project);
  }

  /**
   * Team-scoped listing with a membership check. For the caller's own
   * (owned) team, an empty list bootstraps a Default Project — onboarding
   * behavior kept from the pre-tenant era, now team-scoped.
   */
  async findAllForMember(teamId: string, userId: string): Promise<Project[]> {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member) throw new NotFoundException('Team not found');

    let projects = await this.projectsRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });

    if (projects.length === 0) {
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      if (team?.ownerId === userId) {
        projects = [
          await this.projectsRepository.save(
            this.projectsRepository.create({
              name: 'Default Project',
              domain: 'localhost',
              userId,
              teamId,
              apiKey: crypto.randomUUID(),
            }),
          ),
        ];
      }
    }
    return projects;
  }

  async findAllByTeam(teamId: string): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { teamId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Access = membership in the project's team. Creator attribution grants nothing. */
  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    const member = await this.memberRepo.findOne({
      where: { teamId: project.teamId, userId },
    });
    if (!member) throw new NotFoundException('Project not found');
    return project;
  }

  async findByApiKey(apiKey: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ where: { apiKey } });
  }

  async findByOnlyId(id: string): Promise<Project | null> {
    return this.projectsRepository.findOne({ where: { id } });
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    await this.projectsRepository.remove(project);
  }
}
```

`findAllByUser` is deleted (replaced by `findAllForMember`).

- [ ] **Step 2: Controller — require `teamId`**

```typescript
  @Post()
  async create(
    @Request() req: any,
    @Body() body: { name: string; domain?: string; teamId: string },
  ) {
    return this.projectsService.create(req.user.id, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('teamId is required');
    return this.projectsService.findAllForMember(teamId, req.user.id);
  }
```

Add `Query` and `BadRequestException` to the imports. `GET /teams/:teamId/projects` in `teams.controller.ts` stays on `findAllByTeam` (already role-guarded).

- [ ] **Step 3: Register `Team` in `projects.module.ts` `TypeOrmModule.forFeature`** (alongside `Project`, `TeamMember`).

- [ ] **Step 4: Run the API unit tests for feedback/digest that mock ProjectsService — expect failures only in modules not yet reworked** (they are fixed in Tasks 4 and 7).

Run: `pnpm --filter api test -- projects`
Expected: no projects-specific spec exists; command reports no matching tests — fine.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/projects apps/api/src/modules/teams/teams.controller.ts
git commit -m "feat(tenant): projects require teamId, access via membership only"
```

---

### Task 4: Feedback + AI pipeline — team-keyed limits and AI level (TDD)

**Files:**
- Modify: `apps/api/src/modules/ai/ai-queue.service.ts` (job field `ownerId` → `teamId`)
- Modify: `apps/api/src/modules/feedback/feedback.service.ts`
- Modify: `apps/api/src/modules/feedback/feedback.service.spec.ts`
- Modify: `apps/api/src/modules/ai/ai-sweep.service.ts` + `ai-sweep.service.spec.ts`
- Modify: `apps/api/src/modules/ai/ai.processor.spec.ts` (only if it constructs `AnalysisJobData` with `ownerId`)

- [ ] **Step 1: Rename the job payload field**

In `ai-queue.service.ts`:

```typescript
export interface AnalysisJobData {
  feedbackId: string;
  content: string;
  projectId: string;
  teamId: string;
  aiLevel: 'basic' | 'full';
}
```

- [ ] **Step 2: Update `feedback.service.spec.ts` first (failing tests)**

Adjust the existing spec's mocks: `planLimitsService` mock gains `getTeamPlan` / loses `getUserPlan`; assertions that `addAnalysisJob` was called with `ownerId` now expect `teamId: project.teamId`. Add one new test:

```typescript
  it('enforces the feedback limit against the project team, not the creator', async () => {
    projectsService.findOne.mockResolvedValue({ id: 'p1', teamId: 't1', userId: 'creator' });
    planLimitsService.canCreateFeedback.mockResolvedValue({ allowed: true, current: 0, max: 100 });
    planLimitsService.getTeamPlan.mockResolvedValue('FREE');
    planLimitsService.getLimits.mockReturnValue({ aiAnalysis: 'basic' });
    await service.create('p1', 'hello', 'creator');
    expect(planLimitsService.canCreateFeedback).toHaveBeenCalledWith('t1');
    expect(planLimitsService.getTeamPlan).toHaveBeenCalledWith('t1');
  });
```

Run: `pnpm --filter api test -- feedback.service.spec`
Expected: FAIL.

- [ ] **Step 3: Rework `feedback.service.ts` `create()` and `reanalyze()`**

`create()` — replace the limit/AI-level block:

```typescript
    let teamId: string | null = null;
    if (userId) {
      const project = await this.projectsService.findOne(projectId, userId);
      teamId = project.teamId;
      const check = await this.planLimitsService.canCreateFeedback(teamId);
      const plan = await this.planLimitsService.getTeamPlan(teamId);
      this.planLimitsService.assertAllowed(check, 'feedbacks this month', plan);
    } else {
      // Public widget — limits belong to the project's team
      const check =
        await this.planLimitsService.canCreateFeedbackForProject(projectId);
      const project = await this.projectsService.findByOnlyId(projectId);
      teamId = project?.teamId ?? null;
      if (teamId) {
        const plan = await this.planLimitsService.getTeamPlan(teamId);
        this.planLimitsService.assertAllowed(check, 'feedbacks this month', plan);
      }
    }
```

And the AI-level block after `emitFeedbackUpdatedForProject`:

```typescript
    let aiLevel: string = 'basic';
    if (teamId) {
      const limits = this.planLimitsService.getLimits(
        await this.planLimitsService.getTeamPlan(teamId),
      );
      aiLevel = limits.aiAnalysis;
    }

    if (aiLevel !== 'none' && teamId) {
      await this.aiQueueService.addAnalysisJob(
        {
          feedbackId: savedFeedback.id,
          content,
          projectId,
          teamId,
          aiLevel: aiLevel === 'full' ? 'full' : 'basic',
        },
        10,
      );
    }
```

`reanalyze()` — same pattern:

```typescript
    const teamId = feedback.project?.teamId;
    let aiLevel: string = 'basic';
    if (teamId) {
      const limits = this.planLimitsService.getLimits(
        await this.planLimitsService.getTeamPlan(teamId),
      );
      aiLevel = limits.aiAnalysis;
    }
    if (aiLevel === 'none')
      return { success: false, message: 'AI Analysis disabled for your plan' };

    await this.aiQueueService.addAnalysisJob(
      {
        feedbackId: feedback.id,
        content: feedback.content,
        projectId: feedback.projectId,
        teamId: teamId!,
        aiLevel: aiLevel === 'full' ? 'full' : 'basic',
      },
      1,
    );
```

- [ ] **Step 4: Run feedback spec — PASS**

Run: `pnpm --filter api test -- feedback.service.spec`
Expected: PASS.

- [ ] **Step 5: Rework `ai-sweep.service.ts`** — plan cache keys by team:

Replace the owner block inside the candidates loop:

```typescript
          const teamId = fb.project?.teamId;
          if (!teamId) {
            this.logger.warn(
              `Feedback ${fb.id} has no team; skipping sweep re-enqueue`,
            );
            continue;
          }

          let plan = planCache.get(teamId);
          if (plan === undefined) {
            plan = await this.planLimitsService.getTeamPlan(teamId);
            planCache.set(teamId, plan);
          }
          const aiLevel = this.planLimitsService.getLimits(plan).aiAnalysis;
          if (aiLevel === 'none') continue;

          await this.aiQueueService.addAnalysisJob(
            {
              feedbackId: fb.id,
              content: fb.content,
              projectId: fb.projectId,
              teamId,
              aiLevel: aiLevel === 'full' ? 'full' : 'basic',
            },
            10,
          );
```

Update `ai-sweep.service.spec.ts` mocks accordingly (`getTeamPlan` instead of `getUserPlan`; fixture projects carry `teamId`).

- [ ] **Step 6: Run AI specs — PASS**

Run: `pnpm --filter api test -- ai-sweep && pnpm --filter api test -- ai.processor`
Expected: PASS (fix `ai.processor.spec.ts` fixtures if they set `ownerId`).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/feedback apps/api/src/modules/ai
git commit -m "feat(tenant): feedback limits and AI level resolved via project team"
```

---

### Task 5: Teams + Invitations — owned personal team, delete guard, team plan

**Files:**
- Modify: `apps/api/src/modules/teams/teams.service.ts`
- Modify: `apps/api/src/modules/invitations/invitations.service.ts`

- [ ] **Step 1: Fix `ensurePersonalTeam` — owned team, not first membership; drop the orphan-migration branch (no orphans exist post-migration)**

```typescript
  async ensurePersonalTeam(userId: string): Promise<Team> {
    const owned = await this.teamRepo.findOne({
      where: { ownerId: userId },
      order: { createdAt: 'ASC' },
    });
    if (owned) return owned;
    return this.createPersonalTeam(userId);
  }
```

Remove the `IsNull` import if now unused.

- [ ] **Step 2: Guard team deletion**

```typescript
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.findOne(teamId);
    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only the team owner can delete the team');
    }
    const projectCount = await this.projectRepo.count({ where: { teamId } });
    if (projectCount > 0) {
      throw new ForbiddenException(
        'Delete or move the team projects before deleting the team',
      );
    }
    await this.teamRepo.remove(team);
  }
```

- [ ] **Step 3: Invitations — plan from the team row**

In `invitations.service.ts` replace the owner-plan block:

```typescript
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const teamPlan = (team.plan as PlanType) || PlanType.FREE;
    const limits = PLAN_CONFIGS[teamPlan];
```

Rename the later `currentPlan: ownerPlan` reference to `currentPlan: teamPlan`.

- [ ] **Step 4: Run team-adjacent specs**

Run: `pnpm --filter api test -- update-team.dto && pnpm --filter api test -- comments`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/teams apps/api/src/modules/invitations
git commit -m "feat(tenant): owned personal team, guarded team delete, team-plan invites"
```

---

### Task 6: Stripe — customer, checkout, webhook per team (TDD)

**Files:**
- Modify: `apps/api/src/modules/stripe/stripe.service.ts`
- Modify: `apps/api/src/modules/stripe/stripe.controller.ts`
- Modify: `apps/api/src/modules/stripe/stripe-webhook.service.ts`
- Modify: `apps/api/src/modules/stripe/stripe-webhook.service.spec.ts`
- Modify: `apps/api/src/modules/stripe/stripe.module.ts` (`Team`, `TeamMember` in forFeature; drop `User` if unused)

- [ ] **Step 1: Update the webhook spec first**

In `stripe-webhook.service.spec.ts`: replace the `User` repo mock with `Team` (`getRepositoryToken(Team)`), fixtures use `metadata: { teamId: 't1' }`, and the ordering-guard assertions target the `teams` update. Keep every existing scenario (dedup by event id, stale event ignored, out-of-order `updated` after `deleted` cannot resurrect, unknown priceId → FREE, payment_failed by customer id). The events now resolve a team:

```typescript
  it('checkout.session.completed upgrades the team from metadata.teamId', async () => {
    stripeService.retrieveSubscription.mockResolvedValue({
      id: 'sub_1',
      items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      trial_end: null,
    } as any);
    await service.handleEvent(
      makeEvent('checkout.session.completed', {
        subscription: 'sub_1',
        metadata: { teamId: 't1' },
      }),
    );
    expect(qb.set).toHaveBeenCalledWith(
      expect.objectContaining({ plan: PlanType.PRO, stripeSubscriptionId: 'sub_1' }),
    );
    expect(qb.where).toHaveBeenCalledWith(
      expect.stringContaining('"lastStripeEventAt"'),
      expect.objectContaining({ id: 't1' }),
    );
  });
```

(`makeEvent` / `qb` are the existing spec helpers — keep their shape, only re-point the repo token and metadata key.)

Run: `pnpm --filter api test -- stripe-webhook`
Expected: FAIL.

- [ ] **Step 2: Rework `stripe-webhook.service.ts`**

Mechanical substitution, same structure:
- Inject `@InjectRepository(Team) private teamRepo: Repository<Team>` instead of the `User` repo; import `Team` from `@insightstream/database`.
- `type TeamPlanFields = Partial<Pick<Team, 'plan' | 'planStatus' | 'stripeSubscriptionId' | 'stripePriceId' | 'trialEndsAt'>>` (replaces `UserPlanFields`).
- Every `session.metadata?.userId` / `subscription.metadata?.userId` → `metadata?.teamId`; warn strings say `no teamId in metadata`.
- `handlePaymentFailed`: `this.teamRepo.findOne({ where: { stripeCustomerId: customerId } })`.
- `applyIfNewer(teamId: string, eventCreatedAt: Date, fields: TeamPlanFields)` runs the same atomic conditional UPDATE via `this.teamRepo.createQueryBuilder().update(Team)`; also set `planUpdatedAt: eventCreatedAt` in the `.set({...})` so the stamp moves with every applied event.

- [ ] **Step 3: Run the webhook spec — PASS**

Run: `pnpm --filter api test -- stripe-webhook`
Expected: PASS.

- [ ] **Step 4: `StripeService` — customer per team**

```typescript
  async createOrGetCustomer(team: Team, ownerEmail: string): Promise<string> {
    if (team.stripeCustomerId) return team.stripeCustomerId;
    const customer = await this.stripe.customers.create({
      email: ownerEmail,
      metadata: { teamId: team.id },
    });
    await this.teamRepo.update(team.id, { stripeCustomerId: customer.id });
    this.logger.log(`Created Stripe customer ${customer.id} for team ${team.id}`);
    return customer.id;
  }

  async createCheckoutSession(
    team: Team,
    ownerEmail: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const customerId = await this.createOrGetCustomer(team, ownerEmail);
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { teamId: team.id },
      },
      metadata: { teamId: team.id },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session.url!;
  }
```

Repo injection switches from `User` to `Team`. `createPortalSession`, `retrieveSubscription`, `constructWebhookEvent` unchanged.

- [ ] **Step 5: `StripeController` — team-scoped endpoints**

```typescript
@Controller('plans')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private config: ConfigService,
    @InjectRepository(Team) private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
  ) {}

  /** Owner-only: loads the team and asserts req.user owns it. */
  private async requireOwnedTeam(teamId: string, userId: string): Promise<Team> {
    if (!teamId) throw new BadRequestException('teamId is required');
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['owner'],
    });
    if (!team) throw new NotFoundException('Team not found');
    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only the team owner manages billing');
    }
    return team;
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @Request() req: any,
    @Body() body: { priceId: string; teamId: string },
  ) {
    if (!body.priceId) throw new BadRequestException('priceId is required');
    const team = await this.requireOwnedTeam(body.teamId, req.user.id);
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createCheckoutSession(
      team,
      team.owner.email,
      body.priceId,
      `${frontendUrl}/dashboard/billing?success=true`,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  @Get('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@Request() req: any, @Query('teamId') teamId: string) {
    const team = await this.requireOwnedTeam(teamId, req.user.id);
    if (!team.stripeCustomerId) {
      throw new BadRequestException('No active subscription');
    }
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const url = await this.stripeService.createPortalSession(
      team.stripeCustomerId,
      `${frontendUrl}/dashboard/billing`,
    );
    return { url };
  }

  /** Any member of the team may read plan status. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getPlanStatus(@Request() req: any, @Query('teamId') teamId: string) {
    if (!teamId) throw new BadRequestException('teamId is required');
    const member = await this.memberRepo.findOne({
      where: { teamId, userId: req.user.id },
    });
    if (!member) throw new ForbiddenException('Not a member of this team');
    const team = await this.teamRepo.findOneOrFail({ where: { id: teamId } });
    return {
      plan: team.plan,
      planStatus: team.planStatus ?? 'active',
      trialEndsAt: team.trialEndsAt ?? null,
      stripePriceId: team.stripePriceId ?? null,
      stripeSubscriptionId: team.stripeSubscriptionId ?? null,
      isOwner: team.ownerId === req.user.id,
    };
  }
}
```

Imports: `Query`, `NotFoundException`, `ForbiddenException`, `Team`, `TeamMember`.

- [ ] **Step 6: `stripe.module.ts`** — `TypeOrmModule.forFeature([Team, TeamMember, StripeEvent])`; remove `User` if nothing else in the module uses it.

- [ ] **Step 7: Run all stripe specs — PASS. Commit**

Run: `pnpm --filter api test -- stripe`
Expected: PASS.

```bash
git add apps/api/src/modules/stripe
git commit -m "feat(tenant): Stripe customer, checkout and webhooks keyed by team"
```

Follow-up (2026-07-04 review): webhook handlers fall back to stripeCustomerId when metadata lacks teamId (legacy pre-migration subscriptions); unresolvable events are not recorded so dashboard redelivery stays possible; requireOwnedTeam returns uniform 404.

---

### Task 7: Digest — team plan gate, all-member recipients (TDD)

**Files:**
- Modify: `apps/api/src/modules/digest/digest.service.ts`
- Modify: `apps/api/src/modules/digest/digest.service.spec.ts`

- [ ] **Step 1: Update the spec first**

Fixtures: projects load `relations: ['team']` and carry `team: { id: 't1', plan: 'PRO' }`. Mock a `TeamMember` repo (`getRepositoryToken(TeamMember)`) returning two members with `user.email`. New/changed tests:

```typescript
  it('sends the digest to every team member', async () => {
    projects.find.mockResolvedValue([
      { id: 'p1', name: 'Proj', teamId: 't1', team: { id: 't1' } },
    ]);
    planLimits.canUseFeature.mockResolvedValue(true);
    feedbacks.find.mockResolvedValue([{ content: 'x', sentimentScore: 0.2 }]);
    memberRepo.find.mockResolvedValue([
      { userId: 'u1', user: { email: 'a@x.dev' } },
      { userId: 'u2', user: { email: 'b@x.dev' } },
    ]);
    await service.runDigest();
    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(planLimits.canUseFeature).toHaveBeenCalledWith('t1', 'weeklyDigest');
  });

  it('skips projects whose team plan lacks the digest', async () => {
    projects.find.mockResolvedValue([
      { id: 'p1', name: 'Proj', teamId: 't1', team: { id: 't1' } },
    ]);
    planLimits.canUseFeature.mockResolvedValue(false);
    const res = await service.runDigest();
    expect(mail.send).not.toHaveBeenCalled();
    expect(res.skipped).toBe(1);
  });
```

Run: `pnpm --filter api test -- digest.service.spec`
Expected: FAIL.

- [ ] **Step 2: Rework `digest.service.ts`**

- Inject `@InjectRepository(TeamMember) private members: Repository<TeamMember>`; import `TeamMember`; drop the unused `User` repo. Register `TeamMember` in `digest.module.ts` forFeature.
- `preview()` gate:

```typescript
    const hasDigest = await this.planLimitsService.canUseFeature(
      project.teamId,
      'weeklyDigest',
    );
    if (!hasDigest) {
      throw new Error(
        'Weekly digest is available on Pro and Business plans. Please upgrade.',
      );
    }
```

(The `relations: ['user']` load and `(project as any).user` casts go away.)
- `runDigest()` loop — replace the owner-gate and the send block:

```typescript
    const allProjects = await this.projects.find();
    // ...
      try {
        const hasDigest = await this.planLimitsService.canUseFeature(
          project.teamId,
          'weeklyDigest',
        );
        if (!hasDigest) {
          this.logger.debug(
            `Project "${project.name}" — team plan does not include weekly digest, skipping.`,
          );
          skipped++;
          continue;
        }

        const weekFeedbacks = await this.feedbacks.find({
          where: { projectId: project.id, createdAt: MoreThan(since) },
          order: { createdAt: 'DESC' },
        });
        if (weekFeedbacks.length === 0) { /* unchanged skip */ }

        const recipients = (
          await this.members.find({
            where: { teamId: project.teamId },
            relations: ['user'],
          })
        )
          .map((m) => m.user?.email)
          .filter((e): e is string => !!e);
        if (recipients.length === 0) {
          this.logger.warn(
            `Project "${project.name}" — no team member emails, skipping.`,
          );
          skipped++;
          continue;
        }

        const stats = this.buildStats(project.name, weekFeedbacks);
        const aiSummary = await this.ai.generateWeeklyDigest(stats);
        const html = this.renderEmail(project.name, stats, aiSummary, since);

        for (const email of recipients) {
          await this.mail.send(email, `📊 Weekly Digest: ${project.name}`, html);
        }
        sent++;
        this.logger.log(
          `Digest sent for "${project.name}" → ${recipients.length} member(s) (${weekFeedbacks.length} feedbacks)`,
        );
      } catch (err) { /* unchanged */ }
```

- [ ] **Step 3: Run digest spec — PASS. Commit**

Run: `pnpm --filter api test -- digest.service.spec`
Expected: PASS.

```bash
git add apps/api/src/modules/digest
git commit -m "feat(tenant): digest gated by team plan, sent to all members"
```

---

### Task 8: WebSocket — `team-{id}` rooms (TDD)

**Files:**
- Modify: `apps/api/src/modules/events/events.gateway.ts`
- Modify: `apps/api/src/modules/events/events.service.ts`
- Modify: `apps/api/src/modules/events/events.service.spec.ts`
- Modify: `apps/api/src/modules/events/events.module.ts` (gateway needs the `TeamMember` repo)

- [ ] **Step 1: Update `events.service.spec.ts` first** — the service now makes a single team emit, no member fan-out:

```typescript
  it('emits once to the project team room', async () => {
    projectRepo.findOne.mockResolvedValue({ id: 'p1', teamId: 't1' });
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdatedToTeam).toHaveBeenCalledWith('t1');
  });

  it('does nothing for a missing project', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdatedToTeam).not.toHaveBeenCalled();
  });
```

Run: `pnpm --filter api test -- events.service.spec`
Expected: FAIL.

- [ ] **Step 2: Gateway — join team rooms on connect, add team emit**

```typescript
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.join(`user-${payload.sub}`);
      const memberships = await this.memberRepo.find({
        where: { userId: payload.sub },
      });
      for (const m of memberships) {
        client.join(`team-${m.teamId}`);
      }
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  emitFeedbackUpdatedToTeam(teamId: string) {
    this.server
      .to(`team-${teamId}`)
      .emit('feedbackUpdated', { timestamp: new Date() });
  }
```

Inject `@InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>` (imports: `InjectRepository`, `Repository`, `TeamMember`). Delete `emitFeedbackUpdated(userId)` — `EventsService` was its only caller. Known limitation (accepted in spec): membership changes don't rebuild rooms until reconnect.

- [ ] **Step 3: Simplify `EventsService`**

```typescript
  /** One emit to the project's team room covers every member's dashboard. */
  async emitFeedbackUpdatedForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) return;
    this.gateway.emitFeedbackUpdatedToTeam(project.teamId);
  }
```

Drop the `TeamMember` repo from the service (it moved to the gateway); keep it in `events.module.ts` forFeature.

- [ ] **Step 4: Run events spec — PASS. Commit**

Run: `pnpm --filter api test -- events.service.spec`
Expected: PASS.

```bash
git add apps/api/src/modules/events
git commit -m "feat(tenant): WS events emit to team rooms"
```

---

### Task 9: Auth cleanup + full API typecheck gate

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/jwt.strategy.ts`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts` (if it asserts `plan` in responses)

- [ ] **Step 1: Remove `plan` from the JWT payload and login response**

`auth.service.ts` `login()`:

```typescript
  login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
```

`jwt.strategy.ts` `validate()` return: `{ id: user.id, email: user.email, role: user.role }`.

- [ ] **Step 2: Verify nothing reads `req.user.plan` or `user.plan` in the API anymore**

Run: `pnpm --filter api exec grep -rn "user\.plan\|\.plan\b" src --include=*.ts | grep -v spec | grep -v "team\.plan\|teamPlan\|getTeamPlan\|plan-limits\|plans\.controller\|PlanType\|PLAN_CONFIGS\|planStatus\|planUpdatedAt\|stripePriceId"`
Expected: no hits pointing at a `User` billing field. Fix any stragglers the same way as above.

- [ ] **Step 3: Full API typecheck — first global green gate since Task 1**

Run: `pnpm --filter api typecheck && pnpm --filter api test`
Expected: PASS (all suites).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth
git commit -m "feat(tenant): drop plan from JWT payload and auth responses"
```

---

### Task 10: Frontend — team-scoped queries and billing UI

**Files:**
- Modify: `apps/web/src/lib/queries.ts`
- Modify: `apps/web/src/hooks/use-plan-usage.ts`
- Modify: `apps/web/src/components/billing/PricingCards.tsx`
- Modify: `apps/web/src/components/billing/CurrentPlanCard.tsx`
- Modify: `apps/web/src/components/billing/TrialBanner.tsx`
- Modify: `apps/web/src/components/billing/UsageMetrics.tsx`
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`
- Modify: `apps/web/src/components/dashboard/CreateProjectModal.tsx`
- Modify: every `projectsQuery` call site (Step 3 grep)

- [ ] **Step 1: Team-scoped query options in `lib/queries.ts`**

```typescript
export const projectsQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["projects", teamId],
    queryFn: () =>
      api
        .get<IProject[]>("/projects", { params: { teamId } })
        .then((r) => r.data),
    enabled: !!teamId,
  });

export const planStatusQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["planStatus", teamId],
    queryFn: () =>
      api
        .get<PlanStatus>("/plans/status", { params: { teamId } })
        .then((r) => r.data),
    staleTime: 60_000,
    enabled: !!teamId,
  });
```

Extend `PlanStatus` with `isOwner: boolean;`.

- [ ] **Step 2: `use-plan-usage.ts`** — the hook takes `teamId: string` and passes `{ params: { teamId } }`, query key `["planUsage", teamId]`, `enabled: !!teamId`. Same change in the inline usage query in `UsageMetrics.tsx`.

- [ ] **Step 3: Update every call site of the two query factories**

Run: `pnpm --filter web exec grep -rln "projectsQuery\|planStatusQuery\|usePlanUsage" src`
For each hit: get `activeTeamId` from `useTeam()` and call `projectsQuery(activeTeamId ?? "")` / `planStatusQuery(activeTeamId ?? "")` (the `enabled` flag guards the empty string). Invalidations `queryClient.invalidateQueries({ queryKey: ["projects"] })` keep working via prefix matching.

- [ ] **Step 4: Billing components**

- `PricingCards.tsx`: `const { activeTeamId } = useTeam();` → `useQuery(planStatusQuery(activeTeamId ?? ""))`; checkout mutation body `{ priceId, teamId: activeTeamId }`; disable the upgrade buttons with a tooltip-title `Only the team owner manages billing` when `status && !status.isOwner`.
- `CurrentPlanCard.tsx`: same query change; portal call becomes `api.get<{ url: string }>("/plans/portal", { params: { teamId: activeTeamId } })`; hide the manage-billing button when `!data.isOwner`.
- `TrialBanner.tsx`: `useQuery(planStatusQuery(activeTeamId ?? ""))`.
- `Sidebar.tsx`: the plan badge (lines ~311–325) reads from `planStatusQuery(activeTeamId ?? "")` data instead of `userProfile?.plan`; the Upgrade CTA shows only when `!isPaidPlan(planStatus?.plan || "FREE")`.

- [ ] **Step 5: `CreateProjectModal.tsx`** — send the team:

```typescript
const { activeTeamId } = useTeam();
// mutation:
const { data } = await api.post("/projects", { name, domain, teamId: activeTeamId });
```

Disable submit while `!activeTeamId`.

- [ ] **Step 6: Web typecheck + lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web packages/shared-types
git commit -m "feat(tenant): web billing and project queries scoped to active team"
```

---

### Task 11: E2E + full verification gate

**Files:**
- Modify: `apps/e2e/tests/**` (specs that create projects or read plan UI)

- [ ] **Step 1: Update e2e specs**

Run: `pnpm --filter e2e exec grep -rln "/projects\|plan" tests`
For each spec that POSTs `/projects` directly: add `teamId` (fetch `GET /teams` first and use `[0].id`). Specs driving the UI need no payload change (the modal now sends `teamId`), but flows asserting the project list must wait for the teams request to settle first (the list is empty until `activeTeamId` resolves).

- [ ] **Step 2: Full local gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all PASS. Show the output.

- [ ] **Step 3: Boot + exercise end-to-end** (Verification Mandate + `feedback_verify_end_to_end` memory)

1. `docker compose up -d`; `pnpm dev`; expect `Nest application successfully started` with no DI errors.
2. Register user A → personal team exists (`GET /teams`), project list bootstraps Default Project **inside that team**.
3. Submit widget feedback → dashboard updates in realtime.
4. Invite user B (second browser) → B sees the team project; B's dashboard receives the realtime `feedbackUpdated` (team room).
5. Stripe test checkout for the team (owner) → `stripe listen --forward-to localhost:3001/...` webhook → `GET /plans/status?teamId=` shows the upgraded plan for **both** members.
6. Member (non-owner) hits `POST /plans/checkout` → 403.

- [ ] **Step 4: Run e2e**

Run: `pnpm --filter e2e test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/e2e
git commit -m "test(e2e): team-scoped project creation and plan flows"
```

---

### Task 12: Docs — PLAN.md + ER diagram

**Files:**
- Modify: `docs/architecture/PLAN.md`
- Modify: `docs/architecture/system-architecture.drawio`

- [ ] **Step 1: PLAN.md**

- Strike item #7 (`~~Team as Tenant~~ — ✔ Done (date)`) with a summary: billing+limits on `Team`, `projects.teamId` NOT NULL + CASCADE, `team-{id}` WS rooms, digest to all members, **and the stale-premise note**: the "WS live bug" was already fixed by `EventsService` fan-out before this work; the room change is a simplification.
- Add the ✔ Completed entry, bump the `Last updated` date, add a Changelog line.
- Product Backlog: mark the "Digest preferences — recipients" row as partially landed (recipients = team; preferences still open).

- [ ] **Step 2: drawio ER diagram** — move billing fields `plan/planStatus/stripe*/trialEndsAt/lastStripeEventAt` from `users` to `teams`; `projects.teamId` NOT NULL, FK CASCADE.

- [ ] **Step 3: Commit**

```bash
git add docs/architecture
git commit -m "docs: mark PLAN #7 Team-as-Tenant done, update ER diagram"
```

---

## Post-plan

Merge via `superpowers:finishing-a-development-branch` (PR or merge to `main`). Prod deploy note: run the migration against Supabase before deploying the new API image; zero users, so no coordination needed.

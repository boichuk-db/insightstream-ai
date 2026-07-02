# Security & Correctness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three cross-tenant access bugs (IDOR), add input validation, scope CORS, fix realtime events for teams, and isolate the embeddable widget in Shadow DOM.

**Architecture:** All API fixes follow existing patterns: access checks live in services (owner-or-team-member via `TeamMember` repo), controllers pass `req.user.id`. Validation is added via a global `ValidationPipe` + class-validator DTOs (the codebase already has one DTO precedent: `UpdateTeamDto`). The widget gets an open Shadow DOM with CSS inlined via Vite's `?inline` import, replacing `vite-plugin-css-injected-by-js`.

**Tech Stack:** NestJS 11, TypeORM, Jest (unit tests, pattern: mock repos via `getRepositoryToken`), class-validator/class-transformer (to be installed), Vite IIFE widget, Tailwind 4.

**Conventions for the executor:**
- Run all commands from repo root `d:\Work\insight-stream` unless stated.
- API tests: `pnpm --filter api test -- --testPathPattern=<name>`.
- After each task, before commit: `pnpm typecheck && pnpm lint` must pass.
- Prettier: `singleQuote: true`, `trailingComma: "all"` (API uses single quotes).
- Do NOT touch design/markup — that is a separate future task.

**Out of scope (deliberate, do not do):** widget visual redesign, pagination of `findByProject`, apiKey rotation, `GET /projects` side-effect removal, SSL cert pinning, JWT plan staleness.

---

## Task 1: Fix IDOR — reading comments of any feedback

Any authenticated user can read comments on any feedback UUID. `CommentsService.create` checks access; `findByFeedback` does not.

**Files:**
- Modify: `apps/api/src/modules/comments/comments.service.ts`
- Modify: `apps/api/src/modules/comments/comments.controller.ts:28-38`
- Create: `apps/api/src/modules/comments/comments.service.spec.ts`

- [x] **Step 1: Write the failing test**

Create `apps/api/src/modules/comments/comments.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Comment, Feedback, TeamMember } from '@insightstream/database';
import { CommentsService } from './comments.service';
import { ActivityService } from '../activity/activity.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentRepo: any;
  let feedbackRepo: any;
  let memberRepo: any;

  beforeEach(async () => {
    commentRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((c) => Promise.resolve({ id: 'c1', ...c })),
      remove: jest.fn(),
    };
    feedbackRepo = { findOne: jest.fn() };
    memberRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: commentRepo },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: ActivityService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('findByFeedback', () => {
    it('throws NotFoundException when feedback does not exist', async () => {
      feedbackRepo.findOne.mockResolvedValue(null);
      await expect(service.findByFeedback('fb-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for a user who is neither owner nor team member', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: null },
      });
      await expect(
        service.findByFeedback('fb-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
      expect(commentRepo.find).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-member of a team project', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: 'team-1' },
      });
      memberRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findByFeedback('fb-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns comments for the project owner', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: null },
      });
      commentRepo.find.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.findByFeedback('fb-1', 'owner-1');
      expect(result).toEqual([{ id: 'c1' }]);
      expect(commentRepo.find).toHaveBeenCalledWith({
        where: { feedbackId: 'fb-1' },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    });

    it('returns comments for a team member', async () => {
      feedbackRepo.findOne.mockResolvedValue({
        id: 'fb-1',
        project: { id: 'p1', userId: 'owner-1', teamId: 'team-1' },
      });
      memberRepo.findOne.mockResolvedValue({ id: 'm1' });
      commentRepo.find.mockResolvedValue([{ id: 'c1' }]);
      const result = await service.findByFeedback('fb-1', 'member-1');
      expect(result).toEqual([{ id: 'c1' }]);
      expect(memberRepo.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-1', userId: 'member-1' },
      });
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- --testPathPattern=comments.service`
Expected: FAIL — `findByFeedback` currently takes 1 argument and does no access check, so Forbidden/NotFound tests fail.

- [x] **Step 3: Implement access check in the service**

In `apps/api/src/modules/comments/comments.service.ts`, extract the access check that already exists in `create` into a private helper, and use it in both methods. Replace the body of `create` (lines 27-48 region) and `findByFeedback`:

```typescript
  private async getFeedbackWithAccess(
    feedbackId: string,
    userId: string,
  ): Promise<Feedback> {
    const feedback = await this.feedbackRepo.findOne({
      where: { id: feedbackId },
      relations: ['project'],
    });
    if (!feedback) throw new NotFoundException('Feedback not found');

    const project = feedback.project;
    if (project.teamId) {
      const member = await this.memberRepo.findOne({
        where: { teamId: project.teamId, userId },
      });
      if (!member)
        throw new ForbiddenException('You are not a member of this team');
    } else if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return feedback;
  }

  async create(
    feedbackId: string,
    userId: string,
    content: string,
  ): Promise<Comment> {
    const feedback = await this.getFeedbackWithAccess(feedbackId, userId);
    const project = feedback.project;

    const comment = await this.commentRepo.save(
      this.commentRepo.create({ feedbackId, userId, content }),
    );

    if (project.teamId) {
      await this.activityService.log({
        teamId: project.teamId,
        projectId: project.id,
        actorId: userId,
        action: ActivityAction.COMMENT_ADDED,
        metadata: { feedbackId, commentId: comment.id },
      });
    }

    return this.commentRepo.findOne({
      where: { id: comment.id },
      relations: ['user'],
    }) as Promise<Comment>;
  }

  async findByFeedback(feedbackId: string, userId: string): Promise<Comment[]> {
    await this.getFeedbackWithAccess(feedbackId, userId);
    return this.commentRepo.find({
      where: { feedbackId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
```

- [x] **Step 4: Pass userId from the controller**

In `apps/api/src/modules/comments/comments.controller.ts`, replace the `findByFeedback` handler:

```typescript
  @Get('feedbacks/:feedbackId/comments')
  async findByFeedback(
    @Param('feedbackId') feedbackId: string,
    @Request() req: any,
  ) {
    const comments = await this.commentsService.findByFeedback(
      feedbackId,
      req.user.id,
    );
    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      userId: c.userId,
      userEmail: c.user?.email,
      createdAt: c.createdAt,
    }));
  }
```

- [x] **Step 5: Run test to verify it passes**

Run: `pnpm --filter api test -- --testPathPattern=comments.service`
Expected: PASS (5 tests).

- [x] **Step 6: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

```bash
git add apps/api/src/modules/comments/
git commit -m "fix(comments): require project access to read feedback comments (IDOR)"
```

---

## Task 2: Fix IDOR — digest preview of any project

`GET /digest/preview/:projectId` checks only the *owner's* plan, not that the caller can access the project. It leaks feedback content (`mostNegative`) cross-tenant.

**Files:**
- Modify: `apps/api/src/modules/digest/digest.module.ts`
- Modify: `apps/api/src/modules/digest/digest.service.ts:31-75`
- Modify: `apps/api/src/modules/digest/digest.controller.ts:17-21`
- Create: `apps/api/src/modules/digest/digest.service.spec.ts`

- [x] **Step 1: Write the failing test**

Create `apps/api/src/modules/digest/digest.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Project, Feedback, User } from '@insightstream/database';
import { DigestService } from './digest.service';
import { AiService } from '../ai/ai.service';
import { MailService } from '../mail/mail.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { ProjectsService } from '../projects/projects.service';

describe('DigestService', () => {
  let service: DigestService;
  let projectsService: any;
  let projectRepo: any;
  let feedbackRepo: any;

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn(), find: jest.fn() };
    feedbackRepo = { find: jest.fn().mockResolvedValue([]) };
    projectsService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(Feedback), useValue: feedbackRepo },
        { provide: getRepositoryToken(User), useValue: { find: jest.fn() } },
        {
          provide: AiService,
          useValue: { generateWeeklyDigest: jest.fn().mockResolvedValue('<p>ok</p>') },
        },
        { provide: MailService, useValue: { sendDigest: jest.fn() } },
        {
          provide: PlanLimitsService,
          useValue: { canUseFeature: jest.fn().mockResolvedValue(true) },
        },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get<DigestService>(DigestService);
  });

  describe('preview', () => {
    it('rejects a caller without access to the project', async () => {
      projectsService.findOne.mockRejectedValue(
        new NotFoundException('Project not found'),
      );
      await expect(service.preview('proj-1', 'stranger')).rejects.toThrow(
        NotFoundException,
      );
      expect(feedbackRepo.find).not.toHaveBeenCalled();
    });

    it('allows a caller with access and returns stats', async () => {
      projectsService.findOne.mockResolvedValue({ id: 'proj-1' });
      projectRepo.findOne.mockResolvedValue({
        id: 'proj-1',
        name: 'My Project',
        user: { id: 'owner-1' },
      });
      const result = await service.preview('proj-1', 'member-1');
      expect(projectsService.findOne).toHaveBeenCalledWith('proj-1', 'member-1');
      expect(result.projectName).toBe('My Project');
    });
  });
});
```

Note: if `MailService` in `digest.service.ts` is injected under a different method surface, the mock above only needs to satisfy DI — an empty object with any methods is fine; adjust the mock shape only if module compilation fails.

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- --testPathPattern=digest.service`
Expected: FAIL — `Nest can't resolve dependencies` (no `ProjectsService` in `DigestService`) or signature mismatch (`preview` takes 1 arg).

- [x] **Step 3: Wire ProjectsModule into DigestModule**

In `apps/api/src/modules/digest/digest.module.ts` add the import:

```typescript
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Feedback, User]),
    AiModule,
    MailModule,
    PlansModule,
    ProjectsModule,
  ],
  providers: [DigestService],
  controllers: [DigestController],
})
export class DigestModule {}
```

(`ProjectsModule` already exports `ProjectsService`; no circular dependency — `ProjectsModule` does not import `DigestModule`.)

- [x] **Step 4: Enforce access in the service**

In `apps/api/src/modules/digest/digest.service.ts`:

Add to imports and constructor:

```typescript
import { ProjectsService } from '../projects/projects.service';
```

```typescript
  constructor(
    @InjectRepository(Project) private projects: Repository<Project>,
    @InjectRepository(Feedback) private feedbacks: Repository<Feedback>,
    @InjectRepository(User) private users: Repository<User>,
    private ai: AiService,
    private mail: MailService,
    private planLimitsService: PlanLimitsService,
    private projectsService: ProjectsService,
  ) {}
```

Change `preview` signature and add the access check as the first statement:

```typescript
  async preview(
    projectId: string,
    userId: string,
  ): Promise<{
    projectName: string;
    since: string;
    totalCount: number;
    avgSentiment: number;
    categories: Record<string, number>;
    topTags: string[];
    mostNegative: Array<{ content: string; sentimentScore: number | null }>;
    aiSummary: string;
  }> {
    // Throws NotFoundException unless caller is owner or team member
    await this.projectsService.findOne(projectId, userId);

    const project = await this.projects.findOne({
      where: { id: projectId },
      relations: ['user'],
    });
    if (!project) throw new Error(`Project ${projectId} not found`);
    // ... rest of the method unchanged (plan gate, stats, aiSummary)
```

- [x] **Step 5: Pass userId from the controller**

In `apps/api/src/modules/digest/digest.controller.ts`:

```typescript
  @UseGuards(JwtAuthGuard)
  @Get('preview/:projectId')
  async preview(@Param('projectId') projectId: string, @Request() req: any) {
    return this.digest.preview(projectId, req.user.id);
  }
```

Add `Request` to the `@nestjs/common` import list.

- [x] **Step 6: Run test to verify it passes**

Run: `pnpm --filter api test -- --testPathPattern=digest.service`
Expected: PASS (2 tests).

- [x] **Step 7: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

```bash
git add apps/api/src/modules/digest/
git commit -m "fix(digest): require project access for digest preview (IDOR)"
```

---

## Task 3: Remove public `POST /digest/trigger`

Any authenticated user can trigger a digest mail-out to **all** users and burn Gemini quota. The web app never calls it (verified: only `/digest/preview` is used in `apps/web/src/lib/queries.ts`). The secured `internal-trigger` (EventBridge + `INTERNAL_SECRET`) stays.

**Files:**
- Modify: `apps/api/src/modules/digest/digest.controller.ts:23-28`

- [x] **Step 1: Delete the endpoint**

Remove this block from `digest.controller.ts`:

```typescript
  @UseGuards(JwtAuthGuard)
  @Post('trigger')
  async trigger() {
    const result = await this.digest.runDigest();
    return { message: 'Digest run complete', ...result };
  }
```

Keep `internal-trigger` untouched.

- [x] **Step 2: Confirm nothing references it**

Run: `grep -rn "digest/trigger" apps/ --include=*.ts --include=*.tsx | grep -v node_modules | grep -v internal-trigger`
Expected: no output.

- [x] **Step 3: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test -- --testPathPattern=digest`
Expected: all pass.

```bash
git add apps/api/src/modules/digest/digest.controller.ts
git commit -m "fix(digest): remove user-triggerable global digest run"
```

---

## Task 4: Global ValidationPipe + DTOs

No request body is validated (except `UpdateTeamDto`). Add global `ValidationPipe` and DTOs for the abuse-prone endpoints: public feedback (unbounded content → DB/Gemini cost), auth (empty passwords), comments, feedback status.

**Files:**
- Modify: `apps/api/package.json` (add deps)
- Modify: `apps/api/src/main.ts`
- Create: `apps/api/src/modules/feedback/dto/create-public-feedback.dto.ts`
- Create: `apps/api/src/modules/feedback/dto/create-feedback.dto.ts`
- Create: `apps/api/src/modules/feedback/dto/update-status.dto.ts`
- Create: `apps/api/src/modules/auth/dto/auth.dto.ts`
- Create: `apps/api/src/modules/comments/dto/create-comment.dto.ts`
- Modify: `apps/api/src/modules/feedback/feedback.public.controller.ts`
- Modify: `apps/api/src/modules/feedback/feedback.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/comments/comments.controller.ts`
- Create: `apps/api/src/modules/feedback/dto/create-public-feedback.dto.spec.ts`

- [x] **Step 1: Install dependencies**

Run: `pnpm --filter api add class-validator class-transformer`
Expected: both added to `apps/api/package.json` dependencies.

- [x] **Step 2: Write the failing DTO test**

Create `apps/api/src/modules/feedback/dto/create-public-feedback.dto.spec.ts`:

```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePublicFeedbackDto } from './create-public-feedback.dto';

describe('CreatePublicFeedbackDto', () => {
  const build = (overrides: Record<string, unknown> = {}) =>
    plainToInstance(CreatePublicFeedbackDto, {
      apiKey: 'key-123',
      content: 'Great product!',
      ...overrides,
    });

  it('accepts a valid payload', async () => {
    expect(await validate(build())).toHaveLength(0);
  });

  it('rejects missing apiKey', async () => {
    const errors = await validate(build({ apiKey: undefined }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty content', async () => {
    const errors = await validate(build({ content: '' }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects content over 5000 chars', async () => {
    const errors = await validate(build({ content: 'x'.repeat(5001) }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-string source', async () => {
    const errors = await validate(build({ source: 123 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [x] **Step 3: Run test to verify it fails**

Run: `pnpm --filter api test -- --testPathPattern=create-public-feedback`
Expected: FAIL — module `./create-public-feedback.dto` not found.

- [x] **Step 4: Create the DTOs**

Create `apps/api/src/modules/feedback/dto/create-public-feedback.dto.ts`:

```typescript
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePublicFeedbackDto {
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
```

Create `apps/api/src/modules/feedback/dto/create-feedback.dto.ts`:

```typescript
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFeedbackDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
```

Create `apps/api/src/modules/feedback/dto/update-status.dto.ts`:

```typescript
import { IsIn } from 'class-validator';

export const FEEDBACK_STATUSES = [
  'New',
  'In Review',
  'In Progress',
  'Done',
  'Rejected',
  'Archived',
] as const;

export class UpdateStatusDto {
  @IsIn(FEEDBACK_STATUSES)
  status: string;
}
```

Create `apps/api/src/modules/auth/dto/auth.dto.ts`:

```typescript
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt input limit
  password: string;
}

// No MinLength here: existing users may have shorter passwords.
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
```

Create `apps/api/src/modules/comments/dto/create-comment.dto.ts`:

```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
```

- [x] **Step 5: Enable the global pipe**

In `apps/api/src/main.ts` add to imports:

```typescript
import { ValidationPipe } from '@nestjs/common';
```

and after `NestFactory.create(...)`:

```typescript
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
```

Note: bodies typed as plain interfaces/`any` are skipped by ValidationPipe — existing endpoints without DTOs keep working unchanged.

- [x] **Step 6: Use DTOs in controllers**

`apps/api/src/modules/feedback/feedback.public.controller.ts` — change the `createPublic` signature (keep the origin/domain logic unchanged):

```typescript
import { CreatePublicFeedbackDto } from './dto/create-public-feedback.dto';
```

```typescript
  async createPublic(
    @Body() body: CreatePublicFeedbackDto,
    @Headers('origin') origin?: string,
  ) {
```

Remove the now-redundant manual check:

```typescript
    if (!body.apiKey || !body.apiKey.trim()) {
      throw new UnauthorizedException('API Key is required');
    }
```

→ replace with nothing (DTO covers it). Keep `UnauthorizedException` import only if still used for the invalid-key branch (it is — keep it).

`apps/api/src/modules/feedback/feedback.controller.ts`:

```typescript
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
```

```typescript
  @Post()
  async create(@Request() req: any, @Body() body: CreateFeedbackDto) {
    return this.feedbackService.create(
      body.projectId,
      body.content,
      req.user.id,
      body.source,
    );
  }
```

(The manual `if (!body?.content || !body?.projectId)` check is deleted — DTO covers it.)

```typescript
  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
  ) {
    return this.feedbackService.updateStatus(id, body.status, req.user.id);
  }
```

`apps/api/src/modules/auth/auth.controller.ts`:

```typescript
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
```

```typescript
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }
```

```typescript
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }
```

```typescript
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
```

```typescript
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
```

(Keep the `@Throttle` decorators on register/login exactly as they are.)

`apps/api/src/modules/comments/comments.controller.ts`:

```typescript
import { CreateCommentDto } from './dto/create-comment.dto';
```

```typescript
  @Post('feedbacks/:feedbackId/comments')
  async create(
    @Param('feedbackId') feedbackId: string,
    @Body() body: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.commentsService.create(feedbackId, req.user.id, body.content);
  }
```

- [x] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter api test -- --testPathPattern=create-public-feedback`
Expected: PASS (5 tests).
Run: `pnpm --filter api test`
Expected: full suite passes (auth.service.spec, feedback.service.spec etc. test services, not controllers — unaffected).

- [x] **Step 8: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

```bash
git add apps/api/src/main.ts apps/api/package.json pnpm-lock.yaml \
  apps/api/src/modules/feedback/ apps/api/src/modules/auth/ \
  apps/api/src/modules/comments/
git commit -m "feat(api): global ValidationPipe + DTOs for feedback, auth, comments"
```

---

## Task 5: Proper 400 instead of 500 in `FeedbackService.create`

`throw new Error('Content is required')` at `apps/api/src/modules/feedback/feedback.service.ts:41-43` produces a 500. Both controllers now validate via DTO, but the service is also called internally — keep the guard, make it a 400.

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.service.ts:1,41-43`

- [x] **Step 1: Replace the exception**

In the imports (line 1):

```typescript
import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
```

Replace:

```typescript
    if (!content) {
      throw new Error('Content is required');
    }
```

with:

```typescript
    if (!content) {
      throw new BadRequestException('Content is required');
    }
```

- [x] **Step 2: Verify and commit**

Run: `pnpm --filter api test -- --testPathPattern=feedback.service && pnpm typecheck && pnpm lint`
Expected: all pass (existing spec does not assert the error type of empty content; if a test does assert `Error`, update it to `BadRequestException`).

```bash
git add apps/api/src/modules/feedback/feedback.service.ts
git commit -m "fix(feedback): return 400 instead of 500 for empty content"
```

---

## Task 6: Scope CORS — API for dashboard only, open CORS only for the widget endpoint

Today every customer's registered domain gets CORS access (with `credentials: true`) to the entire API via a DB-backed whitelist. Only `/feedback/public` needs cross-origin access from customer sites, and it already enforces per-project origin checks internally. The dashboard uses Bearer tokens (no cookies — verified in `apps/web/src/lib/api.ts`), so `credentials` is unnecessary.

**Files:**
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/modules/projects/projects.service.ts:93-96` (remove now-unused `getAllDomains`)

- [x] **Step 1: Replace the CORS setup in main.ts**

Replace the whole block from `const projectsService = app.get(ProjectsService);` through the end of `app.enableCors({...});` (lines 20-65) with a single middleware. Also delete the now-unused imports of `ProjectsService`.

```typescript
  // CORS:
  // - /feedback/public is called from customer sites → allow any origin here;
  //   per-project origin enforcement happens inside FeedbackPublicController.
  // - Everything else is dashboard-only → FRONTEND_URL + localhost.
  // Auth is Bearer-token (no cookies), so no Allow-Credentials needed.
  const frontendUrl = process.env.FRONTEND_URL;
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use((req: any, res: any, next: () => void) => {
    const origin = req.headers.origin as string | undefined;
    if (!origin) return next();

    let allowed = req.path.startsWith('/feedback/public');
    if (!allowed) {
      try {
        const { hostname } = new URL(origin);
        allowed =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          origin === frontendUrl;
      } catch {
        allowed = false;
      }
    }

    if (allowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      );
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
```

Remove the old `app.getHttpAdapter().getInstance().set('trust proxy', 1);` line further down (it moved into the block above) and the `cachedDomains`/`cacheTime` variables.

The resulting `main.ts` should keep: instrument import, Redis adapter, Sentry filter, ValidationPipe (from Task 4), then this CORS middleware, then `app.listen`.

- [x] **Step 2: Remove dead code**

Run: `grep -rn "getAllDomains" apps/ --include=*.ts | grep -v node_modules`
Expected: only the definition in `projects.service.ts`. Delete the `getAllDomains` method (lines 93-96).

- [x] **Step 3: Manual verification**

Start the API (`docker compose up -d` for Postgres/Redis, then `pnpm --filter api dev` — or skip if local infra unavailable and say so). Then:

```bash
# Widget endpoint: arbitrary origin gets CORS headers
curl -s -i -X OPTIONS http://localhost:3001/feedback/public \
  -H "Origin: https://random-customer.com" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
# Expected: Access-Control-Allow-Origin: https://random-customer.com

# Core API: arbitrary origin gets NO CORS headers
curl -s -i -X OPTIONS http://localhost:3001/projects \
  -H "Origin: https://random-customer.com" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control-allow-origin
# Expected: no output

# Core API: frontend origin allowed (assumes FRONTEND_URL or localhost)
curl -s -i -X OPTIONS http://localhost:3001/projects \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" | grep -i access-control-allow-origin
# Expected: Access-Control-Allow-Origin: http://localhost:3000
```

- [x] **Step 4: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm --filter api test`
Expected: all pass.

```bash
git add apps/api/src/main.ts apps/api/src/modules/projects/projects.service.ts
git commit -m "fix(api): scope CORS - open only for widget endpoint, dashboard-only elsewhere"
```

---

## Task 7: Realtime events for teams (and for widget submissions)

`emitFeedbackUpdated` targets a single `user-{id}` room; `updateStatus` emits to the **acting** user, so teammates never get invalidations, and `create()` never emits at all (widget feedback appears only after AI analysis, or never when `aiLevel === 'none'`). Fix: resolve the audience (owner + team members) from the project and emit to each.

**Files:**
- Create: `apps/api/src/modules/events/events.service.ts`
- Create: `apps/api/src/modules/events/events.service.spec.ts`
- Modify: `apps/api/src/modules/events/events.module.ts`
- Modify: `apps/api/src/modules/feedback/feedback.service.ts`
- Modify: `apps/api/src/modules/feedback/feedback.service.spec.ts`
- Modify: `apps/api/src/modules/ai/ai.processor.ts`
- Modify: `apps/api/src/modules/ai/ai.processor.spec.ts`

- [x] **Step 1: Write the failing test for EventsService**

Create `apps/api/src/modules/events/events.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';

describe('EventsService', () => {
  let service: EventsService;
  let projectRepo: any;
  let memberRepo: any;
  let gateway: any;

  beforeEach(async () => {
    projectRepo = { findOne: jest.fn() };
    memberRepo = { find: jest.fn().mockResolvedValue([]) };
    gateway = { emitFeedbackUpdated: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: EventsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('emits to the owner for a personal project', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p1',
      userId: 'owner-1',
      teamId: null,
    });
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledTimes(1);
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledWith('owner-1');
  });

  it('emits to owner and all team members exactly once each', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p1',
      userId: 'owner-1',
      teamId: 'team-1',
    });
    memberRepo.find.mockResolvedValue([
      { userId: 'owner-1' },
      { userId: 'member-2' },
      { userId: 'member-3' },
    ]);
    await service.emitFeedbackUpdatedForProject('p1');
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledTimes(3);
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledWith('member-2');
    expect(gateway.emitFeedbackUpdated).toHaveBeenCalledWith('member-3');
  });

  it('does nothing when project not found', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await service.emitFeedbackUpdatedForProject('missing');
    expect(gateway.emitFeedbackUpdated).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test -- --testPathPattern=events.service`
Expected: FAIL — `./events.service` not found.

- [x] **Step 3: Implement EventsService**

Create `apps/api/src/modules/events/events.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    private gateway: EventsGateway,
  ) {}

  /** Notify the project owner and, for team projects, every team member. */
  async emitFeedbackUpdatedForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;

    const userIds = new Set<string>([project.userId]);
    if (project.teamId) {
      const members = await this.memberRepo.find({
        where: { teamId: project.teamId },
      });
      for (const m of members) userIds.add(m.userId);
    }
    for (const id of userIds) this.gateway.emitFeedbackUpdated(id);
  }
}
```

Update `apps/api/src/modules/events/events.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project, TeamMember } from '@insightstream/database';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Project, TeamMember]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'super_secret_key',
      }),
    }),
  ],
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway, EventsService],
})
export class EventsModule {}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test -- --testPathPattern=events.service`
Expected: PASS (3 tests).

- [x] **Step 5: Use EventsService in FeedbackService**

In `apps/api/src/modules/feedback/feedback.service.ts`:

Replace the import and constructor param:

```typescript
import { EventsService } from '../events/events.service';
```

```typescript
    private eventsService: EventsService,
```

(delete `private eventsGateway: EventsGateway,` and the `EventsGateway` import).

In `create()`, right after `const savedFeedback = await this.feedbackRepository.save(feedback);` add:

```typescript
    await this.eventsService.emitFeedbackUpdatedForProject(projectId);
```

In `updateStatus()` replace:

```typescript
    this.eventsGateway.emitFeedbackUpdated(userId);
```

with:

```typescript
    await this.eventsService.emitFeedbackUpdatedForProject(feedback.projectId);
```

In `bulkArchive()` replace:

```typescript
    this.eventsGateway.emitFeedbackUpdated(userId);
```

with:

```typescript
    await this.eventsService.emitFeedbackUpdatedForProject(projectId);
```

- [x] **Step 6: Use EventsService in AiProcessor**

In `apps/api/src/modules/ai/ai.processor.ts` replace the `EventsGateway` import/injection with:

```typescript
import { EventsService } from '../events/events.service';
```

```typescript
    private readonly eventsService: EventsService,
```

and replace:

```typescript
    this.eventsGateway.emitFeedbackUpdated(ownerId);
```

with:

```typescript
    await this.eventsService.emitFeedbackUpdatedForProject(job.data.projectId);
```

The `ownerId` destructuring at the top of `process()` may become unused — if so, remove `ownerId` from the destructuring (keep it in `AnalysisJobData`; queue payloads are unchanged).

- [x] **Step 7: Update existing specs**

In `apps/api/src/modules/feedback/feedback.service.spec.ts` (no existing test asserts on the gateway — only the wiring changes):
- Line 13: replace `import { EventsGateway } from '../events/events.gateway';` with `import { EventsService } from '../events/events.service';`
- Lines 42-44: replace the mock definition:

```typescript
    const mockEventsService = {
      emitFeedbackUpdatedForProject: jest.fn().mockResolvedValue(undefined),
    };
```

- Provider block: replace `{ provide: EventsGateway, useValue: mockEventsGateway }` with `{ provide: EventsService, useValue: mockEventsService }`.
- Line 101: replace `eventsGateway = module.get(EventsGateway);` with `eventsGateway = module.get(EventsService);` and rename the `let eventsGateway: any;` variable (line 19) to `eventsService` in both places.
- The `create` tests call `service.create(projectId, content)` with no userId; `mockProjectsService.findByOnlyId` already resolves `{ userId: 'user-abc' }`, so the new emit call inside `create()` works against the existing mocks. The `'should throw error if content is missing'` test (line 124) still passes after Task 5 — the message `'Content is required'` is unchanged.

In `apps/api/src/modules/ai/ai.processor.spec.ts`:
- Line 4: replace `import { EventsGateway } from '../events/events.gateway';` with `import { EventsService } from '../events/events.service';`
- Line 14: replace `let eventsGateway: { emitFeedbackUpdated: jest.Mock };` with `let eventsService: { emitFeedbackUpdatedForProject: jest.Mock };`
- Line 19: replace `eventsGateway = { emitFeedbackUpdated: jest.fn() };` with `eventsService = { emitFeedbackUpdatedForProject: jest.fn().mockResolvedValue(undefined) };`
- Line 26: replace `{ provide: EventsGateway, useValue: eventsGateway }` with `{ provide: EventsService, useValue: eventsService }`
- Line 63: replace `expect(eventsGateway.emitFeedbackUpdated).toHaveBeenCalledWith('user-1');` with `expect(eventsService.emitFeedbackUpdatedForProject).toHaveBeenCalledWith('proj-1');`

- [x] **Step 8: Run the full API suite**

Run: `pnpm --filter api test`
Expected: all pass.

- [x] **Step 9: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

```bash
git add apps/api/src/modules/events/ apps/api/src/modules/feedback/ apps/api/src/modules/ai/
git commit -m "fix(events): emit feedback updates to owner and team members, incl. widget submissions"
```

---

## Task 8: Widget — Shadow DOM isolation + configurable API URL

The widget injects full Tailwind (including preflight reset) into the **host page's** `<head>` via `vite-plugin-css-injected-by-js`, breaking customer sites' styles. Fix: render into an open Shadow DOM and inline the compiled CSS via Vite's `?inline` import (works in both dev and build, so the plugin is removed). Also make the API URL a build-time env with the current prod URL as fallback.

Playwright e2e (`apps/e2e/tests/widget/submit-feedback.spec.ts`) uses CSS locators, which pierce **open** shadow roots automatically — no e2e changes needed.

**Files:**
- Modify: `apps/widget/src/main.tsx`
- Modify: `apps/widget/vite.config.ts`
- Modify: `apps/widget/src/App.tsx:36-38`
- Modify: `apps/widget/package.json` (remove plugin dep)

- [x] **Step 1: Render into Shadow DOM with inlined CSS**

Replace the full contents of `apps/widget/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// ?inline returns the compiled CSS as a string instead of injecting it
// into the host document — required for Shadow DOM isolation.
import cssText from "./index.css?inline";
import App from "./App.tsx";

const initWidget = () => {
  const WIDGET_ID = "insight-stream-widget-root";
  if (document.getElementById(WIDGET_ID)) return;

  const host = document.createElement("div");
  host.id = WIDGET_ID;
  document.body.appendChild(host);

  // Open mode so customer devtools and our Playwright e2e can reach inside.
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  const container = document.createElement("div");
  shadow.appendChild(container);

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// Handle late loading or direct execution
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  initWidget();
} else {
  window.addEventListener("DOMContentLoaded", initWidget);
}
```

Check that `apps/widget/src/vite-env.d.ts` exists and contains `/// <reference types="vite/client" />` (it types `*.css?inline` imports and `import.meta.env`). If the file is missing, create it with exactly that line.

- [x] **Step 2: Remove the CSS-injection plugin**

Replace the full contents of `apps/widget/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "InsightStream",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
```

Run: `pnpm --filter widget remove vite-plugin-css-injected-by-js`

- [x] **Step 3: Env-configurable API URL**

In `apps/widget/src/App.tsx` replace:

```typescript
      const apiUrl =
        window.InsightStreamConfig?.apiUrl ||
        "https://api-production-05c4.up.railway.app";
```

with:

```typescript
      const apiUrl =
        window.InsightStreamConfig?.apiUrl ||
        import.meta.env.VITE_API_URL ||
        "https://api-production-05c4.up.railway.app";
```

(Runtime config still wins; `VITE_API_URL` lets CI bake the AWS URL when the migration lands; the Railway URL stays as the last-resort fallback so existing embeds keep working.)

- [x] **Step 4: Build and verify isolation manually**

Run: `pnpm --filter widget build`
Expected: build succeeds, `apps/widget/dist/widget.iife.js` produced, and **no** separate `.css` asset that requires manual inclusion (CSS is inside the JS string).

Then verify with the existing `apps/widget/test.html` (read it first; it loads the built IIFE). Add a temporary style probe to confirm preflight no longer leaks — open `test.html` in a browser (`pnpm --filter widget preview` or open the file directly) and check:
1. An `<h1>` added to the host page keeps its default browser margin/size (preflight not applied globally).
2. The widget trigger button renders styled (CSS applied inside shadow root).
3. Open → type → the form renders correctly.

If no browser automation is available, state so and verify via DOM inspection that `document.getElementById('insight-stream-widget-root').shadowRoot` contains a `<style>` and the app markup, and `document.head` contains no Tailwind styles from the widget.

- [x] **Step 5: Run widget e2e if infra available**

If local API + web can run: `pnpm --filter e2e test -- --grep "Widget"` (check exact script name in `apps/e2e/package.json` first).
Expected: `open → fill → submit → shows success state` passes (open shadow roots are pierced by Playwright CSS locators).
If infra is unavailable, state that explicitly in the task report.

- [x] **Step 6: Verify and commit**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

```bash
git add apps/widget/ pnpm-lock.yaml
git commit -m "fix(widget): isolate styles in Shadow DOM, stop leaking Tailwind preflight into host pages"
```

---

## Final Verification (after all tasks)

- [x] Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
- [x] Expected: everything green. Report actual output, not a summary claim.
  - Verified: `pnpm typecheck` 7/7, `pnpm lint` 0 errors/351 pre-existing warnings, `pnpm --filter api test` 14 suites/73 tests passed, `pnpm build` 6/6 (widget produces a single `dist/widget.iife.js`, no separate CSS asset). Final holistic code review: "Ready to merge."
- [ ] Manual smoke (if infra available): register → create project → submit widget feedback from `test.html` → see it appear in dashboard feed without refresh (Task 7) → open digest preview for own project (200) and a foreign UUID (404).
  - Not performed — requires a live signup/login flow against local Postgres/Redis with real cookies/tokens, beyond automated verification in this session. Individual pieces were verified in isolation instead: Task 8's widget Shadow DOM was verified live via headless Playwright against `test.html`; Task 2's digest-preview IDOR fix has a passing unit test asserting NotFoundException for inaccessible projects. Recommend a manual pass before production deploy.

## Follow-ups (not fixed in this branch, deliberately out of scope)

- `apps/web/public/widget.js` is a stale, pre-Shadow-DOM widget build artifact (references `vite-plugin-css-injected-by-js`). Confirmed dead — nothing in `apps/web/src` or CI references it; the real embed snippet points at the deployed widget dist via `NEXT_PUBLIC_WIDGET_URL`. Safe to delete in a follow-up cleanup.
- 7 endpoints across `invitations.controller.ts`, `projects.controller.ts`, `stripe.controller.ts`, `teams.controller.ts` use inline `@Body() body: { ... }` object-literal types that bypass the new global `ValidationPipe` entirely (zero validation, though also zero whitelist-stripping risk since they aren't classes). Worth a follow-up task converting them to proper DTO classes for consistency with Task 4's rollout.
- `EventsService.emitFeedbackUpdatedForProject` does its own `Project` lookup on every call; `FeedbackService.create()`'s widget path also separately re-fetches the project for `ownerId`/AI-level resolution — two DB round-trips to the same row on the highest-QPS endpoint in the app. Consider passing an already-loaded project/owner through instead of re-fetching, if this becomes a measured bottleneck.
- `AnalysisJobData.ownerId` is now an unused field (kept for in-flight BullMQ job payload compatibility across the deploy that lands this branch). Safe to remove after one full deploy cycle with no in-flight jobs from the old shape.

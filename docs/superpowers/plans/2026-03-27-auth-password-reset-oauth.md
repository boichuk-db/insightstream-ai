# Auth: Password Reset + OAuth (Google & GitHub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password reset flow and Google/GitHub OAuth login to the existing JWT-based auth system.

**Architecture:** Backend adds 2 Passport OAuth strategies + 4 new endpoints + password reset logic in `AuthService`/`UsersService`. Frontend adds 3 new pages (`forgot-password`, `reset-password`, `oauth/callback`) and updates the root auth page with OAuth buttons and a "Forgot password?" link. OAuth users are auto-linked by email to existing accounts.

**Tech Stack:** NestJS Passport strategies (`passport-google-oauth20`, `passport-github2`), TypeORM entity extension, existing `MailService` (Nodemailer), Next.js 16 App Router, TanStack Query v5.

> **⚠️ Next.js note:** Before writing any frontend code, check `node_modules/next/dist/docs/` for breaking changes. Use `useRouter` from `next/navigation`, `useSearchParams` from `next/navigation`.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `apps/api/src/modules/auth/google.strategy.ts` | Passport Google OAuth2 strategy |
| `apps/api/src/modules/auth/github.strategy.ts` | Passport GitHub OAuth2 strategy |
| `apps/web/src/app/auth/forgot-password/page.tsx` | Email input form → send reset link |
| `apps/web/src/app/auth/reset-password/page.tsx` | New password form → consumes reset token |
| `apps/web/src/app/auth/oauth/callback/page.tsx` | Extracts JWT from URL, stores, redirects |

### Modified files
| File | What changes |
|------|-------------|
| `packages/database/src/entities/user.entity.ts` | 5 new nullable fields |
| `apps/api/src/modules/users/users.service.ts` | 5 new query/update methods |
| `apps/api/src/modules/mail/mail.service.ts` | `sendPasswordReset()` method |
| `apps/api/src/modules/auth/auth.service.ts` | `forgotPassword()`, `resetPassword()`, `oauthLogin()`, fix `validateUser()` |
| `apps/api/src/modules/auth/auth.controller.ts` | 4 new endpoints |
| `apps/api/src/modules/auth/auth.module.ts` | Register Google + GitHub strategies |
| `apps/web/src/app/page.tsx` | OAuth buttons + "Forgot password?" link |

---

## Task 1: Install OAuth Dependencies

**Files:**
- Modify: `apps/api/package.json` (via pnpm)

- [ ] **Step 1: Install passport OAuth packages**

Run from repo root:
```bash
pnpm add passport-google-oauth20 passport-github2 --filter api
pnpm add -D @types/passport-google-oauth20 @types/passport-github2 --filter api
```

Expected output: packages added to `apps/api/node_modules`, `apps/api/package.json` updated.

- [ ] **Step 2: Verify install**

```bash
cat apps/api/package.json | grep -E "passport-google|passport-github"
```

Expected:
```
"passport-github2": "^...",
"passport-google-oauth20": "^...",
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add passport-google-oauth20 and passport-github2"
```

---

## Task 2: Extend User Entity

**Files:**
- Modify: `packages/database/src/entities/user.entity.ts`

> In dev, `TYPEORM_SYNCHRONIZE=true` auto-applies entity changes. No migration file needed for development. Production requires a migration — see roadmap task "TypeORM migrations".

- [ ] **Step 1: Update `user.entity.ts`**

Replace the entire file content:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import type { Project } from './project.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  passwordHash: string | null;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Column({ type: 'varchar', length: 20, default: 'FREE' })
  plan: string;

  @Column({ type: 'timestamp', nullable: true })
  planUpdatedAt: Date | null;

  @Column({ type: 'varchar', unique: true, nullable: true, default: null })
  apiKey: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true, default: null })
  googleId: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true, default: null })
  githubId: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  resetPwdToken: string | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  resetPwdExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('Project', (project: Project) => project.user)
  projects: Project[];
}
```

- [ ] **Step 2: Restart API to apply schema sync**

```bash
pnpm dev --filter api
```

Watch logs — should see TypeORM `ALTER TABLE` statements for the new columns. No error = success.

- [ ] **Step 3: Commit**

```bash
git add packages/database/src/entities/user.entity.ts
git commit -m "feat(db): add OAuth and password reset fields to User entity"
```

---

## Task 3: Extend UsersService

**Files:**
- Modify: `apps/api/src/modules/users/users.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/users/users.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@insightstream/database';
import { UsersService } from './users.service';

const mockRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

describe('UsersService — new auth methods', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('findByResetToken returns user when token matches', async () => {
    const user = { id: '1', resetPwdToken: 'abc' } as User;
    mockRepo.findOne.mockResolvedValue(user);
    const result = await service.findByResetToken('abc');
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { resetPwdToken: 'abc' } });
    expect(result).toBe(user);
  });

  it('findByResetToken returns null when no match', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    expect(await service.findByResetToken('nope')).toBeNull();
  });

  it('findByGoogleId queries by googleId', async () => {
    const user = { id: '1', googleId: 'g123' } as User;
    mockRepo.findOne.mockResolvedValue(user);
    const result = await service.findByGoogleId('g123');
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { googleId: 'g123' } });
    expect(result).toBe(user);
  });

  it('findByGithubId queries by githubId', async () => {
    const user = { id: '1', githubId: 'gh456' } as User;
    mockRepo.findOne.mockResolvedValue(user);
    await service.findByGithubId('gh456');
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { githubId: 'gh456' } });
  });

  it('save calls repository.save', async () => {
    const user = { id: '1' } as User;
    mockRepo.save.mockResolvedValue(user);
    await service.save(user);
    expect(mockRepo.save).toHaveBeenCalledWith(user);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/api && pnpm test --testPathPattern=users.service.spec
```

Expected: FAIL — `service.findByResetToken is not a function`

- [ ] **Step 3: Implement new methods in `users.service.ts`**

Add these methods to the `UsersService` class (keep all existing methods):

```typescript
async findByResetToken(token: string): Promise<User | null> {
  return this.usersRepository.findOne({ where: { resetPwdToken: token } });
}

async findByGoogleId(googleId: string): Promise<User | null> {
  return this.usersRepository.findOne({ where: { googleId } });
}

async findByGithubId(githubId: string): Promise<User | null> {
  return this.usersRepository.findOne({ where: { githubId } });
}

async save(user: User): Promise<User> {
  return this.usersRepository.save(user);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd apps/api && pnpm test --testPathPattern=users.service.spec
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/users/users.service.ts apps/api/src/modules/users/users.service.spec.ts
git commit -m "feat(users): add findByResetToken, findByGoogleId, findByGithubId, save methods"
```

---

## Task 4: Add `sendPasswordReset` to MailService

**Files:**
- Modify: `apps/api/src/modules/mail/mail.service.ts`

- [ ] **Step 1: Add `sendPasswordReset` method**

Append the following method to the `MailService` class (before the closing `}`):

```typescript
async sendPasswordReset(to: string, token: string): Promise<void> {
  const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="margin-bottom:8px">Reset your password</h2>
      <p style="color:#6b7280;margin-bottom:24px">
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;
                border-radius:8px;text-decoration:none;font-weight:600">
        Reset Password
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
  await this.send(to, 'Reset your InsightStream password', html);
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/api && pnpm build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/mail/mail.service.ts
git commit -m "feat(mail): add sendPasswordReset method"
```

---

## Task 5: AuthService — Password Reset Methods

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/auth/auth.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { MailService } from '../mail/mail.service';

const mockUsersService = {
  findOneByEmail: jest.fn(),
  findByResetToken: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const mockTeamsService = { createPersonalTeam: jest.fn() };
const mockJwtService = { sign: jest.fn().mockReturnValue('signed-token') };
const mockMailService = { sendPasswordReset: jest.fn() };

describe('AuthService — password reset', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    it('sends reset email when user exists', async () => {
      const user = { id: '1', email: 'a@b.com', passwordHash: 'hash' } as any;
      mockUsersService.findOneByEmail.mockResolvedValue(user);
      mockUsersService.save.mockResolvedValue(user);

      await service.forgotPassword('a@b.com');

      expect(mockUsersService.save).toHaveBeenCalled();
      expect(mockMailService.sendPasswordReset).toHaveBeenCalledWith(
        'a@b.com',
        expect.any(String),
      );
    });

    it('returns silently when user not found (no leak)', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('nope@x.com')).resolves.toBeUndefined();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('returns silently for OAuth-only user (no passwordHash)', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue({ id: '1', passwordHash: null });
      await expect(service.forgotPassword('oauth@x.com')).resolves.toBeUndefined();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('updates password and clears token when valid', async () => {
      const future = new Date(Date.now() + 3600_000);
      const user = { id: '1', resetPwdToken: 'tok', resetPwdExpires: future, passwordHash: 'old' } as any;
      mockUsersService.findByResetToken.mockResolvedValue(user);
      mockUsersService.save.mockResolvedValue(user);

      await service.resetPassword('tok', 'newPass123');

      const savedUser = mockUsersService.save.mock.calls[0][0];
      expect(savedUser.resetPwdToken).toBeNull();
      expect(savedUser.resetPwdExpires).toBeNull();
      expect(savedUser.passwordHash).not.toBe('old');
    });

    it('throws BadRequestException when token not found', async () => {
      mockUsersService.findByResetToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad', 'pass')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token expired', async () => {
      const past = new Date(Date.now() - 1000);
      mockUsersService.findByResetToken.mockResolvedValue({
        resetPwdToken: 'tok', resetPwdExpires: past,
      });
      await expect(service.resetPassword('tok', 'pass')).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: FAIL — `service.forgotPassword is not a function`

- [ ] **Step 3: Implement `forgotPassword` and `resetPassword` in `auth.service.ts`**

Replace the entire file:

```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private teamsService: TeamsService,
    private mailService: MailService,
  ) {}

  async register(email: string, pass: string) {
    const existing = await this.usersService.findOneByEmail(email);
    if (existing) {
      throw new ConflictException('User already exists');
    }
    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.usersService.create({ email, passwordHash });
    await this.teamsService.createPersonalTeam(user.id);
    return this.login(user);
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, plan: user.plan };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, plan: user.plan },
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);
    // Silently return if not found or OAuth-only (no password set)
    if (!user || !user.passwordHash) return;

    user.resetPwdToken = crypto.randomUUID();
    user.resetPwdExpires = new Date(Date.now() + 3_600_000); // 1 hour
    await this.usersService.save(user);
    await this.mailService.sendPasswordReset(email, user.resetPwdToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (!user.resetPwdExpires || user.resetPwdExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPwdToken = null;
    user.resetPwdExpires = null;
    await this.usersService.save(user);
  }

  async oauthLogin(profile: { email: string; googleId?: string; githubId?: string }) {
    const { email, googleId, githubId } = profile;

    // 1. Find by provider ID (returning user)
    let user = googleId
      ? await this.usersService.findByGoogleId(googleId)
      : await this.usersService.findByGithubId(githubId!);

    // 2. Auto-link: find by email (existing email/password account)
    if (!user) {
      user = await this.usersService.findOneByEmail(email);
      if (user) {
        if (googleId) user.googleId = googleId;
        if (githubId) user.githubId = githubId;
        await this.usersService.save(user);
      }
    }

    // 3. Create new user
    if (!user) {
      user = await this.usersService.create({
        email,
        passwordHash: null,
        googleId: googleId ?? null,
        githubId: githubId ?? null,
      });
      await this.teamsService.createPersonalTeam(user.id);
    }

    return this.login(user);
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd apps/api && pnpm test --testPathPattern=auth.service.spec
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "feat(auth): add forgotPassword, resetPassword, oauthLogin methods"
```

---

## Task 6: Create Google Strategy

**Files:**
- Create: `apps/api/src/modules/auth/google.strategy.ts`

- [ ] **Step 1: Create `google.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: `${config.get<string>('API_URL') || 'http://localhost:3001'}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('No email returned from Google'), undefined);
      return;
    }
    done(null, { email, googleId: profile.id });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/api && pnpm build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/google.strategy.ts
git commit -m "feat(auth): add Google OAuth2 Passport strategy"
```

---

## Task 7: Create GitHub Strategy

**Files:**
- Create: `apps/api/src/modules/auth/github.strategy.ts`

- [ ] **Step 1: Create `github.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || '',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || '',
      callbackURL: `${config.get<string>('API_URL') || 'http://localhost:3001'}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    const email =
      profile.emails?.find((e: any) => e.primary)?.value ??
      profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('No email returned from GitHub'), undefined);
      return;
    }
    done(null, { email, githubId: profile.id });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/api && pnpm build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/github.strategy.ts
git commit -m "feat(auth): add GitHub OAuth2 Passport strategy"
```

---

## Task 8: Update AuthController + AuthModule

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Replace `auth.controller.ts`**

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { message: 'Password updated successfully.' };
  }

  // ── Google OAuth ──────────────────────────────────────────
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const { access_token } = await this.authService.oauthLogin(req.user);
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/oauth/callback?token=${access_token}`);
  }

  // ── GitHub OAuth ──────────────────────────────────────────
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Passport redirects to GitHub — no body needed
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: any) {
    const { access_token } = await this.authService.oauthLogin(req.user);
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/oauth/callback?token=${access_token}`);
  }
}
```

- [ ] **Step 2: Replace `auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { MailModule } from '../mail/mail.module';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { GitHubStrategy } from './github.strategy';

@Module({
  imports: [
    UsersModule,
    TeamsModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'super_secret_key',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GitHubStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 3: Check MailModule is exported**

```bash
grep -n "exports" apps/api/src/modules/mail/mail.module.ts
```

If `MailService` is not in `exports`, add it:
```typescript
// In mail.module.ts, ensure:
exports: [MailService],
```

- [ ] **Step 4: Build to verify no errors**

```bash
cd apps/api && pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts apps/api/src/modules/auth/auth.module.ts apps/api/src/modules/mail/mail.module.ts
git commit -m "feat(auth): wire up OAuth endpoints and password reset in controller + module"
```

---

## Task 9: Add env vars + smoke test backend endpoints

**Files:**
- Modify: `.env` (local, not committed)

- [ ] **Step 1: Add env vars to `.env`**

```bash
# Add to apps/api/.env or root .env (wherever your local dev env is):
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
API_URL=http://localhost:3001
```

> To get Google credentials: https://console.cloud.google.com → Create OAuth 2.0 Client → Web application → Authorised redirect URIs: `http://localhost:3001/auth/google/callback`
>
> To get GitHub credentials: https://github.com/settings/developers → New OAuth App → Callback URL: `http://localhost:3001/auth/github/callback`

- [ ] **Step 2: Start API and test password reset endpoints**

```bash
pnpm dev --filter api
```

In a new terminal:
```bash
# Test forgot-password (always returns 200)
curl -s -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com"}' | jq .
```

Expected: `{ "message": "If that email exists, a reset link has been sent." }`

```bash
# Test reset-password with invalid token
curl -s -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"badtoken","newPassword":"newpass123"}' | jq .
```

Expected: `{ "statusCode": 400, "message": "Invalid or expired reset token" }`

---

## Task 10: Frontend — Forgot Password Page

**Files:**
- Create: `apps/web/src/app/auth/forgot-password/page.tsx`

- [ ] **Step 1: Create the directory and page**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Sparkles } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/forgot-password', { email });
    },
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-white font-medium">
          <Sparkles className="text-indigo-400" />
          <span>InsightStream AI</span>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Check your inbox</h2>
            <p className="text-zinc-400">
              If an account with <strong>{email}</strong> exists, we&apos;ve sent a reset link. Check your spam folder too.
            </p>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Forgot your password?</h2>
              <p className="text-zinc-400 text-sm">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 ml-1">Email</label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              {mutation.isError && (
                <p className="text-red-400 text-sm">
                  Something went wrong. Please try again.
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={mutation.isPending}
              >
                Send reset link
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-500">
              <Link href="/" className="text-indigo-400 hover:text-indigo-300">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify page loads**

```bash
pnpm dev --filter web
```

Open `http://localhost:3000/auth/forgot-password` — should show the form.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/auth/forgot-password/page.tsx
git commit -m "feat(web): add forgot-password page"
```

---

## Task 11: Frontend — Reset Password Page

**Files:**
- Create: `apps/web/src/app/auth/reset-password/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Sparkles } from 'lucide-react';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientError, setClientError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/reset-password', { token, newPassword });
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => router.push('/?reset=success'), 2000);
    },
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Invalid link</h2>
        <p className="text-zinc-400">This reset link is missing a token.</p>
        <Link href="/auth/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm">
          Request a new reset link →
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Password updated!</h2>
        <p className="text-zinc-400">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Set a new password</h2>
        <p className="text-zinc-400 text-sm">Must be at least 8 characters.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setClientError('');
          if (newPassword.length < 8) {
            setClientError('Password must be at least 8 characters.');
            return;
          }
          if (newPassword !== confirm) {
            setClientError('Passwords do not match.');
            return;
          }
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">New password</label>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Confirm password</label>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          </div>
        </div>

        {(clientError || mutation.isError) && (
          <p className="text-red-400 text-sm">
            {clientError ||
              ((mutation.error as any)?.response?.data?.message ?? 'This link has expired. Please request a new one.')}
          </p>
        )}

        {mutation.isError && !clientError && (
          <Link href="/auth/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm block">
            Request a new reset link →
          </Link>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={mutation.isPending}
        >
          Update password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-white font-medium">
          <Sparkles className="text-indigo-400" />
          <span>InsightStream AI</span>
        </div>
        <Suspense fallback={<p className="text-zinc-400">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
```

> `useSearchParams` must be wrapped in `<Suspense>` in Next.js App Router — that's why `ResetPasswordForm` is extracted as a separate component.

- [ ] **Step 2: Verify page loads**

Open `http://localhost:3000/auth/reset-password?token=test` — should show the form.
Open `http://localhost:3000/auth/reset-password` (no token) — should show "Invalid link".

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/auth/reset-password/page.tsx
git commit -m "feat(web): add reset-password page"
```

---

## Task 12: Frontend — OAuth Callback Page

**Files:**
- Create: `apps/web/src/app/auth/oauth/callback/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OAuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      localStorage.setItem('access_token', token);
      router.replace('/dashboard');
    } else {
      // OAuth failed — redirect with error message
      router.replace(`/?error=${error ?? 'oauth_failed'}`);
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400 animate-pulse">Signing you in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading…</p>
      </div>
    }>
      <OAuthCallbackHandler />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/auth/oauth/callback/page.tsx
git commit -m "feat(web): add OAuth callback page (stores JWT, redirects to dashboard)"
```

---

## Task 13: Update Root Auth Page

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Add OAuth buttons and "Forgot password?" link**

Replace the entire `apps/web/src/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Suspense } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show OAuth error if redirected back from failed OAuth
  const oauthError = searchParams.get('error');

  const authMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      return data;
    },
    onSuccess: (data) => {
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        router.push('/dashboard');
      } else if (!isLogin) {
        setIsLogin(true);
        setPassword('');
      }
    },
    onError: (error: any) => {
      const serverMsg = error.response?.data?.message;
      if (typeof serverMsg === 'string') {
        setErrorMsg(serverMsg);
      } else if (Array.isArray(serverMsg)) {
        setErrorMsg(serverMsg[0]);
      } else {
        setErrorMsg(
          isLogin ? 'Invalid email or password.' : 'Failed to create account. User might already exist.',
        );
      }
    },
  });

  return (
    <div className="w-full max-w-sm mx-auto relative z-10">
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p className="text-zinc-400">
          {isLogin
            ? 'Enter your credentials to access your dashboard.'
            : 'Sign up to start analyzing feedback with AI.'}
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="space-y-3 mb-6">
        <a
          href={`${API_URL}/auth/google`}
          className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <a
          href={`${API_URL}/auth/github`}
          className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors text-sm font-medium text-zinc-200"
        >
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
          Continue with GitHub
        </a>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950 px-2 text-zinc-500">or</span>
        </div>
      </div>

      {(oauthError || errorMsg) && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded text-red-400 text-sm text-center">
          {oauthError === 'oauth_failed'
            ? 'OAuth sign-in failed. Please try again.'
            : oauthError === 'no_email'
            ? 'Your OAuth account has no public email. Please use email/password.'
            : errorMsg}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          authMutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Email</label>
          <div className="relative">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-zinc-300 ml-1">Password</label>
            {isLogin && (
              <Link
                href="/auth/forgot-password"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-6"
          isLoading={authMutation.isPending}
        >
          {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-500">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors focus:outline-none"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Product showcase */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-zinc-900 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen translate-x-1/2 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[100px] mix-blend-screen -translate-x-1/4 translate-y-1/4 pointer-events-none" />
        <div className="relative z-10 text-white font-medium flex items-center gap-2 text-xl">
          <Sparkles className="text-indigo-400" /> InsightStream AI
        </div>
        <div className="relative z-10 max-w-lg mt-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl font-bold font-sans tracking-tight mb-6"
          >
            Turn every feedback into actionable insights.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-zinc-400 text-lg sm:text-xl leading-relaxed"
          >
            A powerful, AI-driven platform for collecting, analyzing, and acting upon user feedback at scale.
          </motion.p>
        </div>
        <div className="relative z-10 mt-12 text-sm text-brand-muted">
          © {new Date().getFullYear()} InsightStream. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative bg-zinc-950">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] mix-blend-screen translate-x-1/2 -translate-y-1/4 pointer-events-none lg:hidden" />
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test locally**

Open `http://localhost:3000` — verify:
- Google and GitHub buttons appear
- "Forgot password?" link visible in login mode
- "Forgot password?" hidden in register mode
- Email/password form still works

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): add OAuth buttons and forgot password link to auth page"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - ✅ User entity: `passwordHash` nullable, `googleId`, `githubId`, `resetPwdToken`, `resetPwdExpires`
  - ✅ `POST /auth/forgot-password` — silent 200 for unknown/OAuth-only email
  - ✅ `POST /auth/reset-password` — validates token + expiry, clears token after use
  - ✅ Email template via existing `MailService`
  - ✅ `GET /auth/google` + `GET /auth/google/callback`
  - ✅ `GET /auth/github` + `GET /auth/github/callback`
  - ✅ `oauthLogin`: find by ID → find by email (auto-link) → create new
  - ✅ OAuth callback: redirect to `/auth/oauth/callback?token=xxx`
  - ✅ Frontend: `/auth/forgot-password`, `/auth/reset-password`, `/auth/oauth/callback`
  - ✅ Frontend root page: OAuth buttons + "Forgot password?" link

- [x] **Type consistency:** `oauthLogin` accepts `{ email, googleId?, githubId? }` — used consistently in controller and strategy `validate()` return values.

- [x] **`useSearchParams` wrapped in `<Suspense>`** in both reset-password and oauth-callback pages.

- [x] **`validateUser` handles null `passwordHash`** — OAuth users trying password login get `null` (unauthorized) correctly.

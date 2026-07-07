# Edit Project (Rename + Domain Change) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a team ADMIN/OWNER rename a project and change its whitelisted domain via `PATCH /projects/:id`, exposed through a new "Edit project…" modal in the dashboard sidebar — closing the 🔴 product-backlog gap where a domain change today requires deleting the project and losing all its feedback.

**Architecture:** A new `UpdateProjectDto` (partial, hostname-validated `domain`, no-clear semantics) feeds a new `ProjectsService.update()` method that reuses the existing `findOne` + manual ADMIN-role-check pattern already used by `remove()`. `ProjectsController` gets a thin `@Patch(':id')` handler. On the web side, a new `EditProjectModal` (styled like the existing `CreateProjectModal`) is wired into `Sidebar.tsx`'s per-project dropdown next to "Delete project…".

**Tech Stack:** NestJS 11, TypeORM, class-validator/class-transformer, Jest (`ts-jest`), Next.js 16 / React 19, TanStack Query 5, axios.

**Design doc:** `docs/superpowers/specs/2026-07-07-edit-project-rename-domain-design.md`

---

### Task 1: `UpdateProjectDto` with hostname validation

**Files:**
- Create: `apps/api/src/modules/projects/dto/update-project.dto.ts`
- Test: `apps/api/src/modules/projects/dto/update-project.dto.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/projects/dto/update-project.dto.spec.ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProjectDto } from './update-project.dto';

async function validateDto(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateProjectDto, payload);
  return validate(dto);
}

describe('UpdateProjectDto', () => {
  it('accepts a name-only update', async () => {
    const errors = await validateDto({ name: 'Renamed Project' });
    expect(errors).toHaveLength(0);
  });

  it('accepts a domain-only update with a plain hostname', async () => {
    const errors = await validateDto({ domain: 'my-app.com' });
    expect(errors).toHaveLength(0);
  });

  it('accepts a single-label hostname like localhost', async () => {
    const errors = await validateDto({ domain: 'localhost' });
    expect(errors).toHaveLength(0);
  });

  it('accepts both fields together', async () => {
    const errors = await validateDto({ name: 'X', domain: 'x.com' });
    expect(errors).toHaveLength(0);
  });

  it('accepts an empty payload (service enforces "at least one field")', async () => {
    const errors = await validateDto({});
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty-string name', async () => {
    const errors = await validateDto({ name: '' });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('rejects an empty-string domain', async () => {
    const errors = await validateDto({ domain: '' });
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('rejects a domain with a protocol', async () => {
    const errors = await validateDto({ domain: 'https://my-app.com' });
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('rejects a domain with a path', async () => {
    const errors = await validateDto({ domain: 'my-app.com/path' });
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('rejects a name over 100 characters', async () => {
    const errors = await validateDto({ name: 'a'.repeat(101) });
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/api && pnpm test -- update-project.dto.spec.ts`
Expected: FAIL — `Cannot find module './update-project.dto'`

- [ ] **Step 3: Write the DTO**

```ts
// apps/api/src/modules/projects/dto/update-project.dto.ts
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const HOSTNAME_PATTERN =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(HOSTNAME_PATTERN, {
    message: 'domain must be a valid hostname (no protocol or path)',
  })
  domain?: string;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/api && pnpm test -- update-project.dto.spec.ts`
Expected: PASS — 10 tests passed

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/projects/dto/update-project.dto.ts apps/api/src/modules/projects/dto/update-project.dto.spec.ts
git commit -m "feat(api): add UpdateProjectDto with hostname-validated domain"
```

---

### Task 2: `ProjectsService.update()`

**Files:**
- Modify: `apps/api/src/modules/projects/projects.service.ts`
- Test: `apps/api/src/modules/projects/projects.service.spec.ts` (new file — no existing spec for this service)

- [ ] **Step 1: Write the failing tests**

```ts
// apps/api/src/modules/projects/projects.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Project, Team, TeamMember, TeamRole } from '@insightstream/database';
import { ProjectsService } from './projects.service';
import { PlanLimitsService } from '../plans/plan-limits.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectRepo: any;
  let memberRepo: any;
  let teamRepo: any;

  beforeEach(async () => {
    projectRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      remove: jest.fn(),
    };
    memberRepo = { findOne: jest.fn() };
    teamRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        {
          provide: PlanLimitsService,
          useValue: {
            canCreateProject: jest.fn(),
            getTeamPlan: jest.fn(),
            assertAllowed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  describe('update', () => {
    const project = { id: 'p1', name: 'Old Name', domain: 'old.com', teamId: 'team-1' };

    it('updates only the name when only name is provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      const result = await service.update('p1', 'user-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.domain).toBe('old.com');
      expect(projectRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name', domain: 'old.com' }),
      );
    });

    it('updates only the domain when only domain is provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      const result = await service.update('p1', 'user-1', { domain: 'new.com' });

      expect(result.name).toBe('Old Name');
      expect(result.domain).toBe('new.com');
    });

    it('updates both name and domain when both are provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      const result = await service.update('p1', 'user-1', {
        name: 'New Name',
        domain: 'new.com',
      });

      expect(result.name).toBe('New Name');
      expect(result.domain).toBe('new.com');
    });

    it('throws NotFoundException when the caller is not a member of the project team', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('p1', 'stranger', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is a member below ADMIN', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne
        .mockResolvedValueOnce({ id: 'm1', role: TeamRole.MEMBER }) // findOne()'s membership check
        .mockResolvedValueOnce({ id: 'm1', role: TeamRole.MEMBER }); // update()'s role check

      await expect(
        service.update('p1', 'member-1', { name: 'New Name' }),
      ).rejects.toThrow(ForbiddenException);
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when neither name nor domain is provided', async () => {
      projectRepo.findOne.mockResolvedValue({ ...project });
      memberRepo.findOne.mockResolvedValue({ id: 'm1', role: TeamRole.ADMIN });

      await expect(service.update('p1', 'user-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the project does not exist', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing', 'user-1', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/api && pnpm test -- projects.service.spec.ts`
Expected: FAIL — `service.update is not a function`

- [ ] **Step 3: Implement `update()`**

In `apps/api/src/modules/projects/projects.service.ts`, add the import and method.

Modify the top-level import block (`apps/api/src/modules/projects/projects.service.ts:1-17`) to add the DTO import:

```ts
import { PlanLimitsService } from '../plans/plan-limits.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import * as crypto from 'crypto';
```

Add the method right after `findOne` (`apps/api/src/modules/projects/projects.service.ts:106`, directly before `findByApiKey`):

```ts
  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id, userId);
    const member = await this.memberRepo.findOne({
      where: { teamId: project.teamId, userId },
    });
    if (!member || !hasMinRole(member.role, TeamRole.ADMIN)) {
      throw new ForbiddenException('Requires admin role in this team');
    }

    if (dto.name === undefined && dto.domain === undefined) {
      throw new BadRequestException(
        'At least one of name or domain must be provided',
      );
    }

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.domain !== undefined) project.domain = dto.domain;

    return this.projectsRepository.save(project);
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && pnpm test -- projects.service.spec.ts`
Expected: PASS — 7 tests passed

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/projects/projects.service.ts apps/api/src/modules/projects/projects.service.spec.ts
git commit -m "feat(api): add ProjectsService.update for rename/domain change"
```

---

### Task 3: `PATCH /projects/:id` route

**Files:**
- Modify: `apps/api/src/modules/projects/projects.controller.ts`

No new test file — this codebase has no controller-level spec files for any domain module (only the Nest-generated `app.controller.spec.ts` boilerplate exists), so this task follows that existing convention. Verified manually in Task 6.

- [ ] **Step 1: Add `Patch` to the imports and wire the route**

Replace the top of `apps/api/src/modules/projects/projects.controller.ts` (lines 1-14):

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { UpdateProjectDto } from './dto/update-project.dto';
```

Add the handler directly after `findOne` (`apps/api/src/modules/projects/projects.controller.ts:35-38`, before `remove`):

```ts
  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, req.user.id, body);
  }
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/api && pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/projects/projects.controller.ts
git commit -m "feat(api): expose PATCH /projects/:id"
```

---

### Task 4: `EditProjectModal` component

**Files:**
- Create: `apps/web/src/components/dashboard/EditProjectModal.tsx`

No automated test — `apps/web` has zero test infrastructure today (tracked separately in `PLAN.md`'s 🔍 Analysis Backlog #2). Verified manually in Task 6.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/dashboard/EditProjectModal.tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Globe, Type } from "lucide-react";

export function EditProjectModal({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: { id: string; name: string; domain: string } | null;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setDomain(project.domain);
    }
  }, [isOpen, project]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project selected");
      const { data } = await api.patch(`/projects/${project.id}`, {
        name,
        domain,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to update project. Please try again.");
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Project"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            className="flex-1 bg-transparent border border-brand-muted hover:bg-brand-surface text-brand-fg"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-white border-none shadow-brand-primary/30"
            onClick={() => {
              if (!name.trim()) return alert("Project name is required");
              if (!domain.trim())
                return alert("Project domain is required for security");
              updateMutation.mutate();
            }}
            isLoading={updateMutation.isPending}
            disabled={!name.trim() || !domain.trim()}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-fg ml-1">
            Project Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="e.g. My Awesome Startup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              required
            />
            <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-fg ml-1">
            Domain <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="e.g. my-startup.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="pl-10"
              required
            />
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/EditProjectModal.tsx
git commit -m "feat(web): add EditProjectModal component"
```

---

### Task 5: Wire the modal into `Sidebar.tsx`

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add the `Pencil` icon and the `EditProjectModal` import**

In the `lucide-react` import block (`apps/web/src/components/dashboard/Sidebar.tsx:8-20`), add `Pencil`:

```tsx
import {
  LogOut,
  Plus,
  Sparkles,
  User,
  LayoutDashboard,
  ChevronDown,
  Check,
  Trash2,
  Pencil,
  Settings,
  Activity,
  BarChart2,
} from "lucide-react";
```

Add the component import next to the other dashboard/team modal imports (`apps/web/src/components/dashboard/Sidebar.tsx:25-27`):

```tsx
import { CreateTeamModal } from "@/components/teams/CreateTeamModal";
import { CreateTeamProjectModal } from "@/components/teams/CreateTeamProjectModal";
import { EditProjectModal } from "@/components/dashboard/EditProjectModal";
import { Dropdown } from "@/components/ui/dropdown";
```

- [ ] **Step 2: Add `isEditProjectOpen` state**

Modify `apps/web/src/components/dashboard/Sidebar.tsx:61-63`:

```tsx
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateTeamProjectOpen, setIsCreateTeamProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
```

- [ ] **Step 3: Add the "Edit project…" dropdown item**

Replace the delete-item block at `apps/web/src/components/dashboard/Sidebar.tsx:223-233`:

```tsx
            {activeProject && (isAdminOrOwner || !activeTeam) && (
              <>
                <Dropdown.Separator />
                <Dropdown.Item
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => setIsEditProjectOpen(true)}
                >
                  Edit project…
                </Dropdown.Item>
                <Dropdown.Item
                  icon={<Trash2 className="h-4 w-4 text-red-400" />}
                  onClick={() => setIsDeleteProjectOpen(true)}
                >
                  <span className="text-red-400">Delete project…</span>
                </Dropdown.Item>
              </>
            )}
```

- [ ] **Step 4: Render the modal**

Replace the closing render block at `apps/web/src/components/dashboard/Sidebar.tsx:380-390`:

```tsx
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
      />
      {activeTeam && (
        <CreateTeamProjectModal
          isOpen={isCreateTeamProjectOpen}
          onClose={() => setIsCreateTeamProjectOpen(false)}
          teamId={activeTeam.id}
        />
      )}
      <EditProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        project={activeProject ?? null}
      />
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "feat(web): wire Edit project into the sidebar project menu"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Backend typecheck, lint, unit tests**

Run: `pnpm typecheck && pnpm lint && cd apps/api && pnpm test`
Expected: all green; `projects.service.spec.ts` and `update-project.dto.spec.ts` included in the run

- [ ] **Step 2: Web typecheck and lint**

Run: `cd apps/web && pnpm typecheck && pnpm lint`
Expected: no errors

- [ ] **Step 3: Manual end-to-end check against the running dev stack**

Run: `docker compose up -d` (Postgres + Redis), then `pnpm dev` from the repo root.

1. Log in, open the sidebar project dropdown, click **Edit project…** on the active project.
2. Confirm the modal opens pre-filled with the current name and domain.
3. Change only the name, save — confirm the sidebar/dropdown label updates and the domain is unchanged (check via the Embed tab or a fresh `GET /projects`).
4. Re-open, change only the domain to a new valid hostname, save — confirm it persists.
5. Try saving with an empty name or empty domain — confirm the client blocks it before any request fires.
6. Try a domain containing `https://` or a `/path` — confirm the API returns 400 (class-validator's `Matches` message) and the UI surfaces it via the `alert`.
7. Log in as a `MEMBER`/`VIEWER` role account (or a non-member) and confirm "Edit project…" is hidden from the dropdown (same guard as "Delete project…").

- [ ] **Step 4: Report results**

State explicitly which commands were run and their pass/fail output — do not report "done" without this evidence, per the project's Verification Mandate.

---

### Task 7: Update `docs/architecture/PLAN.md`

**Files:**
- Modify: `docs/architecture/PLAN.md`

Per the file's own "Update rule": completing a roadmap item updates `PLAN.md` in the same change and bumps the date at the top.

- [ ] **Step 1: Mark the backlog item done**

In the "Project management" table under `## 📦 Product Backlog`, replace:

```markdown
| 🔴 | Edit project: rename + change domain | **Today a customer who changes their website domain must delete the project and lose all feedback** — the domain is the CORS whitelist. Worst gap in the product |
```

with:

```markdown
| ✔ | ~~Edit project: rename + change domain~~ — Done (2026-07-07) | `PATCH /projects/:id` (partial: name and/or domain, ADMIN-role-only, domain cannot be cleared to protect the origin whitelist in `FeedbackPublicController`) + a Sidebar "Edit project…" modal. Domain now hostname-validated on this endpoint; `POST /projects` / `POST /teams/:id/projects` still accept any string (pre-existing, unrelated gap, not fixed here). |
```

- [ ] **Step 2: Add a Changelog entry**

At the top of the `## Changelog` section (`docs/architecture/PLAN.md`, directly after the `## Changelog` heading, above the existing 2026-07-07 entry), add:

```markdown
- **2026-07-07** — Closed the 📦 Product Backlog 🔴 gap "Edit project: rename + change domain". New `PATCH /projects/:id` (`UpdateProjectDto`: partial name/domain, hostname-validated, `@IsNotEmpty` blocks clearing domain since an empty domain disables the origin whitelist in `FeedbackPublicController.createPublic`); `ProjectsService.update()` reuses the existing `findOne` + ADMIN-role-check pattern from `remove()`. Web: new `EditProjectModal` wired into `Sidebar.tsx`'s project dropdown next to "Delete project…", same admin-only visibility guard. 7 new unit tests in `projects.service.spec.ts` (first spec file for this service) + 10 in `update-project.dto.spec.ts`. Design: `docs/superpowers/specs/2026-07-07-edit-project-rename-domain-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/PLAN.md
git commit -m "docs: mark PATCH /projects/:id done in PLAN.md"
```

---

## Self-Review Notes

- **Spec coverage:** DTO + validation (Task 1), service partial-update/authz/400 (Task 2), controller route (Task 3), `EditProjectModal` (Task 4), Sidebar wiring (Task 5), full verification (Task 6), `PLAN.md` update rule (Task 7) — every section of the design doc maps to a task.
- **No domain-clear path exists anywhere** in Tasks 1–5: DTO rejects empty string, service only touches `dto.domain` when `!== undefined`, frontend blocks empty domain before the request fires.
- **Type consistency:** `UpdateProjectDto` (Task 1) is the type used verbatim in `ProjectsService.update()` (Task 2) and `ProjectsController.update()` (Task 3) — no renaming across tasks. `EditProjectModal`'s `project` prop shape (`{ id, name, domain }`, Task 4) matches what `Sidebar.tsx` already holds as `activeProject` (Task 5).

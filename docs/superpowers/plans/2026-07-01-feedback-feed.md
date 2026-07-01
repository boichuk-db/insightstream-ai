# Feedback Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Kanban board with a Feed/Inbox view that combines chronological reading (A), AI trends bar (B), and power-user filter tabs/chips (C).

**Architecture:** New `UserProjectLastSeen` entity tracks per-user "last seen" timestamp for the "new" dot signal. Two new API endpoints (`POST /feedback/mark-seen`, `GET /feedback/trends`) power the Feed and AI bar. Six new frontend components replace `KanbanBoard`; a view switcher on the dashboard page keeps Kanban accessible during rollout.

**Tech Stack:** NestJS 11 + TypeORM (backend), Next.js 16 App Router + TanStack Query 5 + framer-motion (frontend), existing brand design tokens, Lucide icons.

---

## File Map

**Create:**
- `packages/database/src/entities/user-project-last-seen.entity.ts`
- `apps/api/src/modules/feedback/feedback.service.spec.ts` ← extend existing
- `apps/web/src/components/ui/StatusTabs.tsx`
- `apps/web/src/components/ui/FilterChips.tsx`
- `apps/web/src/components/dashboard/AITrendsBar.tsx`
- `apps/web/src/hooks/useComments.ts`
- `apps/web/src/components/dashboard/FeedbackFeedItem.tsx`
- `apps/web/src/components/dashboard/FeedbackFeed.tsx`

**Modify:**
- `packages/database/src/index.ts` — export new entity
- `packages/database/src/data-source.ts` — register entity
- `apps/api/src/modules/feedback/feedback.service.ts` — add `markSeen`, `getLastSeen`, `getTrends`
- `apps/api/src/modules/feedback/feedback.controller.ts` — add 3 endpoints
- `apps/api/src/modules/feedback/feedback.module.ts` — register `UserProjectLastSeen`
- `apps/web/src/lib/queries.ts` — add `lastSeenQuery`, `feedbackTrendsQuery`
- `apps/web/src/app/dashboard/page.tsx` — add view switcher, wire `FeedbackFeed`

---

## Task 1: UserProjectLastSeen entity

**Files:**
- Create: `packages/database/src/entities/user-project-last-seen.entity.ts`
- Modify: `packages/database/src/index.ts`
- Modify: `packages/database/src/data-source.ts`

- [ ] **Step 1: Create entity file**

```typescript
// packages/database/src/entities/user-project-last-seen.entity.ts
import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("user_project_last_seen")
export class UserProjectLastSeen {
  @PrimaryColumn({ type: "uuid" })
  userId: string;

  @PrimaryColumn({ type: "uuid" })
  projectId: string;

  @Column({ type: "timestamptz" })
  seenAt: Date;
}
```

- [ ] **Step 2: Export from package index**

Add to `packages/database/src/index.ts`:
```typescript
export * from "./entities/user-project-last-seen.entity";
```

- [ ] **Step 3: Register in data-source**

In `packages/database/src/data-source.ts`, add the import and add `UserProjectLastSeen` to the `entities` array:

```typescript
import { UserProjectLastSeen } from "./entities/user-project-last-seen.entity";
// ...
entities: [User, Feedback, Project, AuditLog, Team, TeamMember, Invitation, Comment, ActivityEvent, UserProjectLastSeen],
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/database/src/entities/user-project-last-seen.entity.ts packages/database/src/index.ts packages/database/src/data-source.ts
git commit -m "feat(database): add UserProjectLastSeen entity"
```

---

## Task 2: Backend — mark-seen and trends service methods

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.service.ts`
- Modify: `apps/api/src/modules/feedback/feedback.module.ts`

- [ ] **Step 1: Register UserProjectLastSeen in feedback module**

In `apps/api/src/modules/feedback/feedback.module.ts`:
```typescript
import { Feedback, TeamMember, UserProjectLastSeen } from '@insightstream/database';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback, TeamMember, UserProjectLastSeen]),
    AiModule,
    ProjectsModule,
    PlansModule,
  ],
  providers: [FeedbackService],
  controllers: [FeedbackController, FeedbackPublicController],
})
export class FeedbackModule {}
```

- [ ] **Step 2: Write failing tests for new service methods**

Add to `apps/api/src/modules/feedback/feedback.service.spec.ts` — inside the existing `describe('FeedbackService')` block, after existing tests:

```typescript
describe('markSeen', () => {
  it('upserts last-seen record for user + project', async () => {
    const upsertSpy = jest.spyOn(lastSeenRepo, 'upsert').mockResolvedValue({} as any);
    await service.markSeen('user-1', 'proj-1');
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', projectId: 'proj-1' }),
      { conflictPaths: ['userId', 'projectId'] },
    );
  });
});

describe('getLastSeen', () => {
  it('returns seenAt date when record exists', async () => {
    const date = new Date('2026-01-01');
    jest.spyOn(lastSeenRepo, 'findOne').mockResolvedValue({ userId: 'u', projectId: 'p', seenAt: date });
    const result = await service.getLastSeen('u', 'p');
    expect(result).toEqual(date);
  });

  it('returns null when no record exists', async () => {
    jest.spyOn(lastSeenRepo, 'findOne').mockResolvedValue(null);
    const result = await service.getLastSeen('u', 'p');
    expect(result).toBeNull();
  });
});

describe('getTrends', () => {
  it('returns categories grouped by count descending', async () => {
    jest.spyOn(mockProjectsService, 'findOne').mockResolvedValue({ userId: 'u' } as any);
    const rawResults = [
      { name: 'Bug', count: '9' },
      { name: 'UX', count: '14' },
    ];
    // getRawMany mock set in beforeEach — override for this test
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawResults),
    };
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);
    const result = await service.getTrends('proj-1', 'user-1');
    expect(result[0].count).toBe(9);
    expect(result[0].name).toBe('Bug');
    expect(result.every(r => typeof r.emoji === 'string')).toBe(true);
  });
});
```

You also need a `lastSeenRepo` mock in the `beforeEach` setup. Update the `beforeEach` in the spec to add:

```typescript
const mockLastSeenRepo = {
  upsert: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
};

// Add to providers array in TestingModule:
{ provide: getRepositoryToken(UserProjectLastSeen), useValue: mockLastSeenRepo },
```

And add at the top of the describe block:
```typescript
let lastSeenRepo: any;
// in beforeEach, after service = module.get<FeedbackService>(FeedbackService):
lastSeenRepo = module.get(getRepositoryToken(UserProjectLastSeen));
```

Add import at top of spec file:
```typescript
import { UserProjectLastSeen } from '@insightstream/database';
```

- [ ] **Step 3: Run failing tests**

```bash
pnpm test -- --testPathPattern=feedback.service.spec
```
Expected: FAIL — `markSeen`, `getLastSeen`, `getTrends` not defined

- [ ] **Step 4: Implement service methods**

In `apps/api/src/modules/feedback/feedback.service.ts`, add the import and inject the new repo, then add the three methods:

Add to imports at top:
```typescript
import { Feedback, TeamMember, UserProjectLastSeen } from '@insightstream/database';
```

Add to constructor (after existing `@InjectRepository` injections):
```typescript
@InjectRepository(UserProjectLastSeen)
private lastSeenRepo: Repository<UserProjectLastSeen>,
```

Add after the existing methods:
```typescript
private readonly CATEGORY_EMOJI: Record<string, string> = {
  UX: '🧭', Bug: '🐛', API: '🔌', Performance: '🚀',
  Feature: '✨', General: '💬', Navigation: '🧭',
  Auth: '🔐', Billing: '💳', Dashboard: '📊',
};

async markSeen(userId: string, projectId: string): Promise<void> {
  await this.lastSeenRepo.upsert(
    { userId, projectId, seenAt: new Date() },
    { conflictPaths: ['userId', 'projectId'] },
  );
}

async getLastSeen(userId: string, projectId: string): Promise<Date | null> {
  const record = await this.lastSeenRepo.findOne({ where: { userId, projectId } });
  return record?.seenAt ?? null;
}

async getTrends(
  projectId: string,
  userId: string,
): Promise<{ name: string; emoji: string; count: number }[]> {
  await this.projectsService.findOne(projectId, userId);
  const raw = await this.feedbackRepository
    .createQueryBuilder('f')
    .select('f.category', 'name')
    .addSelect('COUNT(*)', 'count')
    .where('f.projectId = :projectId', { projectId })
    .andWhere('f.category IS NOT NULL')
    .andWhere("f.status != 'Rejected'")
    .groupBy('f.category')
    .orderBy('count', 'DESC')
    .limit(6)
    .getRawMany();

  return raw.map((r) => ({
    name: r.name,
    emoji: this.CATEGORY_EMOJI[r.name] ?? '📝',
    count: parseInt(r.count, 10),
  }));
}
```

- [ ] **Step 5: Run tests — must pass**

```bash
pnpm test -- --testPathPattern=feedback.service.spec
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/feedback/ packages/database/src/
git commit -m "feat(api): add mark-seen and trends service methods"
```

---

## Task 3: Backend — controller endpoints

**Files:**
- Modify: `apps/api/src/modules/feedback/feedback.controller.ts`

- [ ] **Step 1: Add three endpoints to controller**

In `apps/api/src/modules/feedback/feedback.controller.ts`, add after the existing `bulkArchive` method:

```typescript
@Post('mark-seen')
async markSeen(
  @Request() req: any,
  @Body('projectId') projectId: string,
): Promise<void> {
  if (!projectId) throw new BadRequestException('projectId is required');
  await this.feedbackService.markSeen(req.user.id, projectId);
}

@Get('last-seen')
async getLastSeen(
  @Request() req: any,
  @Query('projectId') projectId: string,
): Promise<{ seenAt: string | null }> {
  if (!projectId) throw new BadRequestException('projectId is required');
  const date = await this.feedbackService.getLastSeen(req.user.id, projectId);
  return { seenAt: date ? date.toISOString() : null };
}

@Get('trends')
async getTrends(
  @Request() req: any,
  @Query('projectId') projectId: string,
): Promise<{ name: string; emoji: string; count: number }[]> {
  if (!projectId) throw new BadRequestException('projectId is required');
  return this.feedbackService.getTrends(projectId, req.user.id);
}
```

**Important:** `mark-seen`, `last-seen`, and `trends` are literal string routes — they must be defined **before** the `:id` param routes, otherwise NestJS will try to match them as IDs. Verify the order: `@Post('mark-seen')` and `@Get('last-seen')` and `@Get('trends')` must come before `@Get(':id')` in the file.

- [ ] **Step 2: Start API and verify endpoints respond**

```bash
pnpm dev
```

In a separate terminal:
```bash
# Get a JWT token first by logging in, then:
curl -X POST http://localhost:3001/feedback/mark-seen \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<your-project-id>"}'
# Expected: 201 with empty body

curl "http://localhost:3001/feedback/trends?projectId=<your-project-id>" \
  -H "Authorization: Bearer <token>"
# Expected: 200 with JSON array
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/feedback/feedback.controller.ts
git commit -m "feat(api): add mark-seen, last-seen, and trends endpoints"
```

---

## Task 4: Frontend API layer

**Files:**
- Modify: `apps/web/src/lib/queries.ts`

- [ ] **Step 1: Add queries to queries.ts**

Append to `apps/web/src/lib/queries.ts`:

```typescript
export const lastSeenQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["lastSeen", projectId],
    queryFn: () =>
      api
        .get<{ seenAt: string | null }>("/feedback/last-seen", {
          params: { projectId },
        })
        .then((r) => (r.data.seenAt ? new Date(r.data.seenAt) : null)),
    enabled: !!projectId,
  });

export const feedbackTrendsQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["feedbackTrends", projectId],
    queryFn: () =>
      api
        .get<{ name: string; emoji: string; count: number }[]>(
          "/feedback/trends",
          { params: { projectId } },
        )
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  });
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/queries.ts
git commit -m "feat(web): add lastSeen and feedbackTrends queries"
```

---

## Task 5: StatusTabs component

**Files:**
- Create: `apps/web/src/components/ui/StatusTabs.tsx`

- [ ] **Step 1: Create component**

```typescript
// apps/web/src/components/ui/StatusTabs.tsx
import { cn } from "@/lib/utils";

export interface StatusTab {
  label: string;
  value: string;
  count: number;
}

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function StatusTabs({
  tabs,
  activeTab,
  onChange,
  className,
  rightSlot,
}: StatusTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center border-b border-brand-border bg-brand-surface overflow-x-auto",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors",
            activeTab === tab.value
              ? "border-brand-accent text-brand-fg"
              : "border-transparent text-brand-muted hover:text-brand-fg",
          )}
        >
          {tab.label}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
              activeTab === tab.value
                ? "bg-brand-accent/15 text-brand-accent"
                : "bg-brand-surface-hover text-brand-muted",
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
      {rightSlot && <div className="ml-auto pr-4">{rightSlot}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/StatusTabs.tsx
git commit -m "feat(web): add reusable StatusTabs component"
```

---

## Task 6: FilterChips component

**Files:**
- Create: `apps/web/src/components/ui/FilterChips.tsx`

- [ ] **Step 1: Create component**

```typescript
// apps/web/src/components/ui/FilterChips.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

export interface ChipOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  key: string;
  label?: string;
  options: ChipOption[];
  multi?: boolean;
}

interface FilterChipsProps {
  groups: FilterGroup[];
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  className?: string;
}

function DropdownChip({
  group,
  selected,
  onChange,
}: {
  group: FilterGroup;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    if (group.multi) {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value],
      );
    } else {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
    }
  }

  const hasActive = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors",
          hasActive
            ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent"
            : "bg-transparent border-dashed border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-fg",
        )}
      >
        {group.label}
        {hasActive && (
          <span className="bg-brand-accent text-brand-bg rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-brand-surface border border-brand-border rounded-xl shadow-lg py-1">
          {group.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                selected.includes(opt.value)
                  ? "text-brand-accent bg-brand-accent/5"
                  : "text-brand-fg hover:bg-brand-surface-hover",
              )}
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                  selected.includes(opt.value)
                    ? "border-brand-accent bg-brand-accent"
                    : "border-brand-border",
                )}
              >
                {selected.includes(opt.value) && (
                  <span className="text-brand-bg text-[8px]">✓</span>
                )}
              </span>
              {opt.label}
            </button>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => { onChange([]); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-muted hover:text-brand-fg border-t border-brand-border mt-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterChips({ groups, values, onChange, className }: FilterChipsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-5 py-2 border-b border-brand-border bg-brand-bg flex-wrap",
        className,
      )}
    >
      {groups.map((group, i) => (
        <div key={group.key} className="flex items-center gap-2">
          {i > 0 && <div className="w-px h-4 bg-brand-border" />}
          {group.options.length <= 4 && !group.multi ? (
            group.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  onChange(
                    group.key,
                    values[group.key]?.includes(opt.value) ? [] : [opt.value],
                  )
                }
                className={cn(
                  "px-3 py-1 rounded-full text-xs border transition-colors",
                  values[group.key]?.includes(opt.value)
                    ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent"
                    : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-fg",
                )}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <DropdownChip
              group={group}
              selected={values[group.key] ?? []}
              onChange={(v) => onChange(group.key, v)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/FilterChips.tsx
git commit -m "feat(web): add reusable FilterChips component with dropdown support"
```

---

## Task 7: AITrendsBar component

**Files:**
- Create: `apps/web/src/components/dashboard/AITrendsBar.tsx`

- [ ] **Step 1: Create component**

```typescript
// apps/web/src/components/dashboard/AITrendsBar.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import { feedbackTrendsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface AITrendsBarProps {
  projectId: string;
  onThemeFilter: (theme: string) => void;
}

export function AITrendsBar({ projectId, onThemeFilter }: AITrendsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: trends, isLoading } = useQuery(feedbackTrendsQuery(projectId));

  if (isLoading || !trends?.length) return null;

  return (
    <div className="border-b border-brand-accent/15 bg-brand-accent/[0.04]">
      <div
        className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-brand-accent/[0.07] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-1.5 text-brand-accent shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            AI Trends
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {trends.map((theme) => (
            <button
              key={theme.name}
              onClick={(e) => {
                e.stopPropagation();
                onThemeFilter(theme.name);
              }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-accent/8 border border-brand-accent/20 text-[11px] text-brand-fg/80 hover:bg-brand-accent/15 hover:text-brand-fg transition-colors"
            >
              <span>{theme.emoji}</span>
              <span>{theme.name}</span>
              <span className="text-brand-accent font-semibold">
                {theme.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 text-brand-muted text-[11px] shrink-0">
          {expanded ? (
            <>
              Collapse <ChevronDown className="w-3 h-3" />
            </>
          ) : (
            <>
              Details <ChevronRight className="w-3 h-3" />
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {trends.map((theme) => (
            <button
              key={theme.name}
              onClick={() => onThemeFilter(theme.name)}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border border-brand-border",
                "bg-brand-surface text-left hover:border-brand-accent/30 hover:bg-brand-accent/5 transition-colors",
              )}
            >
              <div className="flex items-center gap-2 text-sm text-brand-fg">
                <span>{theme.emoji}</span>
                <span>{theme.name}</span>
              </div>
              <span className="text-brand-accent font-bold text-sm">
                {theme.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/AITrendsBar.tsx
git commit -m "feat(web): add AITrendsBar component"
```

---

## Task 8: useComments hook

**Files:**
- Create: `apps/web/src/hooks/useComments.ts`

- [ ] **Step 1: Create hook**

```typescript
// apps/web/src/hooks/useComments.ts
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export function useComments(feedbackId: string | null) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", feedbackId],
    queryFn: async () => {
      const { data } = await api.get<Comment[]>(
        `/feedbacks/${feedbackId}/comments`,
      );
      return data;
    },
    enabled: !!feedbackId,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/feedbacks/${feedbackId}/comments`, {
        content,
      });
      return data;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["comments", feedbackId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", feedbackId] });
    },
  });

  function submit() {
    if (!draft.trim()) return;
    addMutation.mutate(draft.trim());
  }

  return {
    comments,
    isLoading,
    draft,
    setDraft,
    submit,
    isSubmitting: addMutation.isPending,
    deleteComment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useComments.ts
git commit -m "feat(web): extract useComments hook"
```

---

## Task 9: FeedbackFeedItem component

**Files:**
- Create: `apps/web/src/components/dashboard/FeedbackFeedItem.tsx`

- [ ] **Step 1: Create component**

```typescript
// apps/web/src/components/dashboard/FeedbackFeedItem.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trash2,
  RotateCcw,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { useComments } from "@/hooks/useComments";
import type { IFeedback } from "@insightstream/shared-types";

const STATUSES = [
  { id: "New", color: "text-brand-accent" },
  { id: "In Review", color: "text-amber-400" },
  { id: "In Progress", color: "text-blue-400" },
  { id: "Done", color: "text-emerald-400" },
  { id: "Rejected", color: "text-red-400" },
];

const PREVIEW_COMMENT_COUNT = 3;

interface FeedbackFeedItemProps {
  feedback: IFeedback;
  isNew: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onReanalyze: (id: string) => void;
  isDeleting: boolean;
  isReanalyzing: boolean;
  currentUserId?: string;
}

export function FeedbackFeedItem({
  feedback,
  isNew,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onDelete,
  onReanalyze,
  isDeleting,
  isReanalyzing,
  currentUserId,
}: FeedbackFeedItemProps) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const { comments, isLoading: commentsLoading, draft, setDraft, submit, isSubmitting, deleteComment } =
    useComments(isExpanded ? feedback.id : null);

  const visibleComments = showAllComments
    ? comments
    : comments.slice(0, PREVIEW_COMMENT_COUNT);
  const hiddenCount = comments.length - PREVIEW_COMMENT_COUNT;

  return (
    <div
      className={cn(
        "border-l-2 border-b border-brand-border transition-colors",
        isNew ? "border-l-brand-accent" : "border-l-transparent",
        isExpanded ? "bg-brand-surface" : "hover:bg-brand-surface-hover",
      )}
    >
      {/* Collapsed row — always visible */}
      <div
        className="flex items-start gap-3 px-5 py-3.5 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* New dot */}
        <div className="mt-1.5 flex-shrink-0">
          {isNew ? (
            <div className="w-2 h-2 rounded-full bg-brand-accent" />
          ) : (
            <div className="w-2 h-2 rounded-full border border-brand-muted/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {feedback.source && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-surface-hover border border-brand-border text-brand-muted">
                {feedback.source}
              </span>
            )}
            {feedback.category && (
              <Badge variant="category" value={feedback.category} size="sm" />
            )}
            {feedback.sentimentScore !== undefined && (
              <SentimentBar
                score={feedback.sentimentScore}
                className="ml-0.5"
              />
            )}
            <span className="ml-auto text-[11px] text-brand-muted flex-shrink-0">
              {formatDistanceToNow(new Date(feedback.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>

          <p
            className={cn(
              "text-sm text-brand-fg leading-relaxed",
              !isExpanded && "line-clamp-2",
            )}
          >
            {feedback.content}
          </p>

          {!isExpanded && feedback.category && (
            <p className="mt-1.5 text-[11px] text-brand-accent flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
              {feedback.category}
              {feedback.aiSummary && " · AI analyzed"}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 mt-0.5 text-brand-muted">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-4 border-t border-brand-border">
              {/* AI Summary */}
              {feedback.aiSummary && (
                <div className="mt-4 flex gap-2.5 p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/15">
                  <Sparkles className="w-3.5 h-3.5 text-brand-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-brand-fg/80 leading-relaxed">
                    {feedback.aiSummary}
                  </p>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusPicker((s) => !s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface-hover text-xs text-brand-fg hover:border-brand-muted transition-colors"
                  >
                    <Badge
                      variant="status"
                      value={feedback.status}
                      size="sm"
                    />
                    <ChevronDown className="w-3 h-3 text-brand-muted" />
                  </button>
                  {showStatusPicker && (
                    <div className="absolute top-full left-0 mt-1 z-10 bg-brand-surface border border-brand-border rounded-xl shadow-lg py-1 min-w-[130px]">
                      {STATUSES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onStatusChange(feedback.id, s.id);
                            setShowStatusPicker(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs hover:bg-brand-surface-hover transition-colors",
                            s.color,
                          )}
                        >
                          {s.id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onReanalyze(feedback.id)}
                  disabled={isReanalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface-hover text-xs text-brand-muted hover:text-brand-fg hover:border-brand-muted transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-analyze
                </button>

                <button
                  onClick={() => onDelete(feedback.id)}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>
                    {commentsLoading
                      ? "Loading comments..."
                      : `${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
                  </span>
                </div>

                {visibleComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="group flex gap-2.5 p-2.5 rounded-lg bg-brand-bg border border-brand-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-fg leading-relaxed">
                        {comment.content}
                      </p>
                      <p className="text-[10px] text-brand-muted mt-1">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {comment.user?.id === currentUserId && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 text-brand-muted hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {hiddenCount > 0 && !showAllComments && (
                  <button
                    onClick={() => setShowAllComments(true)}
                    className="text-xs text-brand-accent hover:underline"
                  >
                    View all {comments.length} comments →
                  </button>
                )}

                {/* Comment input */}
                <div className="flex gap-2 mt-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-xs bg-brand-bg border border-brand-border rounded-lg text-brand-fg placeholder:text-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  />
                  <button
                    onClick={submit}
                    disabled={!draft.trim() || isSubmitting}
                    className="p-2 rounded-lg bg-brand-accent/10 border border-brand-accent/25 text-brand-accent hover:bg-brand-accent/20 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/FeedbackFeedItem.tsx
git commit -m "feat(web): add FeedbackFeedItem component with inline expand"
```

---

## Task 10: FeedbackFeed orchestrator

**Files:**
- Create: `apps/web/src/components/dashboard/FeedbackFeed.tsx`

- [ ] **Step 1: Create component**

```typescript
// apps/web/src/components/dashboard/FeedbackFeed.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { feedbacksQuery, lastSeenQuery } from "@/lib/queries";
import { StatusTabs } from "@/components/ui/StatusTabs";
import { FilterChips } from "@/components/ui/FilterChips";
import { AITrendsBar } from "@/components/dashboard/AITrendsBar";
import { FeedbackFeedItem } from "@/components/dashboard/FeedbackFeedItem";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import type { IFeedback } from "@insightstream/shared-types";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "New" },
  { label: "In Review", value: "In Review" },
  { label: "In Progress", value: "In Progress" },
  { label: "Done", value: "Done" },
  { label: "Rejected", value: "Rejected" },
];

const FILTER_GROUPS = [
  {
    key: "source",
    options: [
      { label: "All sources", value: "all" },
      { label: "Widget", value: "Widget" },
      { label: "Direct", value: "Direct" },
    ],
  },
  {
    key: "sentiment",
    options: [
      { label: "😊 Positive", value: "positive" },
      { label: "😞 Negative", value: "negative" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    multi: true,
    options: [] as { label: string; value: string }[],
  },
  {
    key: "category",
    label: "Category",
    multi: true,
    options: [] as { label: string; value: string }[],
  },
];

interface FeedbackFeedProps {
  projectId: string;
  currentUserId?: string;
}

export function FeedbackFeed({ projectId, currentUserId }: FeedbackFeedProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({
    source: ["all"],
    sentiment: [],
    tags: [],
    category: [],
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

  const { data: feedbacks = [], isLoading } = useQuery(
    feedbacksQuery(projectId),
  );
  const { data: lastSeen } = useQuery(lastSeenQuery(projectId));

  // Mark seen on mount
  useEffect(() => {
    if (!projectId) return;
    api.post("/feedback/mark-seen", { projectId }).catch(() => {});
  }, [projectId]);

  // Build dynamic tag/category options from data
  const filterGroups = useMemo(() => {
    const tags = Array.from(
      new Set(feedbacks.flatMap((f: IFeedback) => f.tags ?? [])),
    ).map((t) => ({ label: t as string, value: t as string }));

    const categories = Array.from(
      new Set(
        feedbacks
          .map((f: IFeedback) => f.category)
          .filter(Boolean),
      ),
    ).map((c) => ({ label: c as string, value: c as string }));

    return FILTER_GROUPS.map((g) => {
      if (g.key === "tags") return { ...g, options: tags };
      if (g.key === "category") return { ...g, options: categories };
      return g;
    });
  }, [feedbacks]);

  // Filter logic
  const filtered = useMemo(() => {
    return (feedbacks as IFeedback[]).filter((f) => {
      if (activeTab !== "all" && f.status !== activeTab) return false;

      const src = filterValues.source ?? ["all"];
      if (!src.includes("all") && src.length > 0 && f.source && !src.includes(f.source))
        return false;

      const sent = filterValues.sentiment ?? [];
      if (sent.includes("positive") && (f.sentimentScore ?? 0.5) < 0.6) return false;
      if (sent.includes("negative") && (f.sentimentScore ?? 0.5) >= 0.4) return false;

      const tags = filterValues.tags ?? [];
      if (tags.length > 0 && !tags.some((t) => f.tags?.includes(t))) return false;

      const cats = filterValues.category ?? [];
      if (cats.length > 0 && !cats.includes(f.category ?? "")) return false;

      return true;
    });
  }, [feedbacks, activeTab, filterValues]);

  // Tabs with counts
  const tabs = STATUS_TABS.map((t) => ({
    ...t,
    count:
      t.value === "all"
        ? (feedbacks as IFeedback[]).length
        : (feedbacks as IFeedback[]).filter((f) => f.status === t.value).length,
  }));

  function handleFilterChange(key: string, values: string[]) {
    setFilterValues((prev) => ({ ...prev, [key]: values }));
  }

  function handleThemeFilter(theme: string) {
    setFilterValues((prev) => ({ ...prev, category: [theme] }));
  }

  async function handleStatusChange(id: string, status: string) {
    await api.patch(`/feedback/${id}/status`, { status });
    queryClient.invalidateQueries({ queryKey: ["feedbacks", projectId] });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/feedback/${id}`);
      queryClient.invalidateQueries({ queryKey: ["feedbacks", projectId] });
      if (expandedId === id) setExpandedId(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReanalyze(id: string) {
    setReanalyzingId(id);
    try {
      await api.post(`/feedback/${id}/reanalyze`);
      queryClient.invalidateQueries({ queryKey: ["feedbacks", projectId] });
    } finally {
      setReanalyzingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AITrendsBar projectId={projectId} onThemeFilter={handleThemeFilter} />

      <StatusTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <FilterChips
        groups={filterGroups}
        values={filterValues}
        onChange={handleFilterChange}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback found"
          description="Try adjusting your filters"
          className="py-16"
        />
      ) : (
        <div>
          {filtered.map((feedback: IFeedback) => (
            <FeedbackFeedItem
              key={feedback.id}
              feedback={feedback}
              isNew={
                lastSeen
                  ? new Date(feedback.createdAt) > lastSeen
                  : false
              }
              isExpanded={expandedId === feedback.id}
              onToggleExpand={() =>
                setExpandedId((id) =>
                  id === feedback.id ? null : feedback.id,
                )
              }
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onReanalyze={handleReanalyze}
              isDeleting={deletingId === feedback.id}
              isReanalyzing={reanalyzingId === feedback.id}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/FeedbackFeed.tsx
git commit -m "feat(web): add FeedbackFeed orchestrator component"
```

---

## Task 11: Dashboard integration — view switcher

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add FeedbackFeed import and view switcher state**

In `apps/web/src/app/dashboard/page.tsx`, add the import near the top with other dashboard component imports:

```typescript
import { FeedbackFeed } from "@/components/dashboard/FeedbackFeed";
import { List, Columns } from "lucide-react";
import { cn } from "@/lib/utils"; // add if not already present
```

Add view state inside the `Dashboard` component, near other `useState` calls:

```typescript
const [feedbackView, setFeedbackView] = useState<"feed" | "kanban">("feed");
```

- [ ] **Step 2: Replace KanbanBoard render with view switcher**

Find the section in `dashboard/page.tsx` where `<KanbanBoard>` is rendered. Replace it with:

```tsx
{/* View switcher header */}
<div className="flex items-center justify-between px-4 pt-4 pb-2">
  <h2 className="text-sm font-semibold text-brand-fg">Feedback</h2>
  <div className="flex items-center gap-1 p-1 rounded-lg bg-brand-surface border border-brand-border">
    <button
      onClick={() => setFeedbackView("feed")}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors",
        feedbackView === "feed"
          ? "bg-brand-surface-hover text-brand-fg"
          : "text-brand-muted hover:text-brand-fg",
      )}
    >
      <List className="w-3.5 h-3.5" />
      Feed
    </button>
    <button
      onClick={() => setFeedbackView("kanban")}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors",
        feedbackView === "kanban"
          ? "bg-brand-surface-hover text-brand-fg"
          : "text-brand-muted hover:text-brand-fg",
      )}
    >
      <Columns className="w-3.5 h-3.5" />
      Kanban
    </button>
  </div>
</div>

{feedbackView === "feed" ? (
  <FeedbackFeed
    projectId={activeProject?.id ?? ""}
    currentUserId={userProfile?.id}
  />
) : (
  <KanbanBoard
    feedbacks={filteredFeedbacks}
    onDelete={handleDelete}
    deletingId={deletingId}
    onStatusChange={handleStatusChange}
    onReanalyze={handleReanalyze}
    reanalyzingId={reanalyzingId}
    onOpenComments={setCommentsFeedbackId}
    commentCounts={commentCounts}
  />
)}
```

You need to import `cn` from `@/lib/utils` if not already imported in this file.

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```
Expected: no errors

- [ ] **Step 5: Start dev and verify both views work**

```bash
pnpm dev
```

Open http://localhost:3000/dashboard. Verify:
- Feed view loads by default
- AI Trends bar appears if there are categorized feedbacks
- Status tabs filter the list
- Filter chips work (source, sentiment)
- Clicking an item expands it inline
- Status picker, re-analyze, delete all work in expanded state
- Comments load and can be added in expanded state
- Switching to Kanban view shows the original board unchanged

- [ ] **Step 6: Final commit**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "feat(web): integrate FeedbackFeed with view switcher on dashboard"
```

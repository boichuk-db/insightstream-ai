# Component Library Consolidation — Phase 1: Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every new `components/ui/` primitive (and refactor the existing `ui/` files that need to route through them) that Phase 2's 8 consumer clusters will depend on, with zero changes to any consumer file outside `components/ui/`, `lib/colors.ts`, and `lib/statusConfig.ts` (new).

**Architecture:** Each primitive is a small, self-contained React component under `apps/web/src/components/ui/`, following the codebase's existing conventions (`cn()` from `@/lib/utils`, `framer-motion` for animated pieces, Tailwind CSS 4 with brand design tokens, no raw status colors). Every primitive ships a `.stories.tsx`. Existing `ui/`-internal files (`dropdown.tsx`, `select.tsx`, `FilterChips.tsx`, `StatusTabs.tsx`, `modal.tsx`, `badge.tsx`, `labeled-section.tsx`, `usage-meter.tsx`, `button.tsx`) get refactored onto the new primitives without changing their existing public props — so no file outside this plan's scope needs to change to keep compiling.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS 4, `framer-motion`, `lucide-react`, Storybook (`@storybook/nextjs-vite`).

**Design doc:** `docs/superpowers/specs/2026-07-10-component-library-consolidation-design.md`

---

## Pre-flight: one exception to the file-ownership rule (read before starting)

`lib/colors.ts`'s existing `STATUS_COLORS` export is imported by `components/dashboard/KanbanBoard.tsx` — a file owned by the **Kanban** Phase 2 cluster, not Phase 1. If Task 3 below removed or renamed that export, `main` would fail to typecheck in the window between Phase 1 merging and the Kanban cluster landing. **Task 3 therefore ADDS the new `STATUS_CONFIG` alongside the existing `STATUS_COLORS` export — it does not delete `STATUS_COLORS`.** Deleting it is the Kanban cluster's job, once `KanbanBoard.tsx` no longer imports it. This is the only cross-phase dependency in this plan; every other task is a pure addition or an internal-only refactor of a file with no external consumers of the changed internals.

---

### Task 1: `Eyebrow` primitive + refactor `labeled-section.tsx` and `usage-meter.tsx` onto it

**Files:**
- Create: `apps/web/src/components/ui/eyebrow.tsx`
- Create: `apps/web/src/components/ui/eyebrow.stories.tsx`
- Modify: `apps/web/src/components/ui/labeled-section.tsx`
- Modify: `apps/web/src/components/ui/usage-meter.tsx`

- [ ] **Step 1: Create the `Eyebrow` component**

```tsx
// apps/web/src/components/ui/eyebrow.tsx
import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-brand-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create its story**

```tsx
// apps/web/src/components/ui/eyebrow.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Eyebrow } from './eyebrow';

const meta: Meta<typeof Eyebrow> = {
  title: 'UI/Eyebrow',
  component: Eyebrow,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Eyebrow>;

export const Default: Story = {
  args: { children: 'Category' },
};
```

- [ ] **Step 3: Refactor `labeled-section.tsx` onto `Eyebrow`**

Current file renders its own inline `<span className="text-[10px] font-bold uppercase tracking-widest text-brand-fg-muted">{label}</span>` — identical style to what `Eyebrow` now centralizes, so this is a pure drop-in with no visual change:

```tsx
// apps/web/src/components/ui/labeled-section.tsx
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

interface LabeledSectionProps {
  icon: LucideIcon;
  label: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function LabeledSection({
  icon: Icon,
  label,
  iconColor = "text-brand-accent",
  children,
  className,
}: LabeledSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <Eyebrow>{label}</Eyebrow>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Refactor `usage-meter.tsx` onto `Eyebrow`**

Current file's label is `<p className="text-[10px] uppercase tracking-wider text-brand-fg-muted font-semibold mb-1">{label}</p>` — visually close to but not identical to `Eyebrow`'s style (`tracking-wider`+`font-semibold` here vs. `tracking-widest`+`font-bold` in `Eyebrow`). Adopting `Eyebrow` here is an intentional, minor visual normalization (this divergence is exactly the kind of drift the consolidation is meant to remove) — note this explicitly in the commit message, don't silently changing it without a trace:

```tsx
// apps/web/src/components/ui/usage-meter.tsx
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

interface UsageMeterProps {
  label: string;
  current: number;
  max: number | null;
  className?: string;
}

export function UsageMeter({ label, current, max, className }: UsageMeterProps) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0;
  const colorClass =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-brand-primary";

  return (
    <div className={cn("p-4 bg-brand-surface rounded-xl border border-brand-border", className)}>
      <Eyebrow className="block mb-1">{label}</Eyebrow>
      <p className="text-lg font-bold text-brand-fg">
        {current}{" "}
        <span className="text-brand-fg-muted text-sm font-normal">/ {max === null ? "∞" : max}</span>
      </p>
      {max !== null && (
        <div className="mt-2 h-1.5 bg-brand-border rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/eyebrow.tsx src/components/ui/eyebrow.stories.tsx src/components/ui/labeled-section.tsx src/components/ui/usage-meter.tsx`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/eyebrow.tsx apps/web/src/components/ui/eyebrow.stories.tsx apps/web/src/components/ui/labeled-section.tsx apps/web/src/components/ui/usage-meter.tsx
git commit -m "feat(web): add Eyebrow primitive, refactor labeled-section and usage-meter onto it"
```

---

### Task 2: `Button` `size="xs"` variant

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

- [ ] **Step 1: Add the `xs` size**

The component's `size` union and its internal `sizes` object are the only two places a new size must be added (there is no shared/exported size-class map to extend elsewhere):

```tsx
// apps/web/src/components/ui/button.tsx — change ButtonProps and the sizes object only, rest of file unchanged
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "xs" | "sm" | "md";
}
```

```tsx
    const sizes = {
      xs: "h-7 px-2.5 text-[10px] font-semibold",
      sm: "h-9 px-3.5 text-[11px] font-bold",
      md: "h-10 px-4 text-sm font-semibold",
    };
```

- [ ] **Step 2: Note on `button.stories.tsx` (do not fix in this task)**

`apps/web/src/components/ui/button.stories.tsx` already has a `SizeXS: Story = { args: { size: 'xs' } }` — it was written ahead of the component and, because `**/*.stories.tsx` is excluded from `apps/web/tsconfig.json`'s `include`, this mismatch was never caught by `tsc`. After this task, `SizeXS`'s args become valid. The same story file also references `size: 'lg'` and `variant: 'outline'`/`'brand'`, none of which exist on `Button` today — that mismatch is pre-existing, unrelated to this task's scope (the design only calls for adding `xs`), and stays broken. Flag it as a follow-up item for `PLAN.md` rather than silently fixing or silently ignoring it (see Task 12's wrap-up step).

- [ ] **Step 3: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/button.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "feat(web): add Button size=xs variant"
```

---

### Task 3: `STATUS_CONFIG` consolidation

**Files:**
- Create: `apps/web/src/lib/statusConfig.ts`
- Modify: `apps/web/src/components/ui/badge.tsx`
- Modify: `apps/web/src/lib/colors.ts` (additive only — see Pre-flight note above)

The real `FeedbackStatus` enum (`packages/shared-types/src/feedback.types.ts`) is:
```ts
export enum FeedbackStatus {
  NEW = "New",
  IN_REVIEW = "In Review",
  IN_PROGRESS = "In Progress",
  DONE = "Done",
  REJECTED = "Rejected",
  ARCHIVED = "Archived",
}
```
`badge.tsx`'s current local `STATUS_COLORS` has extra lowercase/snake_case keys (`new`, `in_review`, `resolved`, `archived`) that don't match any real enum value ever produced by the API — they're dead entries that never match live data. The Title Case keys (`"In Review"`, `"In Progress"`, `Done`, `Rejected`) are the ones actually hit. `lib/colors.ts`'s `STATUS_COLORS` uses only Title Case keys with a different value shape (single solid-bg class for a dot indicator, vs. badge.tsx's bg/text/border triad for a pill).

- [ ] **Step 1: Create the single source of truth**

```ts
// apps/web/src/lib/statusConfig.ts
import { FeedbackStatus } from "@insightstream/shared-types";

interface StatusConfigEntry {
  /** bg/text/border classes for a pill badge (Badge component) */
  badge: string;
  /** solid bg class for a dot/bar indicator */
  dot: string;
}

export const STATUS_CONFIG: Record<FeedbackStatus, StatusConfigEntry> = {
  [FeedbackStatus.NEW]: {
    badge: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
    dot: "bg-brand-accent",
  },
  [FeedbackStatus.IN_REVIEW]: {
    badge: "bg-status-warning/15 text-status-warning border-status-warning/30",
    dot: "bg-status-warning",
  },
  [FeedbackStatus.IN_PROGRESS]: {
    badge: "bg-status-info/15 text-status-info border-status-info/30",
    dot: "bg-status-info",
  },
  [FeedbackStatus.DONE]: {
    badge: "bg-status-success/15 text-status-success border-status-success/30",
    dot: "bg-status-success",
  },
  [FeedbackStatus.REJECTED]: {
    badge: "bg-status-danger/15 text-status-danger border-status-danger/30",
    dot: "bg-status-danger",
  },
  [FeedbackStatus.ARCHIVED]: {
    badge: "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30",
    dot: "bg-zinc-500",
  },
};

const FALLBACK: StatusConfigEntry = {
  badge: "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30",
  dot: "bg-zinc-500",
};

export function getStatusConfig(status: string): StatusConfigEntry {
  return STATUS_CONFIG[status as FeedbackStatus] ?? FALLBACK;
}
```

- [ ] **Step 2: Point `badge.tsx`'s status variant at it**

`badge.tsx`'s local `STATUS_COLORS` is module-private and imported nowhere else, so it can be fully removed:

```tsx
// apps/web/src/components/ui/badge.tsx — remove the local STATUS_COLORS const entirely, update the import and the status branch
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/colors";
import { getStatusConfig } from "@/lib/statusConfig";

type BadgeVariant = "role" | "plan" | "category" | "status";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  admin: "bg-status-warning/15 text-status-warning border-status-warning/30",
  member: "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30",
  pro: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  enterprise: "bg-status-warning/15 text-status-warning border-status-warning/30",
};

interface BadgeProps {
  variant: BadgeVariant;
  value: string;
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ variant, value, size = "md", className }: BadgeProps) {
  let colorClass: string;

  if (variant === "category") {
    const c = getCategoryColor(value);
    colorClass = cn(c.bg, c.text, c.border);
  } else if (variant === "role") {
    colorClass = ROLE_COLORS[value.toLowerCase()] ?? "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30";
  } else if (variant === "plan") {
    colorClass = PLAN_COLORS[value.toLowerCase()] ?? "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30";
  } else {
    colorClass = getStatusConfig(value).badge;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wider",
        size === "sm"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2.5 py-1 text-[10px]",
        colorClass,
        className,
      )}
    >
      {value}
    </span>
  );
}
```

- [ ] **Step 3: Add (not replace) an export in `lib/colors.ts`**

Keep the existing `STATUS_COLORS` export exactly as-is (still consumed by `KanbanBoard.tsx` until the Kanban cluster migrates it in Phase 2) and just re-export the new config alongside it:

```ts
// apps/web/src/lib/colors.ts — add this export, change nothing else in the file
export { STATUS_CONFIG, getStatusConfig } from "./statusConfig";
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors (in particular, no error in `KanbanBoard.tsx` — confirming the additive change didn't break its existing `STATUS_COLORS` import).

Run: `pnpm --filter web exec eslint src/lib/statusConfig.ts src/components/ui/badge.tsx src/lib/colors.ts`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/statusConfig.ts apps/web/src/components/ui/badge.tsx apps/web/src/lib/colors.ts
git commit -m "feat(web): consolidate STATUS_CONFIG, point badge.tsx at it

lib/colors.ts keeps its existing STATUS_COLORS export (still used by
KanbanBoard.tsx) until the Kanban Phase-2 cluster migrates off it."
```

---

### Task 4: `StatusSelect` primitive

**Files:**
- Create: `apps/web/src/components/ui/status-select.tsx`
- Create: `apps/web/src/components/ui/status-select.stories.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/status-select.tsx
"use client";

import { useState } from "react";
import { FeedbackStatus } from "@insightstream/shared-types";
import { getStatusConfig } from "@/lib/statusConfig";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";
import { Check, ChevronDown } from "lucide-react";

const ALL_STATUSES = Object.values(FeedbackStatus);

interface StatusSelectProps {
  value: FeedbackStatus;
  onChange: (value: FeedbackStatus) => void;
  size?: "sm" | "md";
  className?: string;
}

export function StatusSelect({ value, onChange, size = "md", className }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const config = getStatusConfig(value);

  return (
    <Popover
      align="left"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider transition-colors",
            size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
            config.badge,
            className,
          )}
        >
          {value}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      }
    >
      <div className="flex flex-col gap-0.5 min-w-[140px]">
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              onChange(status);
              // Closes the popover on selection — Popover has no built-in
              // close-on-select; omitting this is a caught, recurring regression
              // (see Task 5's Select/FilterChips fixes for the same bug).
              setOpen(false);
            }}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors",
              status === value
                ? "text-brand-accent bg-brand-accent/5"
                : "text-brand-fg-muted hover:bg-white/5 hover:text-brand-fg",
            )}
          >
            {status}
            {status === value && <Check className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}
```

`className` here is applied only to `StatusSelect`'s own trigger button, never forwarded into `Popover`'s `className` — so this component does not have the trigger/panel `className`-target confusion that Task 5's `Select` had (that bug was specific to `Select` forwarding its `className` straight into `Popover`'s panel-only `className` prop; `StatusSelect` never does that here).

This depends on `Popover` from Task 5, which is done — Task 5 is executed before Task 4 in this plan's actual dependency order (Popover must exist first).

- [ ] **Step 2: Create its story**

```tsx
// apps/web/src/components/ui/status-select.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { FeedbackStatus } from '@insightstream/shared-types';
import { StatusSelect } from './status-select';

const meta: Meta<typeof StatusSelect> = {
  title: 'UI/StatusSelect',
  component: StatusSelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusSelect>;

function Controlled() {
  const [value, setValue] = useState(FeedbackStatus.NEW);
  return <StatusSelect value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/status-select.tsx src/components/ui/status-select.stories.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/status-select.tsx apps/web/src/components/ui/status-select.stories.tsx
git commit -m "feat(web): add StatusSelect primitive"
```

---

### Task 5: `Popover` primitive + refactor `dropdown.tsx`, `select.tsx`, `FilterChips.tsx` onto it

**Files:**
- Create: `apps/web/src/components/ui/popover.tsx`
- Create: `apps/web/src/components/ui/popover.stories.tsx`
- Modify: `apps/web/src/components/ui/dropdown.tsx`
- Modify: `apps/web/src/components/ui/select.tsx`
- Modify: `apps/web/src/components/ui/FilterChips.tsx`

There are 3 near-identical click-outside + positioned-panel implementations today (`Dropdown`, `Select`, `FilterChips`'s internal `DropdownChip`), each with its own `useRef`+`mousedown`-listener boilerplate. `Popover` centralizes that; the three refactors below change internals only — public props of `Dropdown`, `Select`, and `FilterChips` stay exactly as they are today, so no consumer file needs to change.

- [ ] **Step 1: Create `Popover`**

```tsx
// apps/web/src/components/ui/popover.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ trigger, children, align = "left", className, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;
  const ref = useRef<HTMLDivElement>(null);

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute top-full mt-2 z-50 rounded-xl border border-brand-border bg-brand-surface shadow-2xl p-1",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Create its story**

```tsx
// apps/web/src/components/ui/popover.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Popover } from './popover';
import { Button } from './button';

const meta: Meta<typeof Popover> = {
  title: 'UI/Popover',
  component: Popover,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Open</Button>,
    children: <div className="p-3 text-sm text-brand-fg">Popover content</div>,
  },
};
```

- [ ] **Step 3: Refactor `Dropdown` onto `Popover`**

Keep `Dropdown.Item`/`Dropdown.Separator` and the close-on-item-click injection logic (consumers rely on `Dropdown.Item` auto-closing the menu) — only the outer click-outside/positioning shell changes:

```tsx
// apps/web/src/components/ui/dropdown.tsx
"use client";

import { useState, cloneElement, Children } from "react";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";

interface DropdownItemProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  onClose?: () => void;
}

function DropdownItem({ onClick, icon, children, destructive, disabled, className, onClose }: DropdownItemProps) {
  return (
    <button
      onClick={() => { onClick?.(); onClose?.(); }}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
        destructive ? "text-red-400 hover:bg-red-500/10" : "text-brand-fg-muted hover:bg-white/5 hover:text-brand-fg",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      {children}
    </button>
  );
}

function DropdownSeparator() {
  return <div className="my-1 h-px bg-brand-border" />;
}

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

function Dropdown({ trigger, children, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const injectClose = (node: React.ReactNode): React.ReactNode => {
    if (!node || typeof node !== "object") return node;
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.type === DropdownItem) {
      return cloneElement(element as React.ReactElement<DropdownItemProps>, { onClose: close });
    }
    if (element.props?.children) {
      return cloneElement(element, { children: Children.map(element.props.children, injectClose) });
    }
    return node;
  };

  return (
    <Popover
      trigger={trigger}
      align={align}
      open={open}
      onOpenChange={setOpen}
      className={cn("min-w-[160px]", className)}
    >
      {Children.map(children, injectClose)}
    </Popover>
  );
}

Dropdown.Item = DropdownItem;
Dropdown.Separator = DropdownSeparator;

export { Dropdown };
```

- [ ] **Step 4: Refactor `Select` onto `Popover`**

```tsx
// apps/web/src/components/ui/select.tsx
"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  className?: string;
  placeholder?: string;
}

export function Select({ value, onChange, options, className, placeholder }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = value || placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className={cn("min-w-[120px] w-full mt-1.5 p-1", className)}
      trigger={
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-fg ring-offset-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/30 transition-all min-w-[120px]",
          )}
        >
          <span className="capitalize">{selectedOption}</span>
          <ChevronDown className="h-4 w-4 text-brand-fg-muted transition-transform duration-200" />
        </button>
      }
    >
      <div className="flex flex-col gap-0.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => { onChange(option); setOpen(false); }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
              value === option
                ? "bg-brand-accent/10 text-brand-accent font-medium"
                : "text-brand-fg-muted hover:bg-brand-surface hover:text-brand-fg",
            )}
          >
            <span className="capitalize">{option}</span>
            {value === option && <Check className="h-4 w-4 shrink-0" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}
```

Note: `Select` manages its own `open` state and passes it into `Popover`'s controlled mode specifically so option selection can call `setOpen(false)` — without this, choosing an option would no longer auto-close the panel (a real regression caught during implementation review, not a hypothetical). The chevron's `rotate-180`-on-open styling is still dropped for simplicity even though `open` is now available locally — a minor cosmetic detail, not a behavior change.

- [ ] **Step 5: Refactor `FilterChips`'s internal `DropdownChip` onto `Popover`**

`DropdownChip` is not exported — only its internal implementation changes; `FilterChips`'s own exported props (`groups`, `values`, `onChange`, `onClearAll`, `className`) are untouched:

```tsx
// apps/web/src/components/ui/FilterChips.tsx — only the DropdownChip function body changes, everything else in the file (ChipOption, FilterGroup, FilterChips) stays as-is
import { useState } from "react";
import { Popover } from "./popover";
// ... keep existing imports (cn, Check, ChevronDown, X) plus the above; drop the old useRef/useEffect click-outside imports, they're no longer needed

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

  function toggle(value: string) {
    if (group.multi) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
    }
  }

  const hasActive = selected.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="min-w-[160px] py-1"
      trigger={
        <button
          className={cn(
            "flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors",
            hasActive
              ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent"
              : "bg-transparent border-dashed border-brand-border/60 text-brand-fg/75 hover:border-brand-border hover:text-brand-fg",
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
      }
    >
      {group.options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => toggle(opt.value)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
            selected.includes(opt.value) ? "text-brand-accent bg-brand-accent/5" : "text-brand-fg hover:bg-brand-surface-hover",
          )}
        >
          <span className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0", selected.includes(opt.value) ? "border-brand-accent bg-brand-accent" : "border-brand-border")}>
            {selected.includes(opt.value) && <Check className="w-2.5 h-2.5 text-brand-bg" />}
          </span>
          {opt.label}
        </button>
      ))}
      {selected.length > 0 && (
        <button
          onClick={() => { onChange([]); setOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-fg-muted hover:text-brand-fg border-t border-brand-border mt-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </Popover>
  );
}
```

Note: `DropdownChip` manages its own `open` state, passed into `Popover`'s controlled mode, for the same reason as `Select` above — `toggle()`'s non-multi branch and the `Clear` button both need to close the panel explicitly, matching the original pre-refactor behavior exactly (multi-select stays open across toggles; non-multi selection and Clear both close). Omitting either `setOpen(false)` call is a regression, not a simplification — this was caught during implementation review and is called out here so a future re-read of this plan doesn't reintroduce it. Separately: this also drops the exit animation `FilterChips` never had (it was the one implementation of the 4 without `AnimatePresence`) — going through `Popover` now gives it the same fade/slide exit the other 3 already had. That part is an intentional side-effect of consolidation (uniform behavior), not a regression.

- [ ] **Step 6: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/popover.tsx src/components/ui/popover.stories.tsx src/components/ui/dropdown.tsx src/components/ui/select.tsx src/components/ui/FilterChips.tsx`
Expected: 0 errors.

Manually verify in the browser (per project convention for UI changes) once Phase 2 lands and the app is runnable end-to-end — Phase 1 alone has no consumer screens to click through, since these are internal-only refactors of already-wired-in components (`Dropdown`/`Select`/`FilterChips` are used throughout the existing dashboard, so a full app smoke-test after Phase 1 merges is still valuable if the environment allows it; not a hard gate for this task given the local Postgres/Redis port conflict noted earlier this session).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui/popover.tsx apps/web/src/components/ui/popover.stories.tsx apps/web/src/components/ui/dropdown.tsx apps/web/src/components/ui/select.tsx apps/web/src/components/ui/FilterChips.tsx
git commit -m "feat(web): add Popover primitive, refactor Dropdown/Select/FilterChips onto it"
```

---

### Task 6: `Tabs` / `SegmentedControl` / `ChoiceCard` primitives

**Files:**
- Create: `apps/web/src/components/ui/tabs.tsx`
- Create: `apps/web/src/components/ui/tabs.stories.tsx`
- Create: `apps/web/src/components/ui/segmented-control.tsx`
- Create: `apps/web/src/components/ui/segmented-control.stories.tsx`
- Create: `apps/web/src/components/ui/choice-card.tsx`
- Create: `apps/web/src/components/ui/choice-card.stories.tsx`
- Evaluate (no changes expected): `apps/web/src/components/ui/StatusTabs.tsx` — see Step 4

- [ ] **Step 1: Create `Tabs`**

Generic version of `StatusTabs`'s underline-tab pattern, without the count-pill (which stays `StatusTabs`-specific — see Step 4):

```tsx
// apps/web/src/components/ui/tabs.tsx
import { cn } from "@/lib/utils";

export interface TabItem {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function Tabs({ tabs, activeTab, onChange, className, rightSlot }: TabsProps) {
  return (
    <div className={cn("flex items-center border-b border-brand-border bg-brand-surface overflow-x-auto", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors",
            activeTab === tab.value ? "border-brand-accent text-brand-fg" : "border-transparent text-brand-fg-muted hover:text-brand-fg",
          )}
        >
          {tab.label}
        </button>
      ))}
      {rightSlot && <div className="ml-auto pr-4">{rightSlot}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `SegmentedControl`**

Generalizes the "pill group with an active option" pattern used today by `ModeButton`, the settings tab bar, and the widget shape/position/framework pickers:

```tsx
// apps/web/src/components/ui/segmented-control.tsx
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn("flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-w-[80px] px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            value === opt.value
              ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
              : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `ChoiceCard`**

Generalizes the selectable-card pattern (Feed/Kanban view toggle, color-theme picker):

```tsx
// apps/web/src/components/ui/choice-card.tsx
import { cn } from "@/lib/utils";

interface ChoiceCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ChoiceCard({ selected, onClick, children, className }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/30"
          : "border-brand-border bg-brand-surface hover:border-brand-border-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Decide against merging `StatusTabs` into `Tabs` — leave it as-is**

The design doc listed `StatusTabs.tsx` as a target for this consolidation. Evaluating it against the new `Tabs` primitive: `StatusTabs`'s per-tab count-pill (`{tab.count}` in its own colored badge) has no equivalent in generic `Tabs`, which renders a label only. Making `StatusTabs` delegate to `Tabs` internally would require adding a `rightAdornment`-per-tab prop to `Tabs` solely to serve this one caller — a generalization with exactly one use site, which is the opposite of what this consolidation is for (YAGNI). Decision: `StatusTabs.tsx` is left completely unmodified. It remains a small, separate component that happens to share `Tabs`'s visual style rather than delegating to it. No file changes, no commit for this file — the "Files" list above already reflects this (`StatusTabs.tsx` is listed as "evaluate, no changes expected", not "modify").

- [ ] **Step 5: Create stories**

```tsx
// apps/web/src/components/ui/tabs.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Tabs } from './tabs';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

function Controlled() {
  const [active, setActive] = useState('all');
  return (
    <Tabs
      tabs={[
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ]}
      activeTab={active}
      onChange={setActive}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

```tsx
// apps/web/src/components/ui/segmented-control.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { SegmentedControl } from './segmented-control';

const meta: Meta<typeof SegmentedControl> = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

function Controlled() {
  const [value, setValue] = useState('rounded');
  return (
    <SegmentedControl
      options={[
        { label: 'Circle', value: 'circle' },
        { label: 'Square', value: 'square' },
        { label: 'Rounded', value: 'rounded' },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

```tsx
// apps/web/src/components/ui/choice-card.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ChoiceCard } from './choice-card';

const meta: Meta<typeof ChoiceCard> = {
  title: 'UI/ChoiceCard',
  component: ChoiceCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChoiceCard>;

function Controlled() {
  const [selected, setSelected] = useState(false);
  return (
    <ChoiceCard selected={selected} onClick={() => setSelected((s) => !s)}>
      Feed view
    </ChoiceCard>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

- [ ] **Step 6: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/tabs.tsx src/components/ui/tabs.stories.tsx src/components/ui/segmented-control.tsx src/components/ui/segmented-control.stories.tsx src/components/ui/choice-card.tsx src/components/ui/choice-card.stories.tsx`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui/tabs.tsx apps/web/src/components/ui/tabs.stories.tsx apps/web/src/components/ui/segmented-control.tsx apps/web/src/components/ui/segmented-control.stories.tsx apps/web/src/components/ui/choice-card.tsx apps/web/src/components/ui/choice-card.stories.tsx
git commit -m "feat(web): add Tabs/SegmentedControl/ChoiceCard primitives

StatusTabs kept as its own small component (count-pill rendering
doesn't generalize cleanly into Tabs) rather than forced to delegate."
```

---

### Task 7: `Overlay` + `Drawer` primitives, refactor `Modal` onto `Overlay`

**Files:**
- Create: `apps/web/src/components/ui/overlay.tsx`
- Create: `apps/web/src/components/ui/drawer.tsx`
- Create: `apps/web/src/components/ui/drawer.stories.tsx`
- Modify: `apps/web/src/components/ui/modal.tsx`

- [ ] **Step 1: Create `Overlay`**

Extracted from `Modal`'s existing backdrop:

```tsx
// apps/web/src/components/ui/overlay.tsx
"use client";

import { motion } from "framer-motion";

interface OverlayProps {
  onClick?: () => void;
  className?: string;
}

export function Overlay({ onClick, className }: OverlayProps) {
  return (
    <motion.div
      className={className ?? "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}
```

- [ ] **Step 2: Refactor `Modal` onto `Overlay`**

Keep every existing prop (`isOpen`, `onClose`, `title`, `icon`, `footer`, `size`, `children`, `className`) exactly as-is — this file has many external consumers (every existing modal in the app), so its public API must not move:

```tsx
// apps/web/src/components/ui/modal.tsx
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Overlay } from "./overlay";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  footer,
  size = "md",
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <Overlay className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative bg-brand-bg border border-brand-border rounded-2xl w-full overflow-hidden",
              SIZES[size],
              className,
            )}
          >
            <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-surface/50">
              <h3 className="text-xl font-bold text-brand-fg flex items-center gap-2">
                {icon}
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-brand-fg-muted hover:text-brand-fg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">{children}</div>
            {footer && (
              <div className="p-4 border-t border-brand-border flex justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

Note: `Overlay`'s own `onClick` already stops nothing — the outer `<div onClick={onClose}>` still owns the click-to-dismiss behavior exactly as before (clicking the dialog itself calls `e.stopPropagation()` further down, unchanged). This refactor only moves the backdrop's motion-div markup into `Overlay`; behavior is identical.

- [ ] **Step 3: Create `Drawer`**

Slide-in panel built on `Overlay`, for the Comments and Sidebar Phase-2 clusters to adopt:

```tsx
// apps/web/src/components/ui/drawer.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Overlay } from "./overlay";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, side = "right", children, className }: DrawerProps) {
  const offscreen = side === "right" ? "100%" : "-100%";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <Overlay onClick={onClose} />
          <motion.div
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: "tween", duration: 0.25 }}
            className={cn(
              "fixed inset-y-0 z-50 w-full max-w-sm bg-brand-bg border-brand-border overflow-y-auto",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Create its story**

```tsx
// apps/web/src/components/ui/drawer.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Drawer } from './drawer';
import { Button } from './button';

const meta: Meta<typeof Drawer> = {
  title: 'UI/Drawer',
  component: Drawer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Drawer>;

function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer isOpen={open} onClose={() => setOpen(false)}>
        <div className="p-6 text-brand-fg">Drawer content</div>
      </Drawer>
    </>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/overlay.tsx src/components/ui/drawer.tsx src/components/ui/drawer.stories.tsx src/components/ui/modal.tsx`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/overlay.tsx apps/web/src/components/ui/drawer.tsx apps/web/src/components/ui/drawer.stories.tsx apps/web/src/components/ui/modal.tsx
git commit -m "feat(web): add Overlay/Drawer primitives, refactor Modal onto Overlay"
```

---

### Task 8: `ConfirmDialog` primitive

**Files:**
- Create: `apps/web/src/components/ui/confirm-dialog.tsx`
- Create: `apps/web/src/components/ui/confirm-dialog.stories.tsx`

- [ ] **Step 1: Create the component**

Built on `Modal`, using its `footer` slot for the confirm/cancel buttons:

```tsx
// apps/web/src/components/ui/confirm-dialog.tsx
"use client";

import { Modal } from "./modal";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-brand-fg-muted">{message}</p>
    </Modal>
  );
}
```

- [ ] **Step 2: Create its story**

```tsx
// apps/web/src/components/ui/confirm-dialog.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './button';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete project</Button>
      <ConfirmDialog
        open={open}
        title="Delete project?"
        message="This action cannot be undone. All feedback data for this project will be permanently deleted."
        confirmLabel="Delete"
        danger
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/confirm-dialog.tsx src/components/ui/confirm-dialog.stories.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/confirm-dialog.tsx apps/web/src/components/ui/confirm-dialog.stories.tsx
git commit -m "feat(web): add ConfirmDialog primitive"
```

---

### Task 9: `CommentThread` primitive

**Files:**
- Modify: `apps/web/src/hooks/useComments.ts` (export the `Comment` interface — currently module-private)
- Create: `apps/web/src/components/ui/comment-thread.tsx`
- Create: `apps/web/src/components/ui/comment-thread.stories.tsx`

- [ ] **Step 1: Export `Comment` from `useComments.ts`**

```ts
// apps/web/src/hooks/useComments.ts — change only the interface declaration's leading keyword
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}
```

(Rest of the file — `useComments` function body — is unchanged.)

- [ ] **Step 2: Create `CommentThread`**

Wraps `useComments`; the design doc's stated scope for this primitive is the list + input UI, matching what `FeedbackFeedItem.tsx`'s inline comment block and `CommentsPanel.tsx`'s separate copy both currently render by hand:

```tsx
// apps/web/src/components/ui/comment-thread.tsx
"use client";

import { useComments } from "@/hooks/useComments";
import { Button } from "./button";
import { Trash2 } from "lucide-react";

interface CommentThreadProps {
  feedbackId: string;
  currentUserId?: string;
}

export function CommentThread({ feedbackId, currentUserId }: CommentThreadProps) {
  const { comments, isLoading, draft, setDraft, submit, isSubmitting, deleteComment } =
    useComments(feedbackId);

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <p className="text-xs text-brand-fg-muted">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-brand-fg-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="text-brand-fg">{comment.content}</p>
                <p className="text-[11px] text-brand-fg-muted mt-0.5">
                  {comment.user?.name ?? comment.user?.email ?? "Unknown"}
                </p>
              </div>
              {comment.user?.id === currentUserId && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-brand-fg-muted hover:text-red-400 transition-colors shrink-0"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment..."
          className="flex-1 h-9 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-fg placeholder:text-brand-fg-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
        <Button size="sm" onClick={submit} isLoading={isSubmitting} disabled={!draft.trim()}>
          Post
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create its story**

Storybook has no live API to hit, so this story documents the component's shape without a functioning backend — acceptable since Phase 2's Comments cluster is responsible for the real end-to-end wiring and manual verification against a running app:

```tsx
// apps/web/src/components/ui/comment-thread.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CommentThread } from './comment-thread';

const meta: Meta<typeof CommentThread> = {
  title: 'UI/CommentThread',
  component: CommentThread,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CommentThread>;

export const Default: Story = {
  args: { feedbackId: 'story-feedback-id' },
};
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/hooks/useComments.ts src/components/ui/comment-thread.tsx src/components/ui/comment-thread.stories.tsx`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useComments.ts apps/web/src/components/ui/comment-thread.tsx apps/web/src/components/ui/comment-thread.stories.tsx
git commit -m "feat(web): add CommentThread primitive, export Comment type from useComments"
```

---

### Task 10: `FormField` primitive

**Files:**
- Create: `apps/web/src/components/ui/form-field.tsx`
- Create: `apps/web/src/components/ui/form-field.stories.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/form-field.tsx
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, icon: Icon, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="flex items-center gap-1.5 text-sm font-medium text-brand-fg">
        {Icon && <Icon className="h-3.5 w-3.5 text-brand-fg-muted" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create its story**

```tsx
// apps/web/src/components/ui/form-field.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mail } from 'lucide-react';
import { FormField } from './form-field';
import { Input } from './input';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Email',
    required: true,
    icon: Mail,
    children: <Input type="email" placeholder="you@example.com" />,
  },
};
```

(`Input` is confirmed as `input.tsx`'s exact export name — `export const Input = forwardRef<...>`.)

- [ ] **Step 3: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/form-field.tsx src/components/ui/form-field.stories.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/form-field.tsx apps/web/src/components/ui/form-field.stories.tsx
git commit -m "feat(web): add FormField primitive"
```

---

### Task 11: `NavItem` primitive

**Files:**
- Create: `apps/web/src/components/ui/nav-item.tsx`
- Create: `apps/web/src/components/ui/nav-item.stories.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/nav-item.tsx
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function NavItem({ href, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-brand-accent/10 text-brand-accent"
          : "text-brand-fg-muted hover:text-brand-fg hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Create its story**

```tsx
// apps/web/src/components/ui/nav-item.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LayoutDashboard } from 'lucide-react';
import { NavItem } from './nav-item';

const meta: Meta<typeof NavItem> = {
  title: 'UI/NavItem',
  component: NavItem,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NavItem>;

export const Default: Story = {
  args: { href: '#', icon: LayoutDashboard, label: 'Dashboard', active: false },
};

export const Active: Story = {
  args: { href: '#', icon: LayoutDashboard, label: 'Dashboard', active: true },
};
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/components/ui/nav-item.tsx src/components/ui/nav-item.stories.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/nav-item.tsx apps/web/src/components/ui/nav-item.stories.tsx
git commit -m "feat(web): add NavItem primitive"
```

---

### Task 12: `WidgetConfigForm` + `buildWidgetSnippet()`

**Files:**
- Create: `apps/web/src/lib/widgetSnippet.ts`
- Create: `apps/web/src/components/ui/widget-config-form.tsx`
- Create: `apps/web/src/components/ui/widget-config-form.stories.tsx`

Both `WidgetGeneratorModal.tsx` and `EmbedTab.tsx` today define byte-identical `COLORS`/`SHAPES`/`POSITIONS`/`FRAMEWORKS` consts and near-identical `getSnippet()` functions — `WidgetGeneratorModal` uses the placeholder string `"YOUR_API_KEY"` in its snippet, `EmbedTab` interpolates the real project API key directly. This task extracts a single parametrized version of both; the Embed/Widget Phase-2 cluster wires it into the two consumer files.

- [ ] **Step 1: Extract the pure snippet-builder + shared consts**

```ts
// apps/web/src/lib/widgetSnippet.ts
export const WIDGET_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Sky", value: "#0ea5e9" },
] as const;

export const WIDGET_SHAPES = ["circle", "square", "rounded"] as const;
export const WIDGET_POSITIONS = ["bottom-right", "bottom-left"] as const;
export const WIDGET_FRAMEWORKS = ["html", "react", "angular"] as const;

export interface WidgetSnippetConfig {
  /** the real API key, or a placeholder like "YOUR_API_KEY" */
  apiKey: string;
  color: string;
  shape: (typeof WIDGET_SHAPES)[number];
  position: (typeof WIDGET_POSITIONS)[number];
  framework: (typeof WIDGET_FRAMEWORKS)[number];
  scriptUrl?: string;
}

export function buildWidgetSnippet({
  apiKey,
  color,
  shape,
  position,
  framework,
  scriptUrl = process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:8080/dist/widget.iife.js",
}: WidgetSnippetConfig): string {
  if (framework === "react") {
    return `import { useEffect } from 'react';

const INSIGHT_STREAM_API_KEY = '${apiKey}';

export default function InsightStreamWidget() {
  useEffect(() => {
    // 1. Set configuration
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${color}',
      shape: '${shape}',
      position: '${position}'
    };

    // 2. Load the widget script
    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}`;
  }

  if (framework === "angular") {
    return `import { Component, OnInit, OnDestroy } from '@angular/core';

const INSIGHT_STREAM_API_KEY = '${apiKey}';

@Component({
  selector: 'app-insight-stream',
  template: '',
  standalone: true
})
export class InsightStreamComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit() {
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${color}',
      shape: '${shape}',
      position: '${position}'
    };

    this.scriptElement = document.createElement('script');
    this.scriptElement.src = "${scriptUrl}";
    this.scriptElement.async = true;
    document.body.appendChild(this.scriptElement);
  }

  ngOnDestroy() {
    if (this.scriptElement && document.body.contains(this.scriptElement)) {
      document.body.removeChild(this.scriptElement);
    }
  }
}`;
  }

  return `<!-- InsightStream AI Widget -->
<script id="insight-stream-config">
  window.InsightStreamConfig = {
    apiKey: '${apiKey}',
    color: '${color}',
    shape: '${shape}',
    position: '${position}'
  };
</script>
<script src="${scriptUrl}"></script>`;
}
```

- [ ] **Step 2: Create `WidgetConfigForm`**

A controlled component — callers own the selection state and pass it down, then call `buildWidgetSnippet()` themselves with the current values plus their own `apiKey`:

```tsx
// apps/web/src/components/ui/widget-config-form.tsx
"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_COLORS,
  WIDGET_SHAPES,
  WIDGET_POSITIONS,
  WIDGET_FRAMEWORKS,
} from "@/lib/widgetSnippet";

interface WidgetConfigFormProps {
  color: string;
  onColorChange: (value: string) => void;
  shape: (typeof WIDGET_SHAPES)[number];
  onShapeChange: (value: (typeof WIDGET_SHAPES)[number]) => void;
  position: (typeof WIDGET_POSITIONS)[number];
  onPositionChange: (value: (typeof WIDGET_POSITIONS)[number]) => void;
  framework: (typeof WIDGET_FRAMEWORKS)[number];
  onFrameworkChange: (value: (typeof WIDGET_FRAMEWORKS)[number]) => void;
}

export function WidgetConfigForm({
  color,
  onColorChange,
  shape,
  onShapeChange,
  position,
  onPositionChange,
  framework,
  onFrameworkChange,
}: WidgetConfigFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-brand-fg mb-3">Brand Color</p>
        <div className="flex gap-2.5 flex-wrap">
          {WIDGET_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onColorChange(c.value)}
              className={cn(
                "w-10 h-10 rounded-full transition-all flex items-center justify-center",
                color === c.value
                  ? "ring-2 ring-brand-primary ring-offset-2 ring-offset-brand-surface scale-110"
                  : "hover:scale-105 opacity-60 hover:opacity-100",
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            >
              {color === c.value && <Check strokeWidth={3} className="text-white w-5 h-5" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-semibold text-brand-fg mb-2">Button Shape</p>
          <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
            {WIDGET_SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onShapeChange(s)}
                className={cn(
                  "min-w-[90px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                  shape === s
                    ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                    : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-fg mb-2">Screen Position</p>
          <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
            {WIDGET_POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPositionChange(p)}
                className={cn(
                  "min-w-[110px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                  position === p
                    ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                    : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                )}
              >
                {p.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-brand-fg mb-2">Framework</p>
        <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
          {WIDGET_FRAMEWORKS.map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => onFrameworkChange(fw)}
              className={cn(
                "min-w-[80px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                framework === fw
                  ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                  : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
              )}
            >
              {fw === "html" ? "HTML" : fw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create its story**

```tsx
// apps/web/src/components/ui/widget-config-form.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { WidgetConfigForm } from './widget-config-form';
import { WIDGET_COLORS, WIDGET_SHAPES, WIDGET_POSITIONS, WIDGET_FRAMEWORKS } from '@/lib/widgetSnippet';

const meta: Meta<typeof WidgetConfigForm> = {
  title: 'UI/WidgetConfigForm',
  component: WidgetConfigForm,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WidgetConfigForm>;

function Controlled() {
  const [color, setColor] = useState<string>(WIDGET_COLORS[0].value);
  const [shape, setShape] = useState<(typeof WIDGET_SHAPES)[number]>('rounded');
  const [position, setPosition] = useState<(typeof WIDGET_POSITIONS)[number]>('bottom-right');
  const [framework, setFramework] = useState<(typeof WIDGET_FRAMEWORKS)[number]>('html');

  return (
    <WidgetConfigForm
      color={color}
      onColorChange={setColor}
      shape={shape}
      onShapeChange={setShape}
      position={position}
      onPositionChange={setPosition}
      framework={framework}
      onFrameworkChange={setFramework}
    />
  );
}

export const Default: Story = {
  render: () => <Controlled />,
};
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no new errors.

Run: `pnpm --filter web exec eslint src/lib/widgetSnippet.ts src/components/ui/widget-config-form.tsx src/components/ui/widget-config-form.stories.tsx`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/widgetSnippet.ts apps/web/src/components/ui/widget-config-form.tsx apps/web/src/components/ui/widget-config-form.stories.tsx
git commit -m "feat(web): add WidgetConfigForm + buildWidgetSnippet, extracted from WidgetGeneratorModal/EmbedTab duplication"
```

- [ ] **Step 6: Wrap-up — record the `button.stories.tsx` finding in `PLAN.md`**

Add one line under `PLAN.md`'s 🔍 Analysis Backlog or as a new small 🟡 Future Improvements row noting: `button.stories.tsx` references `size: 'lg'` and `variant: 'outline'`/`'brand'` that don't exist on `Button`, undetected because `*.stories.tsx` is excluded from `tsconfig.json`'s type-checked `include` — decide separately whether to add those variants or trim the stories to match reality. Do not implement either fix as part of this plan (out of the approved design's scope).

---

## Final verification (all of Phase 1)

- [ ] Run: `pnpm --filter web exec tsc --noEmit` — expect 0 errors.
- [ ] Run: `pnpm --filter web exec eslint .` — expect the same pre-existing baseline as before this plan started (no new errors; new files may add the same kind of `no-unsafe-*`/`no-unused-vars` warnings already common elsewhere, but zero new `error`-level findings).
- [ ] Confirm every new file under `components/ui/` has a matching `.stories.tsx` (10 primitives × 1 story each, per the discipline rule).
- [ ] Push to a branch and merge into `main` before Phase 2 dispatch begins — Phase 2's 8 clusters all depend on these primitives existing.

## Spec coverage check (self-review)

Every Phase 1 bullet from the design doc has a task: Eyebrow (Task 1), Button xs (Task 2), StatusSelect + STATUS_CONFIG (Tasks 3–4), Popover + Dropdown/Select/FilterChips refactor (Task 5), Tabs/SegmentedControl/ChoiceCard + StatusTabs refactor (Task 6), Drawer/Overlay + Modal refactor (Task 7), ConfirmDialog (Task 8), CommentThread (Task 9), FormField (Task 10), NavItem (Task 11), WidgetConfigForm (Task 12). The file-ownership rule's exception (`lib/colors.ts` keeping its old export) is called out both in the Pre-flight section and inline in Task 3.

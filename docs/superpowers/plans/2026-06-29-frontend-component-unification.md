# Frontend Component Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 11 repeated UI patterns into reusable components in `components/ui/`, then replace all instances across 20+ files.

**Architecture:** Bottom-up — atoms first (Badge, EmptyState, Skeleton, CopyButton, SentimentBar, UsageMeter), then molecules (Section, ListItem, LabeledSection), then organisms (Modal, Dropdown). No file is migrated until the component it needs exists.

**Tech Stack:** Next.js 16 App Router, React 19, TailwindCSS 4, Framer Motion, Lucide React, `cn()` from `@/lib/utils`

---

## File Map

**New files (create):**
- `apps/web/src/components/ui/badge.tsx`
- `apps/web/src/components/ui/empty-state.tsx`
- `apps/web/src/components/ui/skeleton.tsx`
- `apps/web/src/components/ui/copy-button.tsx`
- `apps/web/src/components/ui/sentiment-bar.tsx`
- `apps/web/src/components/ui/usage-meter.tsx`
- `apps/web/src/components/ui/section.tsx`
- `apps/web/src/components/ui/list-item.tsx`
- `apps/web/src/components/ui/labeled-section.tsx`
- `apps/web/src/components/ui/modal.tsx`
- `apps/web/src/components/ui/dropdown.tsx`

**Files to migrate (modify):**
- `apps/web/src/components/dashboard/KanbanCard.tsx` — Badge (category), SentimentBar
- `apps/web/src/components/dashboard/KanbanColumn.tsx` — EmptyState
- `apps/web/src/components/dashboard/ActivityFeed.tsx` — Skeleton, EmptyState
- `apps/web/src/components/dashboard/CommentsPanel.tsx` — Skeleton, EmptyState, ListItem
- `apps/web/src/components/dashboard/CreateProjectModal.tsx` — Modal
- `apps/web/src/components/dashboard/WidgetGeneratorModal.tsx` — Modal, CopyButton
- `apps/web/src/components/dashboard/DigestModal.tsx` — Modal, SentimentBar, LabeledSection
- `apps/web/src/components/dashboard/FilterBar.tsx` — Dropdown
- `apps/web/src/components/dashboard/KanbanBoard.tsx` — Dropdown
- `apps/web/src/components/dashboard/Sidebar.tsx` — Dropdown
- `apps/web/src/components/teams/CreateTeamModal.tsx` — Modal
- `apps/web/src/components/teams/CreateTeamProjectModal.tsx` — Modal
- `apps/web/src/components/billing/CurrentPlanCard.tsx` — Badge, UsageMeter
- `apps/web/src/components/billing/UsageMetrics.tsx` — UsageMeter (remove internal ProgressBar)
- `apps/web/src/components/analytics/AnalyticsOverview.tsx` — Section
- `apps/web/src/app/dashboard/page.tsx` — Section, Skeleton
- `apps/web/src/app/dashboard/activity/page.tsx` — Section
- `apps/web/src/app/dashboard/archive/page.tsx` — Section, Skeleton, EmptyState, Badge
- `apps/web/src/app/dashboard/embed/page.tsx` — Section, CopyButton, LabeledSection
- `apps/web/src/app/dashboard/settings/page.tsx` — Section, UsageMeter, ListItem
- `apps/web/src/app/dashboard/settings/team/page.tsx` — Section, Badge, ListItem

---

## Phase 1 — Atoms

### Task 1: Badge

**Files:**
- Create: `apps/web/src/components/ui/badge.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/badge.tsx
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/colors";

type BadgeVariant = "role" | "plan" | "category" | "status";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  admin: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  member: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  pro: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  enterprise: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "In Review": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "In Progress": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  archived: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  Rejected: "bg-red-500/15 text-red-300 border-red-500/30",
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
    colorClass = ROLE_COLORS[value.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  } else if (variant === "plan") {
    colorClass = PLAN_COLORS[value.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  } else {
    colorClass = STATUS_COLORS[value] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
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

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors related to `badge.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/badge.tsx
git commit -m "feat(web): add Badge atom component"
```

---

### Task 2: EmptyState

**Files:**
- Create: `apps/web/src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/empty-state.tsx
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "py-6 gap-2" : "py-10 gap-3",
        className,
      )}
    >
      <Icon
        className={cn(
          "text-indigo-400 opacity-40",
          size === "sm" ? "h-8 w-8" : "h-12 w-12",
        )}
      />
      <p className={cn("font-medium text-zinc-400", size === "sm" ? "text-xs" : "text-sm")}>
        {title}
      </p>
      {description && (
        <p className="text-xs text-brand-muted max-w-[200px]">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/empty-state.tsx
git commit -m "feat(web): add EmptyState atom component"
```

---

### Task 3: Skeleton

**Files:**
- Create: `apps/web/src/components/ui/skeleton.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

interface SkeletonProps {
  count?: number;
  height?: string;
  layout?: "list" | "grid";
  cols?: number;
  className?: string;
}

export function Skeleton({
  count = 3,
  height = "h-10",
  layout = "list",
  cols = 2,
  className,
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (layout === "grid") {
    return (
      <div
        className={cn("grid gap-3", `grid-cols-${cols}`, className)}
      >
        {items.map((i) => (
          <div
            key={i}
            className={cn("bg-brand-border/40 rounded-xl animate-pulse", height)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((i) => (
        <div
          key={i}
          className={cn("bg-brand-border/40 rounded-xl animate-pulse", height)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/skeleton.tsx
git commit -m "feat(web): add Skeleton atom component"
```

---

### Task 4: CopyButton

**Files:**
- Create: `apps/web/src/components/ui/copy-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/copy-button.tsx
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ButtonHTMLAttributes } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  size?: "xs" | "sm" | "md";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "brand";
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  variant = "outline",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      onClick={handleCopy}
      size={size}
      variant={variant}
      className={className}
    >
      {copied ? (
        <Check className="h-3 w-3 mr-1.5 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 mr-1.5" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/copy-button.tsx
git commit -m "feat(web): add CopyButton atom component"
```

---

### Task 5: SentimentBar

**Files:**
- Create: `apps/web/src/components/ui/sentiment-bar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/sentiment-bar.tsx
import { cn } from "@/lib/utils";

interface SentimentBarProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function SentimentBar({
  score,
  showLabel = true,
  className,
}: SentimentBarProps) {
  const colorClass =
    score > 0.6
      ? "bg-emerald-500"
      : score < 0.4
        ? "bg-red-500"
        : "bg-amber-500";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-brand-muted font-medium font-mono">
          {Math.round(score * 100)}%
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/sentiment-bar.tsx
git commit -m "feat(web): add SentimentBar atom component"
```

---

### Task 6: UsageMeter

**Files:**
- Create: `apps/web/src/components/ui/usage-meter.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/usage-meter.tsx
import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  current: number;
  max: number | null;
  className?: string;
}

export function UsageMeter({ label, current, max, className }: UsageMeterProps) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0;
  const colorClass =
    pct >= 90
      ? "bg-red-500"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-indigo-500";

  return (
    <div
      className={cn(
        "p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50",
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-white">
        {current}{" "}
        <span className="text-zinc-500 text-sm font-normal">
          / {max === null ? "∞" : max}
        </span>
      </p>
      {max !== null && (
        <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", colorClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/usage-meter.tsx
git commit -m "feat(web): add UsageMeter atom component"
```

---

## Phase 2 — Molecules

### Task 7: Section

**Files:**
- Create: `apps/web/src/components/ui/section.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/section.tsx
import { cn } from "@/lib/utils";

const PADDING = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const GLOW_CLASSES = {
  "top-right":
    "absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none",
  "bottom-left":
    "absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none",
};

interface SectionProps {
  children: React.ReactNode;
  glow?: "top-right" | "bottom-left" | "none";
  padding?: "sm" | "md" | "lg";
  className?: string;
  as?: React.ElementType;
}

export function Section({
  children,
  glow = "top-right",
  padding = "md",
  className,
  as: Tag = "section",
}: SectionProps) {
  return (
    <Tag
      className={cn(
        "bg-brand-surface/60 border border-brand-border/50 rounded-2xl shadow-xl relative overflow-hidden",
        PADDING[padding],
        className,
      )}
    >
      {glow !== "none" && <div className={GLOW_CLASSES[glow]} />}
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/section.tsx
git commit -m "feat(web): add Section molecule component"
```

---

### Task 8: ListItem

**Files:**
- Create: `apps/web/src/components/ui/list-item.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/list-item.tsx
import { cn } from "@/lib/utils";

interface ListItemProps {
  icon?: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ListItem({
  icon,
  primary,
  secondary,
  actions,
  className,
}: ListItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-200 truncate">
            {primary}
          </div>
          {secondary && (
            <div className="text-[10px] text-brand-muted mt-0.5">{secondary}</div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/list-item.tsx
git commit -m "feat(web): add ListItem molecule component"
```

---

### Task 9: LabeledSection

**Files:**
- Create: `apps/web/src/components/ui/labeled-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/labeled-section.tsx
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  iconColor = "text-indigo-400",
  children,
  className,
}: LabeledSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/labeled-section.tsx
git commit -m "feat(web): add LabeledSection molecule component"
```

---

## Phase 3 — Organisms

### Task 10: Modal

**Files:**
- Create: `apps/web/src/components/ui/modal.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/modal.tsx
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
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
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {icon}
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
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

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/modal.tsx
git commit -m "feat(web): add Modal organism component"
```

---

### Task 11: Dropdown

**Files:**
- Create: `apps/web/src/components/ui/dropdown.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/ui/dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownItemProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  onClose?: () => void;
}

function DropdownItem({
  onClick,
  icon,
  children,
  destructive,
  disabled,
  className,
  onClose,
}: DropdownItemProps) {
  return (
    <button
      onClick={() => {
        onClick?.();
        onClose?.();
      }}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
        destructive
          ? "text-red-400 hover:bg-red-500/10"
          : "text-zinc-300 hover:bg-white/5 hover:text-white",
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
  return <div className="my-1 h-px bg-zinc-800" />;
}

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "left",
  className,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const childrenWithClose = Array.isArray(children)
    ? children.map((child, i) => {
        if (!child || typeof child !== "object" || !("type" in child)) return child;
        if (child.type === DropdownItem) {
          return { ...child, props: { ...child.props, onClose: close }, key: i };
        }
        return child;
      })
    : children;

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setIsOpen((v) => !v)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute top-full mt-2 z-50 min-w-[160px] rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl p-1",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {childrenWithClose}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Dropdown.Item = DropdownItem;
Dropdown.Separator = DropdownSeparator;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/dropdown.tsx
git commit -m "feat(web): add Dropdown organism component"
```

---

## Phase 4 — Migrations

### Task 12: Migrate KanbanCard

**Files:**
- Modify: `apps/web/src/components/dashboard/KanbanCard.tsx`

Replace the category badge (lines ~76–90) and sentiment bar (lines ~170–191) with the new components.

- [ ] **Step 1: Update imports**

At the top of `KanbanCard.tsx`, add:
```tsx
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "@/components/ui/sentiment-bar";
```
Remove the `getCategoryColor` import — it is no longer used directly in this file.

- [ ] **Step 2: Replace the category badge JSX**

Find the block that renders `source` and `category` badges. Replace the `category` span with:
```tsx
{feedback.category && (
  <Badge variant="category" value={feedback.category} size="sm" />
)}
```
The `source` badge (`bg-indigo-500/10 text-indigo-400`) stays as-is — it doesn't map to any Badge variant.

- [ ] **Step 3: Replace the sentiment bar JSX**

Find the sentiment score block (the `w-10 h-1 bg-brand-border` div + percentage span). Replace the entire `<div className="flex items-center gap-1.5">...</div>` with:
```tsx
<SentimentBar score={feedback.sentimentScore} />
```
Keep the surrounding conditional `feedback.sentimentScore !== null && feedback.sentimentScore !== undefined`.

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanCard.tsx
git commit -m "refactor(web): use Badge and SentimentBar in KanbanCard"
```

---

### Task 13: Migrate KanbanColumn

**Files:**
- Modify: `apps/web/src/components/dashboard/KanbanColumn.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
```

- [ ] **Step 2: Replace the empty state JSX**

Find the block on `feedbacks.length === 0`:
```tsx
// BEFORE
<div className="h-full min-h-[150px] flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800/60 rounded-xl m-2 bg-zinc-900/20">
  <Search className="h-6 w-6 mb-2 opacity-30" />
  <span className="text-xs font-medium opacity-50">Empty</span>
</div>

// AFTER
<div className="h-full min-h-[150px] flex items-center justify-center m-2 border-2 border-dashed border-zinc-800/60 rounded-xl bg-zinc-900/20">
  <EmptyState icon={Search} title="Empty" size="sm" />
</div>
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanColumn.tsx
git commit -m "refactor(web): use EmptyState in KanbanColumn"
```

---

### Task 14: Migrate ActivityFeed

**Files:**
- Modify: `apps/web/src/components/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
```

- [ ] **Step 2: Replace loading skeleton**

Find the `isLoading` block (the `space-y-3` div with 4 pulse items). Replace with:
```tsx
<Skeleton count={4} height="h-10" />
```

- [ ] **Step 3: Replace empty state**

Find the `!events?.length` branch:
```tsx
// BEFORE
<p className="text-sm text-brand-muted text-center py-4">
  No activity yet
</p>

// AFTER
<EmptyState icon={Activity} title="No activity yet" size="sm" />
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/ActivityFeed.tsx
git commit -m "refactor(web): use Skeleton and EmptyState in ActivityFeed"
```

---

### Task 15: Migrate CommentsPanel

**Files:**
- Modify: `apps/web/src/components/dashboard/CommentsPanel.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/dashboard/CommentsPanel.tsx` fully before editing.

- [ ] **Step 2: Update imports**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
```

- [ ] **Step 3: Replace loading skeleton**

Find the `isLoading` animate-pulse block. Replace the entire `space-y-X` div with:
```tsx
<Skeleton count={3} height="h-14" />
```

- [ ] **Step 4: Replace empty state**

Find the empty comments message. Replace with:
```tsx
<EmptyState icon={MessageCircle} title="No comments yet" size="sm" />
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/dashboard/CommentsPanel.tsx
git commit -m "refactor(web): use Skeleton and EmptyState in CommentsPanel"
```

---

### Task 16: Migrate CreateProjectModal → Modal

**Files:**
- Modify: `apps/web/src/components/dashboard/CreateProjectModal.tsx`

- [ ] **Step 1: Update imports**

Remove: `import { X } from "lucide-react"`, `import { motion, AnimatePresence } from "framer-motion"`
Add: `import { Modal } from "@/components/ui/modal"`

- [ ] **Step 2: Replace the entire JSX shell**

The current component renders `if (!isOpen) return null` then `<AnimatePresence><div fixed inset-0...><motion.div...>` with header/body/footer.

Replace everything after the mutation definition with:

```tsx
return (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Create New Project"
    footer={
      <>
        <Button
          className="flex-1 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300"
          onClick={onClose}
          disabled={createMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          onClick={() => {
            if (!name.trim()) return alert("Project name is required");
            if (!domain.trim())
              return alert("Project domain is required for security");
            createMutation.mutate();
          }}
          isLoading={createMutation.isPending}
          disabled={!name.trim() || !domain.trim()}
        >
          🚀 Create Project
        </Button>
      </>
    }
  >
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 ml-1">
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
        <label className="text-sm font-medium text-zinc-300 ml-1">
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

      <p className="text-xs text-brand-muted pt-2 leading-relaxed">
        A unique API Key will be automatically generated. You can use this
        key to identify feedback from your website.
      </p>
    </div>
  </Modal>
);
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. The `if (!isOpen) return null` guard can be removed since `Modal` handles `isOpen` internally.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/CreateProjectModal.tsx
git commit -m "refactor(web): use Modal in CreateProjectModal"
```

---

### Task 17: Migrate CreateTeamModal → Modal

**Files:**
- Modify: `apps/web/src/components/teams/CreateTeamModal.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/teams/CreateTeamModal.tsx` fully before editing.

- [ ] **Step 2: Update imports**

Remove: `X`, `motion`, `AnimatePresence` imports.
Add: `import { Modal } from "@/components/ui/modal"`

- [ ] **Step 3: Replace the JSX shell**

Apply the same pattern as Task 16: wrap the body content in `<Modal isOpen={isOpen} onClose={onClose} title="..." footer={...}>`. Keep all inner form logic unchanged.

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/teams/CreateTeamModal.tsx
git commit -m "refactor(web): use Modal in CreateTeamModal"
```

---

### Task 18: Migrate CreateTeamProjectModal → Modal

**Files:**
- Modify: `apps/web/src/components/teams/CreateTeamProjectModal.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/teams/CreateTeamProjectModal.tsx` fully before editing.

- [ ] **Step 2: Apply the Modal pattern**

Same as Task 16–17: remove `X`, `motion`, `AnimatePresence`, add `Modal`, wrap body.

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/teams/CreateTeamProjectModal.tsx
git commit -m "refactor(web): use Modal in CreateTeamProjectModal"
```

---

### Task 19: Migrate WidgetGeneratorModal → Modal + CopyButton

**Files:**
- Modify: `apps/web/src/components/dashboard/WidgetGeneratorModal.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/dashboard/WidgetGeneratorModal.tsx` fully before editing.

- [ ] **Step 2: Update imports**

Add: `import { Modal } from "@/components/ui/modal"`, `import { CopyButton } from "@/components/ui/copy-button"`
Remove: `X`, `motion`, `AnimatePresence`, any `useState(copied)` for clipboard.

- [ ] **Step 3: Replace modal shell**

Wrap the body in `<Modal>` as in previous tasks.

- [ ] **Step 4: Replace each CopyButton instance**

For every block that implements `copied` state + `setTimeout` + `Copy/Check` icon swap, replace with:
```tsx
<CopyButton text={theTextToCopy} label="Copy Code" size="sm" />
```
Delete the now-unused `useState(copied)` and `handleCopy` functions.

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/dashboard/WidgetGeneratorModal.tsx
git commit -m "refactor(web): use Modal and CopyButton in WidgetGeneratorModal"
```

---

### Task 20: Migrate DigestModal → Modal + SentimentBar + LabeledSection

**Files:**
- Modify: `apps/web/src/components/dashboard/DigestModal.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/dashboard/DigestModal.tsx` fully before editing.

- [ ] **Step 2: Update imports**

Add: `Modal`, `SentimentBar`, `LabeledSection`. Remove: `X`, `motion`, `AnimatePresence`.

- [ ] **Step 3: Replace modal shell**

Wrap content in `<Modal isOpen={isOpen} onClose={onClose} title="AI Digest" size="lg">`.

- [ ] **Step 4: Replace sentiment bar instances**

Every `w-10 h-1 bg-brand-border...` + percentage span pair → `<SentimentBar score={value} />`.

- [ ] **Step 5: Replace labeled section headers**

Every `<div className="flex items-center gap-2 mb-3"><Icon .../><span className="text-[10px] font-bold uppercase tracking-widest...">Label</span></div>` block → `<LabeledSection icon={Icon} label="Label">...</LabeledSection>`.

- [ ] **Step 6: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard/DigestModal.tsx
git commit -m "refactor(web): use Modal, SentimentBar, LabeledSection in DigestModal"
```

---

### Task 21: Migrate UsageMetrics → UsageMeter

**Files:**
- Modify: `apps/web/src/components/billing/UsageMetrics.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/billing/UsageMetrics.tsx` fully.

- [ ] **Step 2: Replace internal ProgressBar with UsageMeter**

The file likely has an internal `ProgressBar` or `UsageMeter` function. Replace every usage of that internal component with `<UsageMeter>` from `@/components/ui/usage-meter`, then delete the internal function entirely.

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/billing/UsageMetrics.tsx
git commit -m "refactor(web): use shared UsageMeter in UsageMetrics"
```

---

### Task 22: Migrate settings/page → Section + UsageMeter + ListItem

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Read the file**

Read the full file before editing.

- [ ] **Step 2: Update imports**

Add: `Section`, `UsageMeter`, `ListItem` from their respective paths. Remove any internal `UsageMeter` or `ProgressBar` function definition in this file.

- [ ] **Step 3: Replace section wrappers**

Every `<section className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6 shadow-xl relative ...">` block → `<Section>`. If `glow` position differs from default, pass `glow="bottom-left"`.

- [ ] **Step 4: Replace usage meters**

Every inline usage meter (label + current/max + progress bar) → `<UsageMeter label="..." current={x} max={y} />`.

- [ ] **Step 5: Replace list rows**

Each `<div className="... flex items-center justify-between p-3 bg-zinc-950/50 ...">icon + text + actions</div>` → `<ListItem icon={...} primary={...} secondary={...} actions={...} />`.

- [ ] **Step 6: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/settings/page.tsx
git commit -m "refactor(web): use Section, UsageMeter, ListItem in settings page"
```

---

### Task 23: Migrate settings/team/page → Section + Badge + ListItem

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/team/page.tsx`

- [ ] **Step 1: Read the file**

Read the full file.

- [ ] **Step 2: Update imports**

Add: `Section`, `Badge`, `ListItem`.

- [ ] **Step 3: Replace section wrappers, role badges, and member list rows**

Apply same pattern as Task 22. For role badges:
```tsx
// BEFORE
<span className={cn("px-2.5 py-1 rounded-full ...", ROLE_COLORS[member.role])}>
  {member.role}
</span>

// AFTER
<Badge variant="role" value={member.role} />
```
Delete the `ROLE_COLORS` constant from this file.

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/settings/team/page.tsx
git commit -m "refactor(web): use Section, Badge, ListItem in team settings page"
```

---

### Task 24: Migrate archive/page → Section + Skeleton + EmptyState + Badge

**Files:**
- Modify: `apps/web/src/app/dashboard/archive/page.tsx`

- [ ] **Step 1: Read the file**

Read the full file.

- [ ] **Step 2: Update imports**

Add: `Section`, `Skeleton`, `EmptyState`, `Badge`.

- [ ] **Step 3: Replace in order**

- Section wrappers → `<Section>`
- Skeleton loaders → `<Skeleton count={X} height="hY" />`
- Empty state → `<EmptyState icon={Archive} title="Nothing archived yet" description="Resolved feedback will appear here." />`
- Category spans → `<Badge variant="category" value={feedback.category} size="sm" />`

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/archive/page.tsx
git commit -m "refactor(web): use Section, Skeleton, EmptyState, Badge in archive page"
```

---

### Task 25: Migrate embed/page → Section + CopyButton + LabeledSection

**Files:**
- Modify: `apps/web/src/app/dashboard/embed/page.tsx`

- [ ] **Step 1: Read the file**

Read the full file.

- [ ] **Step 2: Update imports**

Add: `Section`, `CopyButton`, `LabeledSection`. Remove any internal `copied` useState logic for clipboard.

- [ ] **Step 3: Replace section wrappers**

Every large surface card div → `<Section>` with appropriate `padding` and `glow`.

- [ ] **Step 4: Replace copy buttons**

Every `copied` state + `handleCopy` function + `Copy/Check` icon swap → `<CopyButton text={...} label="Copy Code" />`. Delete the now-unused state and handlers.

- [ ] **Step 5: Replace labeled section headers**

Icon + uppercase tracking-widest label combos → `<LabeledSection icon={...} label="...">`.

- [ ] **Step 6: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/dashboard/embed/page.tsx
git commit -m "refactor(web): use Section, CopyButton, LabeledSection in embed page"
```

---

### Task 26: Migrate dashboard/page + activity/page + billing/page → Section + Skeleton

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/dashboard/activity/page.tsx`
- Modify: `apps/web/src/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Read all three files**

- [ ] **Step 2: Add imports to each**

```tsx
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton"; // only where skeletons exist
```

- [ ] **Step 3: Replace section wrappers and skeletons in all three files**

Surface card divs → `<Section>`, animate-pulse blocks → `<Skeleton>`.

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx apps/web/src/app/dashboard/activity/page.tsx apps/web/src/app/dashboard/billing/page.tsx
git commit -m "refactor(web): use Section and Skeleton in dashboard, activity, billing pages"
```

---

### Task 27: Migrate AnalyticsOverview + CurrentPlanCard → Section + Badge + UsageMeter

**Files:**
- Modify: `apps/web/src/components/analytics/AnalyticsOverview.tsx`
- Modify: `apps/web/src/components/billing/CurrentPlanCard.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Migrate AnalyticsOverview**

Add `Section` import. Replace surface card wrappers with `<Section>`.

- [ ] **Step 3: Migrate CurrentPlanCard**

Add `Badge`, `UsageMeter` imports. Replace plan badge span with `<Badge variant="plan" value={plan} />`. Replace any progress meter with `<UsageMeter label="..." current={x} max={y} />`.

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/analytics/AnalyticsOverview.tsx apps/web/src/components/billing/CurrentPlanCard.tsx
git commit -m "refactor(web): use Section, Badge, UsageMeter in analytics and billing"
```

---

### Task 28: Migrate FilterBar → Dropdown

**Files:**
- Modify: `apps/web/src/components/dashboard/FilterBar.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/dashboard/FilterBar.tsx` fully.

- [ ] **Step 2: Update imports**

Add: `import { Dropdown } from "@/components/ui/dropdown"`
Remove: `motion`, `AnimatePresence`, and any `useState(isOpen)` for filter dropdowns.

- [ ] **Step 3: Replace each filter dropdown**

For each filter (category, status, date, etc.), the pattern is:
```tsx
// BEFORE: manual isOpen state + AnimatePresence + backdrop
const [isOpen, setIsOpen] = useState(false);
<>
  <button onClick={() => setIsOpen(v => !v)}>...</button>
  {isOpen && <div onClick={() => setIsOpen(false)} />} {/* backdrop */}
  <AnimatePresence>{isOpen && <motion.div>...options</motion.div>}</AnimatePresence>
</>

// AFTER
<Dropdown trigger={<button>...</button>} align="left">
  {options.map(opt => (
    <Dropdown.Item key={opt} onClick={() => onSelect(opt)}>
      {opt}
    </Dropdown.Item>
  ))}
</Dropdown>
```

- [ ] **Step 4: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/FilterBar.tsx
git commit -m "refactor(web): use Dropdown in FilterBar"
```

---

### Task 29: Migrate KanbanBoard ExportMenu → Dropdown

**Files:**
- Modify: `apps/web/src/components/dashboard/KanbanBoard.tsx`

- [ ] **Step 1: Read the file**

Read the ExportMenu section of `apps/web/src/components/dashboard/KanbanBoard.tsx`.

- [ ] **Step 2: Replace ExportMenu**

Add: `import { Dropdown } from "@/components/ui/dropdown"`

The ExportMenu component (which manages its own `isOpen` state + AnimatePresence) gets replaced:
```tsx
// Replace ExportMenu internals with:
<Dropdown trigger={<Button variant="outline" size="sm">Export <ChevronDown /></Button>} align="right">
  <Dropdown.Item icon={<FileText className="h-3.5 w-3.5" />} onClick={() => exportToCSV(feedbacks)}>
    Export CSV
  </Dropdown.Item>
  <Dropdown.Item icon={<Download className="h-3.5 w-3.5" />} onClick={() => exportToJSON(feedbacks)}>
    Export JSON
  </Dropdown.Item>
</Dropdown>
```
Delete the separate `ExportMenu` component definition if it exists.

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanBoard.tsx
git commit -m "refactor(web): use Dropdown for ExportMenu in KanbanBoard"
```

---

### Task 30: Migrate Sidebar → Dropdown

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Read the file**

Read `apps/web/src/components/dashboard/Sidebar.tsx` fully — it's the largest migration.

- [ ] **Step 2: Update imports**

Add: `import { Dropdown } from "@/components/ui/dropdown"`
Remove `motion`, `AnimatePresence` if only used for the dropdowns.

- [ ] **Step 3: Replace team picker dropdown**

The team selector (team name button + dropdown list of teams) maps to:
```tsx
<Dropdown trigger={<button>{currentTeam?.name} <ChevronDown /></button>}>
  {teams.map(team => (
    <Dropdown.Item key={team.id} onClick={() => setCurrentTeam(team)}>
      {team.name}
    </Dropdown.Item>
  ))}
  <Dropdown.Separator />
  <Dropdown.Item onClick={onCreateTeam}>
    + Create Team
  </Dropdown.Item>
</Dropdown>
```

- [ ] **Step 4: Replace project picker dropdown**

Same pattern as step 3 for the project selector.

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm typecheck && pnpm lint`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "refactor(web): use Dropdown for team and project pickers in Sidebar"
```

---

### Task 31: Final verification

- [ ] **Step 1: Full typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: zero errors, zero warnings related to changed files.

- [ ] **Step 2: Check for dead imports**

Run: `pnpm lint` — ESLint will flag unused imports if the rule is enabled. Fix any remaining stragglers.

- [ ] **Step 3: Verify no orphaned internal components**

Search for any remaining inline `ProgressBar`, `UsageMeter`, `getCategoryColor` usages outside `colors.ts`:
```bash
grep -r "getCategoryColor\|ProgressBar\|animate-pulse\|AnimatePresence" apps/web/src/components apps/web/src/app --include="*.tsx" -l
```
Expected: `colors.ts` only for `getCategoryColor`. AnimatePresence may still appear inside the new `modal.tsx` and `dropdown.tsx` — that's correct.

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "refactor(web): final cleanup after component unification"
```

# Frontend Component Unification Design

**Date:** 2026-06-29
**Approach:** Bottom-up (atoms → molecules → organisms)
**Principle:** Follow the PageHeader pattern — extract once, use everywhere. No new code without necessity.

---

## Motivation

An audit of all 35+ `.tsx` files in `apps/web/src/` revealed 20 repeated UI patterns. The most prevalent:
- Section/Card with glow — 30+ instances across 8+ files
- Modal shell boilerplate — ~200 lines duplicated across 5 modals
- Loading skeletons — 8+ identical animate-pulse blocks
- Dropdown open/close logic — duplicated in FilterBar, KanbanBoard, Sidebar

Goal: extract each pattern once into a reusable component in `components/ui/`, then replace all instances.

---

## Architecture

All new components live in `apps/web/src/components/ui/` alongside `button.tsx`, `input.tsx`, `select.tsx`.

No new directories. No abstraction layers. Each file exports one component.

---

## Layer 1: Atoms

### `badge.tsx`

Replaces: inline color-map spans in `KanbanCard`, `settings/team/page`, `CurrentPlanCard`, `Sidebar`, `archive/page`.

```tsx
interface BadgeProps {
  variant: 'role' | 'plan' | 'category' | 'status';
  value: string;
  size?: 'sm' | 'md'; // default 'md'
}

<Badge variant="role" value="admin" />
<Badge variant="plan" value="pro" />
<Badge variant="category" value="bug" />
```

Each `variant` owns its color map internally. `size="sm"` is `px-1.5 py-0.5 text-[9px]`, `size="md"` is `px-2.5 py-1 text-[10px]`.

Supported values per variant:
- `role`: `owner`, `admin`, `member`
- `plan`: `free`, `pro`, `enterprise`
- `category`: `bug`, `feature`, `improvement`, `question`, `other`
- `status`: `new`, `in_review`, `resolved`, `archived`

---

### `empty-state.tsx`

Replaces: ad-hoc centered icon+text in `CommentsPanel`, `ActivityFeed`, `KanbanColumn`, `archive/page`.

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md'; // default 'md' — controls icon size and padding
}

<EmptyState icon={MessageSquare} title="No comments yet" />
<EmptyState icon={Archive} title="Nothing archived" description="Resolved feedback lands here." action={<Button>...</Button>} />
```

---

### `skeleton.tsx`

Replaces: manual `{[1,2,3].map(i => <div className="animate-pulse ...">)}` in 8+ files.

```tsx
interface SkeletonProps {
  count?: number;   // default 3
  height?: string;  // Tailwind height class, default 'h-10'
  layout?: 'list' | 'grid'; // default 'list'
  cols?: number;    // for grid layout, default 2
}

<Skeleton count={3} height="h-16" />
<Skeleton count={4} height="h-8" layout="grid" cols={2} />
```

---

### `copy-button.tsx`

Replaces: `useState(copied)` + `setTimeout` + icon swap logic in `embed/page` and `WidgetGeneratorModal`.

```tsx
interface CopyButtonProps {
  text: string;
  label?: string;      // default 'Copy'
  copiedLabel?: string; // default 'Copied'
  size?: 'sm' | 'md';
  variant?: ButtonProps['variant'];
}

<CopyButton text={embedCode} label="Copy Code" size="sm" />
```

Internally manages `copied` state and 2000ms reset. No external state needed.

---

### `sentiment-bar.tsx`

Replaces: inline progress bar + color logic in `KanbanCard` and `DigestModal`.

```tsx
interface SentimentBarProps {
  score: number; // 0–1
  showLabel?: boolean; // default true — shows "74%" next to bar
}

<SentimentBar score={0.74} />
<SentimentBar score={0.3} showLabel={false} />
```

Color thresholds: `>0.6` → emerald, `<0.4` → red, else amber. These are defined once inside the component.

---

### `usage-meter.tsx`

Replaces: duplicate implementations in `apps/web/src/app/dashboard/settings/page.tsx` (inline UsageMeter) and `components/billing/UsageMetrics.tsx` (ProgressBar). These two are nearly identical; one will be deleted.

```tsx
interface UsageMeterProps {
  label: string;
  current: number;
  max: number | null; // null = unlimited (shows ∞)
  className?: string;
}

<UsageMeter label="Feedback" current={234} max={500} />
<UsageMeter label="Projects" current={3} max={null} />
```

---

## Layer 2: Molecules

### `section.tsx`

The most pervasive pattern — 30+ instances. Wraps content in the standard surface card with decorative glow.

```tsx
interface SectionProps {
  children: React.ReactNode;
  glow?: 'top-right' | 'bottom-left' | 'none'; // default 'top-right'
  padding?: 'sm' | 'md' | 'lg'; // default 'md'; sm=p-4, md=p-6, lg=p-8
  className?: string;
  as?: React.ElementType; // default 'section'
}

<Section>
  <p>Content</p>
</Section>

<Section glow="bottom-left" padding="lg" as="div">
  ...
</Section>
```

Renders: `bg-brand-surface/60 border border-brand-border/50 rounded-2xl shadow-xl relative` + glow div + `relative z-10` content wrapper.

---

### `list-item.tsx`

Replaces: icon+text+actions row pattern in `settings/page`, `settings/team/page`, `CommentsPanel`, `ActivityFeed`.

```tsx
interface ListItemProps {
  icon?: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  actions?: React.ReactNode; // revealed on hover via group-hover
  className?: string;
}

<ListItem
  icon={<Mail className="h-4 w-4 text-indigo-400" />}
  primary="boichuk.db@gmail.com"
  secondary="Owner"
  actions={<Button size="sm" variant="ghost">Remove</Button>}
/>
```

Hover-reveal is built in: `actions` wrapper uses `opacity-0 group-hover:opacity-100 transition-opacity`.

---

### `labeled-section.tsx`

Replaces: icon + uppercase tracking-widest label + content pattern in `DigestModal`, `embed/page`, `KanbanCard`, `CommentsPanel`.

```tsx
interface LabeledSectionProps {
  icon: LucideIcon;
  label: string;
  iconColor?: string; // Tailwind text color, default 'text-indigo-400'
  children: React.ReactNode;
}

<LabeledSection icon={Tag} label="Categories">
  <div className="flex flex-wrap gap-2">...</div>
</LabeledSection>
```

---

## Layer 3: Organisms

### `modal.tsx`

Replaces the AnimatePresence/motion.div shell duplicated across 5 modals: `CreateProjectModal`, `CreateTeamModal`, `CreateTeamProjectModal`, `WidgetGeneratorModal`, `DigestModal`.

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg'; // default 'md' = max-w-md
  children: React.ReactNode;
}

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Project"
  icon={<FolderPlus className="h-5 w-5 text-indigo-400" />}
  footer={
    <>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={loading}>Create</Button>
    </>
  }
>
  <Input ... />
</Modal>
```

Built-in behavior:
- `AnimatePresence` + `motion.div` with standard enter/exit
- Backdrop: `bg-black/60 backdrop-blur-sm fixed inset-0 z-50`
- Close on `Escape` keydown
- Close on backdrop click
- `pointer-events-none` on backdrop when animating out
- Header: title + icon + close `×` button
- Body: scrollable `p-6`
- Footer: `p-4 border-t border-zinc-800 flex justify-end gap-3`

---

### `dropdown.tsx`

Replaces the open/close/AnimatePresence/backdrop pattern in `FilterBar`, `KanbanBoard` (ExportMenu), `Sidebar` (team and project pickers).

```tsx
// Compound component API
<Dropdown trigger={<Button>Filter <ChevronDown /></Button>} align="left">
  <Dropdown.Item onClick={handleSelect}>Option 1</Dropdown.Item>
  <Dropdown.Item onClick={handleSelect} icon={<Download />}>Export CSV</Dropdown.Item>
  <Dropdown.Separator />
  <Dropdown.Item onClick={handleDelete} destructive>Delete</Dropdown.Item>
</Dropdown>
```

Sub-components: `Dropdown.Item`, `Dropdown.Separator`.

Built-in behavior:
- `useState(isOpen)` managed internally
- `AnimatePresence` with `opacity/y` animation
- Invisible backdrop div closes on click
- `Dropdown.Item` calls `onClose` automatically after `onClick`
- `align="left" | "right"` controls menu positioning
- `ChevronDown` rotation on trigger is opt-in via `showChevron` prop on trigger

---

## File Deletions

After migration, these become dead code and are deleted:
- Inline `UsageMeter` function in `apps/web/src/app/dashboard/settings/page.tsx` (replaced by `usage-meter.tsx`)
- Duplicate `ProgressBar` in `components/billing/UsageMetrics.tsx` (same)

---

## Migration Order

1. Create all atoms — no existing files change yet
2. Create all molecules
3. Create organisms
4. Replace instances file-by-file, starting with simplest (archive, activity) → complex (embed, modals)
5. Delete dead code

Each step is independently reviewable. No step touches more than 2–3 files simultaneously.

---

## Out of Scope

- `FormInputField` (icon+label+input) — already covered by `Input` + label pattern; over-abstraction for 3 uses
- `TwoColumnLayout` — only 2 instances, different enough that abstraction adds more confusion than value
- `ScrollablePageContent` — `DashboardShell` already handles this at the layout level
- `TableHeader` / `ColumnHeader` — only 2 instances, low duplication risk

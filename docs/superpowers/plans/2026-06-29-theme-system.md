# Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single dark-only indigo palette with 2 color themes (Teal + Slate Blue) × light/dark modes, all driven by OS preference with a Settings override.

**Architecture:** `next-themes` manages dark/light/system via `class="dark"` on `<html>`. A lightweight `useColorTheme` hook manages a separate `data-color-theme="blue"` attribute for the color theme. Four CSS selectors in `globals.css` cover all combinations. All indigo references in components are replaced with semantic `brand-*` tokens.

**Tech Stack:** `next-themes` (new), Tailwind CSS v4 `@theme inline` (existing), CSS custom properties.

---

## File Map

| File | Action |
|------|--------|
| `apps/web/package.json` | Add `next-themes` |
| `apps/web/src/app/globals.css` | Rewrite theme tokens |
| `apps/web/src/app/layout.tsx` | Add `suppressHydrationWarning`, fix body classes |
| `apps/web/src/components/providers.tsx` | Add `ThemeProvider` |
| `apps/web/src/hooks/useColorTheme.ts` | Create — color theme hook |
| `apps/web/src/lib/colors.ts` | Add `STATUS_COLORS` |
| `apps/web/src/components/ui/button.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/input.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/badge.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/modal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/select.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/empty-state.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/section.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/list-item.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/labeled-section.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/ui/usage-meter.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/Sidebar.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/KanbanBoard.tsx` | Use `STATUS_COLORS`, migrate indigo |
| `apps/web/src/components/dashboard/KanbanCard.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/FilterBar.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/DigestModal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/WidgetGeneratorModal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/ActivityFeed.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/CommentsPanel.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/CreateProjectModal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/dashboard/PageHeader.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/billing/TrialBanner.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/billing/CurrentPlanCard.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/billing/PricingCards.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/plan-limit-modal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/teams/CreateTeamModal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/teams/CreateTeamProjectModal.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/components/analytics/AnalyticsOverview.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/layout.tsx` | Fix body bg/text/selection classes |
| `apps/web/src/app/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/pricing/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/auth/reset-password/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/auth/forgot-password/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/invite/accept/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/dashboard/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/dashboard/activity/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/dashboard/archive/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/dashboard/billing/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/dashboard/embed/page.tsx` | Migrate indigo → brand tokens |
| `apps/web/src/app/dashboard/settings/page.tsx` | Migrate indigo → brand tokens + add Appearance section |
| `apps/web/src/app/dashboard/settings/team/page.tsx` | Migrate indigo → brand tokens |

### Token migration cheatsheet (use this in every task below)

| Old class | New class |
|-----------|-----------|
| `text-indigo-400` | `text-brand-accent` |
| `text-indigo-300` | `text-brand-accent` |
| `bg-indigo-600` | `bg-brand-primary` |
| `hover:bg-indigo-700` | `hover:bg-brand-primary/90` |
| `bg-indigo-500/5` | `bg-brand-accent/5` |
| `bg-indigo-500/10` | `bg-brand-accent/10` |
| `bg-indigo-500/15` | `bg-brand-accent/15` |
| `bg-indigo-500/20` | `bg-brand-accent/20` |
| `border-indigo-500/20` | `border-brand-accent/20` |
| `border-indigo-500/30` | `border-brand-accent/30` |
| `ring-indigo-500/50` | `ring-brand-accent/30` |
| `focus-visible:ring-indigo-500/50` | `focus-visible:ring-brand-accent/30` |
| `shadow-indigo-900/20` | `shadow-brand-primary/20` |
| `selection:bg-indigo-500/30` | `selection:bg-brand-primary/30` |
| `bg-indigo-500` (solid) | `bg-brand-primary` |
| `text-white` on page/neutral bg | `text-brand-fg` |
| `text-white` on `bg-brand-primary` button | **keep `text-white`** |

---

## Task 1: Install next-themes

**Files:**
- Modify: `apps/web/package.json` (via pnpm)

- [ ] **Step 1: Install the package**

```bash
pnpm add next-themes --filter @insightstream/web
```

Expected output: `+ next-themes X.X.X` added to `apps/web/package.json` dependencies.

- [ ] **Step 2: Verify install**

```bash
pnpm --filter @insightstream/web list next-themes
```

Expected: version line printed, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore(web): add next-themes dependency"
```

---

## Task 2: Rewrite globals.css — 4-theme token system

**Files:**
- Modify: `apps/web/src/app/globals.css`

This replaces the static `@theme inline` values with CSS-variable references, then defines the actual values in 4 theme selectors.

- [ ] **Step 1: Replace the `@theme inline` block**

Open `apps/web/src/app/globals.css`. Replace the entire `@theme inline { ... }` block (lines 3–13) with:

```css
@theme inline {
  --font-sans: var(--font-plus-jakarta);
  --font-mono: var(--font-geist-mono);

  --color-brand-bg:      var(--brand-bg);
  --color-brand-surface: var(--brand-surface);
  --color-brand-border:  var(--brand-border);
  --color-brand-muted:   var(--brand-muted);
  --color-brand-fg:      var(--brand-fg);
  --color-brand-primary: var(--brand-primary);
  --color-brand-accent:  var(--brand-accent);
}
```

- [ ] **Step 2: Add the 4-theme variable definitions after the closing `}` of `@theme inline`**

Insert this block immediately after the `@theme inline { }` block and before `@layer base`:

```css
/* ── Teal · Light (default) ─────────────────────────── */
:root {
  --brand-bg:      #f7fafa;
  --brand-surface: #ffffff;
  --brand-border:  #dde8e7;
  --brand-muted:   #8ab0ae;
  --brand-fg:      #1a2e2d;
  --brand-primary: #2d6b66;
  --brand-accent:  #3d8a84;
}

/* ── Teal · Dark ─────────────────────────────────────── */
.dark {
  --brand-bg:      #090c0c;
  --brand-surface: #0e1515;
  --brand-border:  #182222;
  --brand-muted:   #2e4d4a;
  --brand-fg:      #e0eded;
  --brand-primary: #3d8a84;
  --brand-accent:  #6eb5af;
}

/* ── Slate Blue · Light ──────────────────────────────── */
[data-color-theme="blue"] {
  --brand-bg:      #f8f8fc;
  --brand-surface: #ffffff;
  --brand-border:  #dcdcec;
  --brand-muted:   #9090b8;
  --brand-fg:      #1a1a30;
  --brand-primary: #3a508a;
  --brand-accent:  #5068a0;
}

/* ── Slate Blue · Dark ───────────────────────────────── */
.dark[data-color-theme="blue"] {
  --brand-bg:      #09090e;
  --brand-surface: #0e0e18;
  --brand-border:  #1a1a28;
  --brand-muted:   #2d2d48;
  --brand-fg:      #e2e2f0;
  --brand-primary: #5068a0;
  --brand-accent:  #8da0cc;
}
```

- [ ] **Step 3: Update the scrollbar thumb class in `@layer base`**

Find the scrollbar thumb line and update `hover:bg-zinc-700` to `hover:bg-brand-border`:

```css
  ::-webkit-scrollbar-thumb {
    @apply bg-brand-border rounded-full hover:bg-brand-border/70 transition-colors;
  }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): add 4-theme CSS variable system (teal/blue × light/dark)"
```

---

## Task 3: Wire ThemeProvider into layout and providers

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/providers.tsx`

- [ ] **Step 1: Update `layout.tsx`**

Replace the entire file with:

```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/providers";
import { Toaster } from "sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InsightStream AI",
  description: "AI-driven feedback and sentiment analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${geistMono.variable} antialiased h-full`}
    >
      <body className="min-h-full flex flex-col font-sans bg-brand-bg text-brand-fg selection:bg-brand-primary/30">
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
```

Key changes: `suppressHydrationWarning` on `<html>`, `bg-zinc-950 text-zinc-50 selection:bg-indigo-500/30` → `bg-brand-bg text-brand-fg selection:bg-brand-primary/30`.

- [ ] **Step 2: Update `providers.tsx` to add ThemeProvider**

Replace the entire file with:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { PostHogProvider } from "./providers/PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    const handler = (event: PageTransitionEvent) => {
      if (event.persisted) {
        queryClient.invalidateQueries();
      }
    };
    window.addEventListener("pageshow", handler);
    return () => window.removeEventListener("pageshow", handler);
  }, [queryClient]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="is-appearance"
    >
      <PostHogProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/components/providers.tsx
git commit -m "feat(web): wire next-themes ThemeProvider for dark/light/system support"
```

---

## Task 4: Create useColorTheme hook

**Files:**
- Create: `apps/web/src/hooks/useColorTheme.ts`

- [ ] **Step 1: Create the hook file**

```ts
"use client";

import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "teal" | "blue";

const STORAGE_KEY = "is-color-theme";

function applyColorTheme(theme: ColorTheme) {
  if (theme === "blue") {
    document.documentElement.setAttribute("data-color-theme", "blue");
  } else {
    document.documentElement.removeAttribute("data-color-theme");
  }
}

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("teal");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    const initial = stored === "blue" ? "blue" : "teal";
    setColorThemeState(initial);
    applyColorTheme(initial);
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    applyColorTheme(theme);
  }, []);

  return { colorTheme, setColorTheme };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/useColorTheme.ts
git commit -m "feat(web): add useColorTheme hook for teal/blue theme switching"
```

---

## Task 5: Add STATUS_COLORS to colors.ts

**Files:**
- Modify: `apps/web/src/lib/colors.ts`

- [ ] **Step 1: Append STATUS_COLORS export to `colors.ts`**

Add at the end of `apps/web/src/lib/colors.ts`:

```ts
export const STATUS_COLORS: Record<string, string> = {
  New: "bg-brand-accent",
  "In Review": "bg-amber-500",
  "In Progress": "bg-blue-500",
  Done: "bg-emerald-500",
  Rejected: "bg-red-500",
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/colors.ts
git commit -m "feat(web): add STATUS_COLORS constant to centralize kanban column colors"
```

---

## Task 6: Migrate core UI components

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: `apps/web/src/components/ui/input.tsx`
- Modify: `apps/web/src/components/ui/badge.tsx`
- Modify: `apps/web/src/components/ui/modal.tsx`
- Modify: `apps/web/src/components/ui/select.tsx`
- Modify: `apps/web/src/components/ui/empty-state.tsx`
- Modify: `apps/web/src/components/ui/section.tsx`
- Modify: `apps/web/src/components/ui/list-item.tsx`
- Modify: `apps/web/src/components/ui/labeled-section.tsx`
- Modify: `apps/web/src/components/ui/usage-meter.tsx`

### button.tsx

- [ ] **Step 1: Replace `button.tsx`**

```tsx
"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      isLoading,
      disabled,
      variant = "primary",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20 border-transparent",
      secondary:
        "bg-brand-surface border border-brand-border text-zinc-300 hover:text-white hover:bg-brand-surface-hover hover:border-brand-border-hover shadow-sm",
      ghost:
        "bg-transparent text-brand-muted hover:text-zinc-200 hover:bg-white/5 border-transparent",
      danger:
        "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-sm shadow-red-950/20",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-[11px] font-bold",
      md: "h-10 px-4 text-sm font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-brand-bg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
```

### input.tsx

- [ ] **Step 2: Apply token migration to `input.tsx`**

Open `apps/web/src/components/ui/input.tsx`. Apply replacements from the cheatsheet. The focus ring line should read:
```
focus-visible:ring-brand-accent/30
```
instead of `focus-visible:ring-indigo-500/50` (or similar).

### badge.tsx, modal.tsx, select.tsx, empty-state.tsx, section.tsx, list-item.tsx, labeled-section.tsx, usage-meter.tsx

- [ ] **Step 3: Apply token migration to remaining UI components**

For each file, open it and replace every `indigo-*` class using the cheatsheet. Specifically:

**badge.tsx** — Owner role badge: `bg-indigo-500/15 text-indigo-300 border-indigo-500/30` → `bg-brand-accent/15 text-brand-accent border-brand-accent/30`

**modal.tsx** — No indigo expected in overlay/container; if present replace per cheatsheet.

**select.tsx** — Focus ring: `ring-indigo-500/50` → `ring-brand-accent/30`. Selected option highlight: `text-indigo-400` → `text-brand-accent`.

**empty-state.tsx** — Icon: `text-indigo-400` → `text-brand-accent`.

**section.tsx**, **list-item.tsx**, **labeled-section.tsx**, **usage-meter.tsx** — apply cheatsheet.

- [ ] **Step 4: Verify typecheck**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/
git commit -m "feat(web): migrate core UI components from indigo to brand tokens"
```

---

## Task 7: Migrate Sidebar.tsx

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

Sidebar has 27 indigo references — the most of any file.

- [ ] **Step 1: Open Sidebar.tsx and apply the full token migration**

Replace every indigo class using the cheatsheet. Key patterns to find in Sidebar:

- Active nav item: `bg-indigo-500/10 text-indigo-400` → `bg-brand-accent/10 text-brand-accent`
- Hover states: `hover:text-indigo-400` → `hover:text-brand-accent`
- Decorative glow div: `bg-indigo-500/10` → `bg-brand-accent/10`
- Plan badge (Pro): `bg-indigo-500/20 text-indigo-400` → `bg-brand-accent/20 text-brand-accent`
- Any focus rings: `ring-indigo-500` → `ring-brand-accent/30`
- Glow blur: `bg-indigo-500/10 rounded-full blur-[60px]` → `bg-brand-accent/10 rounded-full blur-[60px]`

- [ ] **Step 2: Verify typecheck**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "feat(web): migrate Sidebar from indigo to brand tokens"
```

---

## Task 8: Migrate KanbanBoard + KanbanCard + use STATUS_COLORS

**Files:**
- Modify: `apps/web/src/components/dashboard/KanbanBoard.tsx`
- Modify: `apps/web/src/components/dashboard/KanbanCard.tsx`

### KanbanBoard.tsx

- [ ] **Step 1: Replace the hardcoded `COLUMNS` array in `KanbanBoard.tsx`**

Find:
```ts
const COLUMNS = [
  { id: "New", title: "New", color: "bg-indigo-500" },
  { id: "In Review", title: "In Review", color: "bg-amber-500" },
  { id: "In Progress", title: "In Progress", color: "bg-blue-500" },
  { id: "Done", title: "Done", color: "bg-emerald-500" },
  { id: "Rejected", title: "Rejected", color: "bg-red-500" },
];
```

Replace with:
```ts
import { STATUS_COLORS } from "@/lib/colors";

const COLUMNS = [
  { id: "New", title: "New", color: STATUS_COLORS["New"] },
  { id: "In Review", title: "In Review", color: STATUS_COLORS["In Review"] },
  { id: "In Progress", title: "In Progress", color: STATUS_COLORS["In Progress"] },
  { id: "Done", title: "Done", color: STATUS_COLORS["Done"] },
  { id: "Rejected", title: "Rejected", color: STATUS_COLORS["Rejected"] },
];
```

Then apply cheatsheet for any remaining indigo classes in the file.

### KanbanCard.tsx

- [ ] **Step 2: Apply token migration to `KanbanCard.tsx`**

Open `KanbanCard.tsx`. Replace all indigo classes per cheatsheet:
- Source tag: `bg-indigo-500/10 text-indigo-400 border-indigo-500/20` → `bg-brand-accent/10 text-brand-accent border-brand-accent/20`
- Drag state: `border-indigo-500 ring-2 ring-indigo-500/50` → `border-brand-accent ring-2 ring-brand-accent/30`
- "Not analyzed" dashed box: `border-indigo-500/20 bg-indigo-500/5` → `border-brand-accent/20 bg-brand-accent/5`
- Re-analyze button: `bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/15` → `bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/15`

- [ ] **Step 3: Verify typecheck**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanBoard.tsx apps/web/src/components/dashboard/KanbanCard.tsx
git commit -m "feat(web): migrate Kanban components to brand tokens and STATUS_COLORS"
```

---

## Task 9: Migrate remaining dashboard and billing components

**Files:**
- Modify: `apps/web/src/components/dashboard/FilterBar.tsx`
- Modify: `apps/web/src/components/dashboard/DigestModal.tsx`
- Modify: `apps/web/src/components/dashboard/WidgetGeneratorModal.tsx`
- Modify: `apps/web/src/components/dashboard/ActivityFeed.tsx`
- Modify: `apps/web/src/components/dashboard/CommentsPanel.tsx`
- Modify: `apps/web/src/components/dashboard/CreateProjectModal.tsx`
- Modify: `apps/web/src/components/dashboard/PageHeader.tsx`
- Modify: `apps/web/src/components/billing/TrialBanner.tsx`
- Modify: `apps/web/src/components/billing/CurrentPlanCard.tsx`
- Modify: `apps/web/src/components/billing/PricingCards.tsx`
- Modify: `apps/web/src/components/plan-limit-modal.tsx`
- Modify: `apps/web/src/components/teams/CreateTeamModal.tsx`
- Modify: `apps/web/src/components/teams/CreateTeamProjectModal.tsx`
- Modify: `apps/web/src/components/analytics/AnalyticsOverview.tsx`

Apply the token cheatsheet to each file. Notable specifics:

- [ ] **Step 1: Migrate `FilterBar.tsx` (6 occurrences)**

Typical patterns: active filter badge `bg-indigo-500/10 text-indigo-400 border-indigo-500/20` → `bg-brand-accent/10 text-brand-accent border-brand-accent/20`. Apply cheatsheet to all.

- [ ] **Step 2: Migrate `DigestModal.tsx` (6 occurrences)**

Typical pattern: section headers with `text-indigo-400`, accent borders. Apply cheatsheet.

- [ ] **Step 3: Migrate `WidgetGeneratorModal.tsx` (7 occurrences)**

Typical pattern: code snippet highlight `text-indigo-400`, copy button. Apply cheatsheet.

- [ ] **Step 4: Migrate `billing/TrialBanner.tsx` (3 occurrences)**

Banner background: `bg-indigo-500/10 border-indigo-500/20` → `bg-brand-accent/10 border-brand-accent/20`. Text: `text-indigo-300` → `text-brand-accent`.

- [ ] **Step 5: Migrate `billing/PricingCards.tsx` (3 occurrences)**

Highlighted plan card border/badge: `border-indigo-500/30 bg-indigo-500/10 text-indigo-400` → `border-brand-accent/30 bg-brand-accent/10 text-brand-accent`.

- [ ] **Step 6: Migrate remaining files**

Apply cheatsheet to: `ActivityFeed.tsx`, `CommentsPanel.tsx`, `CreateProjectModal.tsx`, `PageHeader.tsx`, `CurrentPlanCard.tsx`, `plan-limit-modal.tsx`, `CreateTeamModal.tsx`, `CreateTeamProjectModal.tsx`, `AnalyticsOverview.tsx`.

- [ ] **Step 7: Verify typecheck**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(web): migrate all component indigo references to brand tokens"
```

---

## Task 10: Migrate page-level files

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/pricing/page.tsx`
- Modify: `apps/web/src/app/auth/reset-password/page.tsx`
- Modify: `apps/web/src/app/auth/forgot-password/page.tsx`
- Modify: `apps/web/src/app/invite/accept/page.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/dashboard/activity/page.tsx`
- Modify: `apps/web/src/app/dashboard/archive/page.tsx`
- Modify: `apps/web/src/app/dashboard/billing/page.tsx`
- Modify: `apps/web/src/app/dashboard/embed/page.tsx`
- Modify: `apps/web/src/app/dashboard/settings/team/page.tsx`

- [ ] **Step 1: Apply token cheatsheet to each page file**

`dashboard/embed/page.tsx` has 18 occurrences — the most among pages. Common patterns there: widget embed preview borders, copy-code buttons, tab active states. Apply cheatsheet systematically.

`app/page.tsx` has 5 occurrences: these are on the landing/login page — spinner, focus ring, decorative glow. **Do not touch the Google/GitHub OAuth SVG inline colors** (`#4285F4`, `#34A853`, etc.) — those are brand colors that must stay.

`auth/reset-password` and `auth/forgot-password` — typically form focus rings and submit button. Apply cheatsheet.

`invite/accept/page.tsx` (6 occurrences) — accept button, decorative elements. Apply cheatsheet.

`dashboard/settings/team/page.tsx` (9 occurrences) — role badges, member action buttons. Apply cheatsheet.

- [ ] **Step 2: Verify typecheck and lint**

```bash
pnpm --filter @insightstream/web typecheck
pnpm --filter @insightstream/web lint
```

Expected: 0 errors, 0 warnings related to theme changes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/
git commit -m "feat(web): migrate all page-level indigo references to brand tokens"
```

---

## Task 11: Build Appearance section in Settings

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Add the Appearance section to `settings/page.tsx`**

Add new imports at the top of the file (merge `Palette, Monitor, Sun, Moon` into the existing lucide-react import line; add the other two lines separately):

```tsx
// Merge into existing lucide-react import:
import { User, Mail, Calendar, Loader2, Settings, CreditCard, Palette, Monitor, Sun, Moon } from "lucide-react";

// Add these two new lines:
import { useTheme } from "next-themes";
import { useColorTheme, type ColorTheme } from "@/hooks/useColorTheme";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
```

- [ ] **Step 2: Add hook calls inside the component (after existing hooks)**

```tsx
const { theme, setTheme } = useTheme();
const { colorTheme, setColorTheme } = useColorTheme();
```

- [ ] **Step 3: Add the Appearance `<Section>` block**

Place this section after the Profile section (before the Billing section):

```tsx
{/* Appearance Section */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.05 }}
>
  <Section>
    <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-6">
      <Palette className="h-5 w-5 text-brand-accent" /> Appearance
    </h2>

    <div className="flex flex-col gap-6">
      {/* Color Theme */}
      <div>
        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Color Theme
        </p>
        <div className="flex gap-2">
          {(["teal", "blue"] as ColorTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => setColorTheme(t)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                colorTheme === t
                  ? "bg-brand-accent/10 border-brand-accent/40 text-brand-accent"
                  : "bg-transparent border-brand-border text-brand-muted hover:border-brand-accent/20 hover:text-brand-fg",
              )}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: t === "teal" ? "#3d8a84" : "#5068a0",
                }}
              />
              {t === "teal" ? "Teal" : "Slate Blue"}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance Mode */}
      <div>
        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Appearance Mode
        </p>
        <div className="flex rounded-xl border border-brand-border overflow-hidden w-fit">
          {(
            [
              { value: "system", label: "System", icon: Monitor },
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
            ] as { value: string; label: string; icon: LucideIcon }[]
          ).map(({ value, label, icon: Icon }, i) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all",
                i > 0 && "border-l border-brand-border",
                theme === value
                  ? "bg-brand-border text-brand-accent"
                  : "text-brand-muted hover:text-brand-fg",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-brand-muted mt-2">
          System follows your OS preference automatically.
        </p>
      </div>
    </div>
  </Section>
</motion.div>
```

- [ ] **Step 4: Fix remaining indigo references in the settings page**

Apply cheatsheet to the Loader2 spinner, glow div, icon classes, and any other indigo references in the file:
- `text-indigo-400` → `text-brand-accent` on Loader2 and icon elements
- `bg-indigo-500/5` → `bg-brand-accent/5` on decorative glow div

- [ ] **Step 5: Verify typecheck**

```bash
pnpm --filter @insightstream/web typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/dashboard/settings/page.tsx apps/web/src/hooks/useColorTheme.ts
git commit -m "feat(web): add Appearance settings section with color theme and mode controls"
```

---

## Task 12: Final verification

**Files:** No new changes — verification only.

- [ ] **Step 1: Confirm no indigo references remain in components or pages**

```bash
grep -r "indigo" apps/web/src --include="*.tsx" --include="*.ts" -l
```

Expected: zero files, OR only files where indigo is intentionally kept (e.g. `globals.css` — the old comment, or OAuth SVG in `page.tsx`). If any unexpected files appear, apply the cheatsheet to them.

- [ ] **Step 2: Run full typecheck and lint**

```bash
pnpm --filter @insightstream/web typecheck && pnpm --filter @insightstream/web lint
```

Expected: 0 errors, 0 errors.

- [ ] **Step 3: Start dev server and verify all 4 theme combinations**

```bash
pnpm --filter @insightstream/web dev
```

Open `http://localhost:3000`. Manually test each combination:
1. Open browser DevTools → set OS to light → app shows Teal Light
2. Switch OS to dark → app shows Teal Dark
3. Go to Settings → Appearance → switch to Slate Blue → verify color change
4. Switch mode to Light → verify Slate Blue Light
5. Switch mode to Dark → verify Slate Blue Dark
6. Reload page → verify preferences are persisted
7. Switch back to System → verify OS preference resumes

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(web): complete theme system — teal/blue × light/dark with OS default"
```

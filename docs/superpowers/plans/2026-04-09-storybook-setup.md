# Storybook Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure Storybook in `apps/web/` with stories for all components in `src/components/`.

**Architecture:** Auto-init with `@storybook/nextjs` framework, Tailwind 4 connected via global CSS import in preview, shared mock data in `src/stories/mocks.ts`, DragDropContext provided via global decorator.

**Tech Stack:** Storybook 8, `@storybook/nextjs`, `@storybook/addon-essentials`, Tailwind 4, framer-motion, `@hello-pangea/dnd`

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Generate | `.storybook/main.ts` | Framework config, addon list, stories glob |
| Modify | `.storybook/preview.ts` | Global CSS import, DragDropContext decorator |
| Create | `src/stories/mocks.ts` | Shared mock data for all stories |
| Create | `src/components/ui/button.stories.tsx` | Button variants/sizes/states |
| Create | `src/components/ui/input.stories.tsx` | Input states |
| Create | `src/components/ui/select.stories.tsx` | Select states |
| Create | `src/components/plan-limit-banner.stories.tsx` | Banner at 80% and 100% |
| Create | `src/components/plan-limit-modal.stories.tsx` | Modal open state |
| Create | `src/components/dashboard/KanbanCard.stories.tsx` | Card variants |
| Create | `src/components/dashboard/KanbanColumn.stories.tsx` | Column with cards |
| Create | `src/components/dashboard/FilterBar.stories.tsx` | Filter bar states |
| Create | `src/components/dashboard/Sidebar.stories.tsx` | Sidebar with mock projects |
| Create | `src/components/dashboard/ActivityFeed.stories.tsx` | Feed with mock data |
| Create | `src/components/dashboard/AnalyticsOverview.stories.tsx` | Charts with mock feedbacks |
| Create | `src/components/dashboard/DigestModal.stories.tsx` | Modal open |
| Create | `src/components/dashboard/CreateProjectModal.stories.tsx` | Modal open |
| Create | `src/components/dashboard/CommentsPanel.stories.tsx` | Panel open |
| Create | `src/components/dashboard/WidgetGeneratorModal.stories.tsx` | Modal open |
| Create | `src/components/teams/CreateTeamModal.stories.tsx` | Modal open |
| Create | `src/components/teams/CreateTeamProjectModal.stories.tsx` | Modal open |
| Modify | `apps/web/package.json` | Add storybook + build-storybook scripts |

---

## Task 1: Install Storybook

**Files:**
- Generate: `.storybook/main.ts`, `.storybook/preview.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Run init in apps/web**

```bash
cd apps/web
npx storybook@latest init --yes
```

Expected: installs `@storybook/nextjs`, `@storybook/addon-essentials`, creates `.storybook/`, creates `src/stories/` with example files.

- [ ] **Step 2: Delete generated example stories**

```bash
rm -rf apps/web/src/stories
```

- [ ] **Step 3: Verify `.storybook/main.ts` looks like this (adjust if different)**

```ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
};

export default config;
```

- [ ] **Step 4: Replace `.storybook/preview.ts` with Tailwind + decorator**

```ts
import type { Preview } from "@storybook/react";
import { DragDropContext } from "@hello-pangea/dnd";
import React from "react";
import "../src/app/globals.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <DragDropContext onDragEnd={() => {}}>
        <div className="bg-brand-bg min-h-screen p-6">
          <Story />
        </div>
      </DragDropContext>
    ),
  ],
  parameters: {
    backgrounds: { disable: true },
  },
};

export default preview;
```

- [ ] **Step 5: Verify storybook starts**

```bash
cd apps/web
pnpm storybook
```

Expected: browser opens at `http://localhost:6006`, no errors in terminal.

- [ ] **Step 6: Commit**

```bash
git add apps/web/.storybook apps/web/package.json
git commit -m "chore: install and configure Storybook"
```

---

## Task 2: Mock data

**Files:**
- Create: `apps/web/src/stories/mocks.ts`

- [ ] **Step 1: Create `src/stories/mocks.ts`**

```ts
export const mockFeedback = {
  id: "fb-1",
  content: "The onboarding flow is confusing. I couldn't find where to add team members after signing up.",
  source: "Widget",
  category: "UX",
  sentimentScore: 0.3,
  tags: ["onboarding", "ux"],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  status: "In Review",
  aiSummary: "User struggled with team member invitation during onboarding.",
};

export const mockFeedback2 = {
  id: "fb-2",
  content: "Love the kanban view! Makes it easy to prioritize what to fix.",
  source: "Direct",
  category: "Feature",
  sentimentScore: 0.9,
  tags: ["kanban", "positive"],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  status: "Done",
  aiSummary: "Positive feedback about the kanban board feature.",
};

export const mockFeedback3 = {
  id: "fb-3",
  content: "Export to CSV would be really useful for our weekly reports.",
  source: "Widget",
  category: "Feature",
  sentimentScore: 0.6,
  tags: ["export", "csv"],
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  status: "In Progress",
  aiSummary: null,
};

export const mockProject = {
  id: "proj-1",
  name: "InsightStream Web",
  widgetKey: "wk_abc123",
};

export const mockProject2 = {
  id: "proj-2",
  name: "Mobile App",
  widgetKey: "wk_def456",
};

export const mockUser = {
  id: "user-1",
  email: "demo@insightstream.dev",
  name: "Alex Demo",
  plan: "pro",
};

export const mockTeam = {
  id: "team-1",
  name: "Acme Corp",
  role: "owner",
};

export const mockPlanUsageData = {
  feedbacksThisMonth: {
    current: 80,
    max: 100,
  },
};

export const mockPlanUsageDataAtLimit = {
  feedbacksThisMonth: {
    current: 100,
    max: 100,
  },
};

export const mockPlanLimitError = {
  message: "You've reached your monthly feedback limit of 100 feedbacks on the Free plan.",
  currentPlan: "free",
  limit: 100,
  current: 100,
};

export const mockActivityItems = [
  {
    id: "a-1",
    action: "member_joined",
    actorName: "Alex Demo",
    targetName: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "a-2",
    action: "feedback_added",
    actorName: "System",
    targetName: "InsightStream Web",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/stories/mocks.ts
git commit -m "feat(storybook): add shared mock data"
```

---

## Task 3: Button stories

**Files:**
- Create: `apps/web/src/components/ui/button.stories.tsx`

- [ ] **Step 1: Create `src/components/ui/button.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger", "outline", "brand"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: "Save changes", variant: "primary", size: "md" },
};

export const Secondary: Story = {
  args: { children: "Cancel", variant: "secondary", size: "md" },
};

export const Ghost: Story = {
  args: { children: "Learn more", variant: "ghost", size: "md" },
};

export const Danger: Story = {
  args: { children: "Delete project", variant: "danger", size: "md" },
};

export const Outline: Story = {
  args: { children: "View details", variant: "outline", size: "md" },
};

export const Brand: Story = {
  args: { children: "Get started", variant: "brand", size: "md" },
};

export const Loading: Story = {
  args: { children: "Saving...", variant: "primary", size: "md", isLoading: true },
};

export const Disabled: Story = {
  args: { children: "Not available", variant: "primary", size: "md", disabled: true },
};

export const SizeXS: Story = {
  args: { children: "XS Button", variant: "primary", size: "xs" },
};

export const SizeLG: Story = {
  args: { children: "Large Button", variant: "primary", size: "lg" },
};
```

- [ ] **Step 2: Check in Storybook — open UI/Button, verify all variants render with correct styles**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/button.stories.tsx
git commit -m "feat(storybook): add Button stories"
```

---

## Task 4: Input stories

**Files:**
- Create: `apps/web/src/components/ui/input.stories.tsx`

- [ ] **Step 1: Create `src/components/ui/input.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Type something..." },
};

export const WithValue: Story = {
  args: { defaultValue: "hello@example.com", type: "email" },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Enter password" },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled input", disabled: true },
};

export const ErrorState: Story = {
  args: {
    defaultValue: "invalid-email",
    className: "border-red-500 focus-visible:ring-red-500/20",
  },
};
```

- [ ] **Step 2: Check in Storybook — open UI/Input, verify all states render**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/input.stories.tsx
git commit -m "feat(storybook): add Input stories"
```

---

## Task 5: Select stories

**Files:**
- Create: `apps/web/src/components/ui/select.stories.tsx`

- [ ] **Step 1: Create `src/components/ui/select.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Select } from "./select";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Select>;

const OPTIONS = ["all", "bug", "feature", "ux", "performance"];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("all");
    return <Select value={value} onChange={setValue} options={OPTIONS} />;
  },
};

export const WithPlaceholder: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <Select
        value={value}
        onChange={setValue}
        options={OPTIONS}
        placeholder="Select category"
      />
    );
  },
};
```

- [ ] **Step 2: Check in Storybook — click the Select to open dropdown, verify framer-motion animation works**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/select.stories.tsx
git commit -m "feat(storybook): add Select stories"
```

---

## Task 6: PlanLimitBanner stories

**Files:**
- Create: `apps/web/src/components/plan-limit-banner.stories.tsx`

- [ ] **Step 1: Create `src/components/plan-limit-banner.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { PlanLimitBanner } from "./plan-limit-banner";
import { mockPlanUsageData, mockPlanUsageDataAtLimit } from "@/stories/mocks";

// PlanLimitBanner reads localStorage on mount to check if dismissed.
// Clear it so the banner always renders in Storybook.
const withCleanLocalStorage = (Story: React.FC) => {
  localStorage.removeItem(
    `plan_banner_dismissed_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  );
  return <Story />;
};

const meta: Meta<typeof PlanLimitBanner> = {
  title: "Components/PlanLimitBanner",
  component: PlanLimitBanner,
  tags: ["autodocs"],
  decorators: [withCleanLocalStorage],
};

export default meta;
type Story = StoryObj<typeof PlanLimitBanner>;

export const NearLimit: Story = {
  args: {
    data: mockPlanUsageData,
    isAtLimit: false,
  },
};

export const AtLimit: Story = {
  args: {
    data: mockPlanUsageDataAtLimit,
    isAtLimit: true,
  },
};
```

- [ ] **Step 2: Check in Storybook — verify both banner variants render, dismiss button works**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/plan-limit-banner.stories.tsx
git commit -m "feat(storybook): add PlanLimitBanner stories"
```

---

## Task 7: PlanLimitModal stories

**Files:**
- Create: `apps/web/src/components/plan-limit-modal.stories.tsx`

- [ ] **Step 1: Create `src/components/plan-limit-modal.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { PlanLimitModal } from "./plan-limit-modal";
import { mockPlanLimitError } from "@/stories/mocks";

const meta: Meta<typeof PlanLimitModal> = {
  title: "Components/PlanLimitModal",
  component: PlanLimitModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PlanLimitModal>;

export const Open: Story = {
  args: {
    open: true,
    onClose: () => {},
    errorData: mockPlanLimitError,
  },
};

export const Closed: Story = {
  args: {
    open: false,
    onClose: () => {},
    errorData: mockPlanLimitError,
  },
};
```

- [ ] **Step 2: Check in Storybook — verify modal renders with backdrop, close button works**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/plan-limit-modal.stories.tsx
git commit -m "feat(storybook): add PlanLimitModal stories"
```

---

## Task 8: KanbanCard stories

**Files:**
- Create: `apps/web/src/components/dashboard/KanbanCard.stories.tsx`

Note: `KanbanCard` uses `Draggable` from `@hello-pangea/dnd`, which requires a `DragDropContext` and `Droppable` parent. We provide these via a decorator.

- [ ] **Step 1: Create `src/components/dashboard/KanbanCard.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Droppable } from "@hello-pangea/dnd";
import { KanbanCard } from "./KanbanCard";
import { mockFeedback, mockFeedback3 } from "@/stories/mocks";

// KanbanCard requires Droppable context (DragDropContext is in global preview decorator)
const withDroppable = (Story: React.FC) => (
  <Droppable droppableId="storybook-column">
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps} className="w-72">
        <Story />
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);

const meta: Meta<typeof KanbanCard> = {
  title: "Dashboard/KanbanCard",
  component: KanbanCard,
  decorators: [withDroppable],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof KanbanCard>;

const baseArgs = {
  index: 0,
  onDelete: () => {},
  isDeleting: false,
  onStatusChange: () => {},
  onReanalyze: () => {},
  isReanalyzing: false,
  onOpenComments: () => {},
  commentCount: 3,
};

export const WithAISummary: Story = {
  args: { ...baseArgs, feedback: mockFeedback },
};

export const NotAnalyzed: Story = {
  args: { ...baseArgs, feedback: mockFeedback3 },
};

export const Deleting: Story = {
  args: { ...baseArgs, feedback: mockFeedback, isDeleting: true },
};
```

- [ ] **Step 2: Check in Storybook — verify cards render, hover states show action buttons**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanCard.stories.tsx
git commit -m "feat(storybook): add KanbanCard stories"
```

---

## Task 9: KanbanColumn stories

**Files:**
- Create: `apps/web/src/components/dashboard/KanbanColumn.stories.tsx`

- [ ] **Step 1: Create `src/components/dashboard/KanbanColumn.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { KanbanColumn } from "./KanbanColumn";
import { mockFeedback, mockFeedback2, mockFeedback3 } from "@/stories/mocks";

const meta: Meta<typeof KanbanColumn> = {
  title: "Dashboard/KanbanColumn",
  component: KanbanColumn,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof KanbanColumn>;

const baseArgs = {
  id: "In Review",
  title: "In Review",
  colorClass: "bg-amber-500",
  onDeleteFeedback: () => {},
  isDeleting: false,
  onStatusChange: () => {},
  onReanalyzeFeedback: () => {},
  isReanalyzing: false,
};

export const WithFeedbacks: Story = {
  args: {
    ...baseArgs,
    feedbacks: [mockFeedback, mockFeedback3],
  },
};

export const Empty: Story = {
  args: {
    ...baseArgs,
    feedbacks: [],
  },
};
```

- [ ] **Step 2: Check in Storybook — verify column renders with cards, empty state shows placeholder**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanColumn.stories.tsx
git commit -m "feat(storybook): add KanbanColumn stories"
```

---

## Task 10: FilterBar stories

**Files:**
- Create: `apps/web/src/components/dashboard/FilterBar.stories.tsx`

- [ ] **Step 1: Create `src/components/dashboard/FilterBar.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { FilterBar } from "./FilterBar";

const meta: Meta<typeof FilterBar> = {
  title: "Dashboard/FilterBar",
  component: FilterBar,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FilterBar>;

const baseArgs = {
  searchText: "",
  onSearchChange: () => {},
  selectedTags: [],
  onToggleTag: () => {},
  allTags: ["onboarding", "ux", "export", "kanban", "positive"],
  totalCount: 42,
  filteredCount: 42,
  hasActiveFilters: false,
  onClearFilters: () => {},
};

export const Default: Story = {
  args: baseArgs,
};

export const WithActiveFilters: Story = {
  args: {
    ...baseArgs,
    selectedTags: ["ux", "onboarding"],
    filteredCount: 8,
    hasActiveFilters: true,
  },
};
```

- [ ] **Step 2: Check in Storybook — verify filter bar renders, dropdown opens on click**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/FilterBar.stories.tsx
git commit -m "feat(storybook): add FilterBar stories"
```

---

## Task 11: Sidebar stories

**Files:**
- Create: `apps/web/src/components/dashboard/Sidebar.stories.tsx`

- [ ] **Step 1: Create `src/components/dashboard/Sidebar.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Sidebar } from "./Sidebar";
import { mockProject, mockProject2, mockUser, mockTeam } from "@/stories/mocks";

const meta: Meta<typeof Sidebar> = {
  title: "Dashboard/Sidebar",
  component: Sidebar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const baseArgs = {
  projects: [mockProject, mockProject2],
  activeProject: mockProject,
  onSelectProject: () => {},
  onCreateProject: () => {},
  onDeleteProject: () => {},
  isDeletingProject: false,
  userProfile: mockUser,
  onLogout: () => {},
  isOpen: true,
  onClose: () => {},
  teams: [mockTeam],
  activeTeam: mockTeam,
  onSwitchTeam: () => {},
  userRole: "owner",
};

export const Open: Story = {
  args: baseArgs,
};

export const NoProjects: Story = {
  args: { ...baseArgs, projects: [], activeProject: null },
};
```

- [ ] **Step 2: Check in Storybook — verify sidebar renders with project list and user info**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.stories.tsx
git commit -m "feat(storybook): add Sidebar stories"
```

---

## Task 12: ActivityFeed stories

**Files:**
- Create: `apps/web/src/components/dashboard/ActivityFeed.stories.tsx`

Note: `ActivityFeed` calls `useQuery` internally to fetch from the API. We mock the module so Storybook renders with static data.

- [ ] **Step 1: Create `src/components/dashboard/ActivityFeed.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ActivityFeed } from "./ActivityFeed";
import { mockActivityItems } from "@/stories/mocks";

// Mock useQuery so the component renders without an API call
const { useQuery } = await import("@tanstack/react-query");
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockActivityItems, isLoading: false }),
}));
```

Wait — `vi.mock` is a Vitest/Jest construct and doesn't work in Storybook story files. The right approach here is to use `storybook-addon-module-mock` or to refactor ActivityFeed to accept data as props. Since we're learning Storybook and don't want to modify production components, the simplest approach is to use a **loader** that provides mock data via a decorator.

Replace the file content with:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { ActivityFeed } from "./ActivityFeed";
import { mockActivityItems } from "@/stories/mocks";

// Create a QueryClient per story to avoid shared state
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

// Pre-seed the cache so ActivityFeed renders without a real API call
queryClient.setQueryData(["team-activity"], mockActivityItems);

const meta: Meta<typeof ActivityFeed> = {
  title: "Dashboard/ActivityFeed",
  component: ActivityFeed,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityFeed>;

export const Default: Story = {};
```

Note: `queryClient.setQueryData(["team-activity"], ...)` pre-seeds the cache with the exact query key that `ActivityFeed` uses internally. Check `ActivityFeed.tsx` to confirm the query key and adjust if different.

- [ ] **Step 2: Open `ActivityFeed.tsx` and find the `useQuery` call — note the exact `queryKey` value**

Look for something like:
```tsx
const { data } = useQuery({ queryKey: ["team-activity", teamId], ... })
```

Adjust `queryClient.setQueryData(...)` in the story to match that exact key (including teamId if needed). If it includes a dynamic `teamId`, pass a prop to ActivityFeed or use `queryClient.setQueryData(["team-activity", "team-1"], mockActivityItems)`.

- [ ] **Step 3: Check in Storybook — ActivityFeed should render mock items without a network call**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/ActivityFeed.stories.tsx
git commit -m "feat(storybook): add ActivityFeed stories with seeded QueryClient"
```

---

## Task 13: AnalyticsOverview stories

**Files:**
- Create: `apps/web/src/components/analytics/AnalyticsOverview.stories.tsx`

- [ ] **Step 1: Create `src/components/analytics/AnalyticsOverview.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AnalyticsOverview } from "./AnalyticsOverview";
import { mockFeedback, mockFeedback2, mockFeedback3 } from "@/stories/mocks";

const meta: Meta<typeof AnalyticsOverview> = {
  title: "Analytics/AnalyticsOverview",
  component: AnalyticsOverview,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AnalyticsOverview>;

export const WithData: Story = {
  args: {
    feedbacks: [mockFeedback, mockFeedback2, mockFeedback3],
  },
};

export const Empty: Story = {
  args: {
    feedbacks: [],
  },
};
```

- [ ] **Step 2: Check in Storybook — verify charts render with recharts**

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/analytics/AnalyticsOverview.stories.tsx
git commit -m "feat(storybook): add AnalyticsOverview stories"
```

---

## Task 14: Modal stories (DigestModal, CreateProjectModal, CommentsPanel, WidgetGeneratorModal)

**Files:**
- Create: `apps/web/src/components/dashboard/DigestModal.stories.tsx`
- Create: `apps/web/src/components/dashboard/CreateProjectModal.stories.tsx`
- Create: `apps/web/src/components/dashboard/CommentsPanel.stories.tsx`
- Create: `apps/web/src/components/dashboard/WidgetGeneratorModal.stories.tsx`

Before writing these stories, read each component file briefly to understand its props interface.

- [ ] **Step 1: Read component signatures**

```bash
grep -n "interface\|Props\|export function" apps/web/src/components/dashboard/DigestModal.tsx | head -20
grep -n "interface\|Props\|export function" apps/web/src/components/dashboard/CreateProjectModal.tsx | head -20
grep -n "interface\|Props\|export function" apps/web/src/components/dashboard/CommentsPanel.tsx | head -20
grep -n "interface\|Props\|export function" apps/web/src/components/dashboard/WidgetGeneratorModal.tsx | head -20
```

- [ ] **Step 2: Create `DigestModal.stories.tsx`** (adjust props based on actual interface from Step 1)

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { DigestModal } from "./DigestModal";

const meta: Meta<typeof DigestModal> = {
  title: "Dashboard/DigestModal",
  component: DigestModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DigestModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    projectId: "proj-1",
  },
};
```

- [ ] **Step 3: Create `CreateProjectModal.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { CreateProjectModal } from "./CreateProjectModal";

const meta: Meta<typeof CreateProjectModal> = {
  title: "Dashboard/CreateProjectModal",
  component: CreateProjectModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CreateProjectModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
};
```

- [ ] **Step 4: Create `CommentsPanel.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { CommentsPanel } from "./CommentsPanel";

const meta: Meta<typeof CommentsPanel> = {
  title: "Dashboard/CommentsPanel",
  component: CommentsPanel,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CommentsPanel>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    feedbackId: "fb-1",
  },
};
```

- [ ] **Step 5: Create `WidgetGeneratorModal.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { WidgetGeneratorModal } from "./WidgetGeneratorModal";
import { mockProject } from "@/stories/mocks";

const meta: Meta<typeof WidgetGeneratorModal> = {
  title: "Dashboard/WidgetGeneratorModal",
  component: WidgetGeneratorModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WidgetGeneratorModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    project: mockProject,
  },
};
```

Note: If any of these components make API calls via `useQuery` internally, use the same `QueryClientProvider` decorator pattern from Task 12 to pre-seed the cache.

- [ ] **Step 6: Check in Storybook — verify all 4 modals render**

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard/DigestModal.stories.tsx \
        apps/web/src/components/dashboard/CreateProjectModal.stories.tsx \
        apps/web/src/components/dashboard/CommentsPanel.stories.tsx \
        apps/web/src/components/dashboard/WidgetGeneratorModal.stories.tsx
git commit -m "feat(storybook): add dashboard modal stories"
```

---

## Task 15: Team modal stories

**Files:**
- Create: `apps/web/src/components/teams/CreateTeamModal.stories.tsx`
- Create: `apps/web/src/components/teams/CreateTeamProjectModal.stories.tsx`

Note: `CreateTeamModal` calls `useTeam()` hook internally which uses `useMutation`. We need to wrap it in a `QueryClientProvider`.

- [ ] **Step 1: Create `src/components/teams/CreateTeamModal.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTeamModal } from "./CreateTeamModal";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof CreateTeamModal> = {
  title: "Teams/CreateTeamModal",
  component: CreateTeamModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CreateTeamModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
  },
};
```

- [ ] **Step 2: Read `CreateTeamProjectModal.tsx` props, then create its story**

```bash
grep -n "interface\|Props\|export function" apps/web/src/components/teams/CreateTeamProjectModal.tsx | head -20
```

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTeamProjectModal } from "./CreateTeamProjectModal";
import { mockTeam } from "@/stories/mocks";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof CreateTeamProjectModal> = {
  title: "Teams/CreateTeamProjectModal",
  component: CreateTeamProjectModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CreateTeamProjectModal>;

export const Open: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    teamId: mockTeam.id,
  },
};
```

- [ ] **Step 3: Check in Storybook — verify both team modals render**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/teams/CreateTeamModal.stories.tsx \
        apps/web/src/components/teams/CreateTeamProjectModal.stories.tsx
git commit -m "feat(storybook): add team modal stories"
```

---

## Task 16: KanbanBoard stories

**Files:**
- Create: `apps/web/src/components/dashboard/KanbanBoard.stories.tsx`

Note: `KanbanBoard` is likely a complex component that manages its own state with columns. Read it first.

- [ ] **Step 1: Read the component signature**

```bash
grep -n "interface\|Props\|export function" apps/web/src/components/dashboard/KanbanBoard.tsx | head -20
```

- [ ] **Step 2: Create story based on actual props**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KanbanBoard } from "./KanbanBoard";
import { mockFeedback, mockFeedback2, mockFeedback3 } from "@/stories/mocks";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const meta: Meta<typeof KanbanBoard> = {
  title: "Dashboard/KanbanBoard",
  component: KanbanBoard,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KanbanBoard>;

export const WithFeedbacks: Story = {
  args: {
    feedbacks: [mockFeedback, mockFeedback2, mockFeedback3],
    projectId: "proj-1",
    onOpenComments: () => {},
  },
};

export const Empty: Story = {
  args: {
    feedbacks: [],
    projectId: "proj-1",
    onOpenComments: () => {},
  },
};
```

Adjust props to match the actual interface from Step 1.

- [ ] **Step 3: Check in Storybook — verify board renders with 4 columns**

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/KanbanBoard.stories.tsx
git commit -m "feat(storybook): add KanbanBoard stories"
```

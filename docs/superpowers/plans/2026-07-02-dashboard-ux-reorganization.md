# Dashboard UX Reorganization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize dashboard navigation from 7 scattered pages into 4 focused pages (Feedback, Analytics, Activity Log, Settings) by consolidating Archive into a tab, merging Billing/Team/Embed into Settings tabs, extracting Analytics to its own page, and hiding dev tools behind a shortcut.

**Architecture:** Each page gets one clear purpose. Settings becomes a tabbed shell importing standalone tab components. Existing query caching in TanStack Query means no extra API calls — Sidebar badge reuses the same `feedbacksQuery` cache key that FeedbackFeed already populates. Old routes become redirect pages.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, TailwindCSS 4, TypeScript strict

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/web/src/components/dashboard/FeedbackFeed.tsx` |
| Create | `apps/web/src/app/dashboard/analytics/page.tsx` |
| Create | `apps/web/src/app/dashboard/devtools/page.tsx` |
| Create | `apps/web/src/components/dashboard/DevtoolsShortcut.tsx` |
| Modify | `apps/web/src/app/dashboard/layout.tsx` |
| Modify | `apps/web/src/app/dashboard/page.tsx` |
| Create | `apps/web/src/components/settings/BillingTab.tsx` |
| Create | `apps/web/src/components/settings/TeamTab.tsx` |
| Create | `apps/web/src/components/settings/EmbedTab.tsx` |
| Modify | `apps/web/src/app/dashboard/settings/page.tsx` |
| Modify | `apps/web/src/app/dashboard/archive/page.tsx` |
| Modify | `apps/web/src/app/dashboard/billing/page.tsx` |
| Modify | `apps/web/src/app/dashboard/settings/team/page.tsx` |
| Modify | `apps/web/src/app/dashboard/embed/page.tsx` |
| Modify | `apps/web/src/components/dashboard/Sidebar.tsx` |
| Modify | `apps/web/src/components/dashboard/DashboardShell.tsx` |
| Modify | `apps/web/src/app/dashboard/activity/page.tsx` |

---

### Task 1: Add "Archived" tab to FeedbackFeed

**Files:**
- Modify: `apps/web/src/components/dashboard/FeedbackFeed.tsx`

- [ ] **Step 1: Add Archived to STATUS_TABS and fix All-tab count**

In `FeedbackFeed.tsx`, replace the `STATUS_TABS` const and the `tabs` computation:

```tsx
const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "New" },
  { label: "In Review", value: "In Review" },
  { label: "In Progress", value: "In Progress" },
  { label: "Done", value: "Done" },
  { label: "Rejected", value: "Rejected" },
  { label: "Archived", value: "Archived" },
];
```

Replace the `tabs` computation (currently after the `useMemo` block for `filtered`):

```tsx
const tabs = STATUS_TABS.map((t) => ({
  ...t,
  count:
    t.value === "all"
      ? (feedbacks as IFeedback[]).filter((f) => f.status !== "Archived").length
      : (feedbacks as IFeedback[]).filter((f) => f.status === t.value).length,
}));
```

- [ ] **Step 2: Exclude archived from non-Archived tabs in the filter**

In the `filtered` useMemo, add one line at the very top of the filter callback (before the existing `activeTab` check):

```tsx
const filtered = useMemo(() => {
  return (feedbacks as IFeedback[]).filter((f) => {
    // Archived items only appear on the Archived tab
    if (f.status === "Archived" && activeTab !== "Archived") return false;

    if (activeTab !== "all" && f.status !== activeTab) return false;
    // ... rest of existing filter logic unchanged
  });
}, [feedbacks, activeTab, filterValues]);
```

- [ ] **Step 3: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/FeedbackFeed.tsx
git commit -m "feat(feedback): add Archived status tab to FeedbackFeed"
```

---

### Task 2: Create Analytics page

**Files:**
- Create: `apps/web/src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Create the file**

`AnalyticsOverview` is already a standalone component at `@/components/analytics/AnalyticsOverview`. It needs `feedbacks: IFeedback[]` as prop (non-archived). `DigestModal` and its query move here from `dashboard/page.tsx`.

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { projectsQuery, feedbacksQuery, digestPreviewQuery } from "@/lib/queries";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { DigestModal } from "@/components/dashboard/DigestModal";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, Sparkles } from "lucide-react";
import type { IFeedback } from "@insightstream/shared-types";

export default function AnalyticsPage() {
  const { selectedProjectId } = useSelectedProject();
  const [isDigestOpen, setIsDigestOpen] = useState(false);

  const { data: projects } = useQuery(projectsQuery);
  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const { data: projectFeedbacks, isLoading } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });

  const feedbacks = (projectFeedbacks as IFeedback[] | undefined)
    ?.filter((fb) => fb.status !== "Archived") ?? [];

  const {
    data: digestData,
    isLoading: digestLoading,
    error: digestErrorRaw,
  } = useQuery({
    ...digestPreviewQuery(activeProject?.id ?? ""),
    enabled: isDigestOpen && !!activeProject?.id,
  });

  const digestError = digestErrorRaw
    ? ((digestErrorRaw as any)?.response?.data?.message ?? "Failed to generate digest")
    : null;

  return (
    <DashboardShell>
      <PageHeader
        icon={<BarChart2 className="h-8 w-8 text-brand-accent" />}
        title="Analytics"
        subtitle="Sentiment trends and category breakdown for your feedback."
        right={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsDigestOpen(true)}
            disabled={!activeProject?.id}
            className="bg-brand-accent/10 text-brand-accent border-brand-accent/30 hover:bg-brand-accent/20"
          >
            <Sparkles className="h-3.5 w-3.5 mr-2" />
            AI Digest
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton count={2} height="h-64" />
      ) : (
        <AnalyticsOverview feedbacks={feedbacks} />
      )}

      <DigestModal
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        isLoading={digestLoading}
        data={digestData}
        error={digestError}
      />
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Check PageHeader accepts a `right` prop**

Run grep to confirm:

```bash
grep -n "right" apps/web/src/components/dashboard/PageHeader.tsx
```

If `right` prop doesn't exist, check what prop name PageHeader uses for right-side content and adjust the code above accordingly. If PageHeader doesn't support right-side content, wrap the header manually:

```tsx
// Alternative if PageHeader has no right prop:
<div className="flex items-start justify-between gap-4">
  <PageHeader
    icon={<BarChart2 className="h-8 w-8 text-brand-accent" />}
    title="Analytics"
    subtitle="Sentiment trends and category breakdown for your feedback."
  />
  <Button ...>AI Digest</Button>
</div>
```

- [ ] **Step 3: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/analytics/page.tsx
git commit -m "feat: add Analytics page with charts and AI Digest"
```

---

### Task 3: Create Devtools page + keyboard shortcut

**Files:**
- Create: `apps/web/src/app/dashboard/devtools/page.tsx`
- Create: `apps/web/src/components/dashboard/DevtoolsShortcut.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create devtools page**

Extract Manual Input Testing from `dashboard/page.tsx`. The page needs: `newFeedback` state, `createMutation`, `seedProgress`/`handleSeedFeedbacks`, and `activeProject` from project query.

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { projectsQuery } from "@/lib/queries";
import { api } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Terminal, Plus } from "lucide-react";

const SEED_FEEDBACKS = [
  "The app crashes every time I try to upload a file larger than 5MB. This is a critical bug!",
  "Login page keeps throwing a 401 error even with correct credentials. Very frustrating.",
  "Dashboard is incredibly slow to load — takes over 10 seconds on first open.",
  "The new dark mode looks amazing! Great work on the UI redesign.",
  "Would love to see CSV export for the analytics section. Super useful feature request.",
  "Got charged twice for my subscription this month. Please fix billing ASAP.",
  "The mobile layout is completely broken on iPhone 14. Buttons overlap the navigation bar.",
  "API rate limiting is too aggressive — 100 req/min is not enough for our use case.",
  "Onboarding flow is very smooth and intuitive. New users will have no trouble getting started.",
  "The real-time notifications are a game changer. Love how instant the updates are!",
  "Search functionality doesn't work at all — returns no results even for exact matches.",
  "Integration with Slack is missing. This is a must-have for our team workflow.",
  "The AI summaries are surprisingly accurate. Saves us hours of manual review every week.",
  "Password reset email never arrives. Been waiting 30 minutes — checked spam too.",
  "Kanban board drag and drop is buttery smooth. Really impressive UX!",
  "Would be great to have team collaboration features — shared projects and comments.",
  "Widget embed code breaks our website layout on Safari. Works fine on Chrome.",
  "The pricing page is confusing — not clear what's included in each plan.",
  "Customer support responded in under 5 minutes. Absolutely stellar service!",
  "Data export is too slow — generating a 500-row CSV takes over 2 minutes.",
];

export default function DevtoolsPage() {
  const queryClient = useQueryClient();
  const { selectedProjectId } = useSelectedProject();
  const [newFeedback, setNewFeedback] = useState("");
  const [seedProgress, setSeedProgress] = useState<string | null>(null);

  const { data: projects } = useQuery(projectsQuery);
  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post("/feedback", {
        content,
        projectId: activeProject?.id,
        source: "Web Dashboard",
      });
      return data;
    },
    onSuccess: () => {
      setNewFeedback("");
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
    onError: () => {
      toast.error("Failed to send feedback.");
    },
  });

  const handleSeedFeedbacks = async () => {
    if (!activeProject?.id) return;
    setSeedProgress("Починаємо...");
    for (let i = 0; i < SEED_FEEDBACKS.length; i++) {
      setSeedProgress(`Додаємо ${i + 1}/${SEED_FEEDBACKS.length}...`);
      try {
        await api.post("/feedback", {
          content: SEED_FEEDBACKS[i],
          projectId: activeProject.id,
          source: "Seed Data",
        });
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        // continue on error
      }
    }
    setSeedProgress(null);
  };

  return (
    <DashboardShell>
      <PageHeader
        icon={<Terminal className="h-8 w-8 text-brand-accent" />}
        title="Developer Tools"
        subtitle="Internal tools for testing and seeding feedback data."
      />

      <Section>
        <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
          <Plus className="h-5 w-5 text-brand-accent" /> Manual Input Testing
        </h2>
        <p className="text-xs text-brand-muted mb-6">
          Submit internal feedback to test migrations or AI response tags.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newFeedback.trim()) createMutation.mutate(newFeedback);
          }}
          className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full"
        >
          <div className="w-full sm:flex-1">
            <Input
              placeholder="Type a feedback message here..."
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              className="w-full bg-brand-surface/60 border-brand-border/50 focus:border-brand-primary h-11 pl-4 text-sm"
            />
          </div>
          <Button
            type="submit"
            isLoading={createMutation.isPending}
            disabled={!newFeedback.trim()}
            variant="secondary"
            size="md"
            className="w-full sm:min-w-[140px] sm:w-auto shrink-0"
          >
            Post Internal
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSeedFeedbacks}
            disabled={!!seedProgress || !activeProject?.id}
            className="border-amber-500/30 text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/5 w-full sm:w-auto shrink-0 font-bold"
          >
            {seedProgress ?? "🌱 Seed 20 feedbacks"}
          </Button>
        </form>
      </Section>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Create keyboard shortcut client component**

```tsx
// apps/web/src/components/dashboard/DevtoolsShortcut.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DevtoolsShortcut() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        router.push("/dashboard/devtools");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
```

- [ ] **Step 3: Add shortcut to dashboard layout**

Current `layout.tsx` is a server component. Add the client component import:

```tsx
import { TrialBanner } from '@/components/billing/TrialBanner';
import { DevtoolsShortcut } from '@/components/dashboard/DevtoolsShortcut';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg">
      <TrialBanner />
      <DevtoolsShortcut />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/devtools/page.tsx apps/web/src/components/dashboard/DevtoolsShortcut.tsx apps/web/src/app/dashboard/layout.tsx
git commit -m "feat: add hidden devtools page accessible via Ctrl+Shift+D"
```

---

### Task 4: Strip down the Feedback page (was Dashboard)

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

Remove: AnalyticsOverview, DigestModal, Manual Input section, the `projectFeedbacks` query, all digest state, seed state. Keep: socket, FeedbackFeed, CreateProjectModal, CommentsPanel, PlanLimitBanner/Modal, Sidebar.

- [ ] **Step 1: Rewrite `apps/web/src/app/dashboard/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileQuery, projectsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Menu, MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";
import { FeedbackFeed } from "@/components/dashboard/FeedbackFeed";
import { CommentsPanel } from "@/components/dashboard/CommentsPanel";
import { useSocket } from "@/hooks/useSocket";
import { useTeam } from "@/hooks/useTeam";
import { toast } from "sonner";
import { usePlanUsage } from "@/hooks/use-plan-usage";
import { PlanLimitBanner } from "@/components/plan-limit-banner";
import { captureEvent } from "@/lib/posthog";
import { api } from "@/lib/api";

export default function FeedbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [commentsFeedbackId, setCommentsFeedbackId] = useState<string | null>(null);

  const { data: planUsage, isNearLimit, isAtLimit } = usePlanUsage();
  const { teams, activeTeam, switchTeam, userRole } = useTeam();

  useEffect(() => {
    captureEvent("dashboard_viewed");
  }, []);

  const { data: userProfile } = useQuery(userProfileQuery);
  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({ queryKey: ["feedbacks", activeProject?.id] });
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(null);
    },
    onError: () => {
      toast.error("Failed to delete project.");
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/");
  };

  return (
    <div data-testid="dashboard-root" className="flex flex-col h-full bg-brand-bg overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects || []}
          activeProject={activeProject}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsCreateProjectModalOpen(true)}
          onDeleteProject={(id) => deleteProjectMutation.mutate(id)}
          isDeletingProject={deleteProjectMutation.isPending}
          userProfile={userProfile}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          teams={teams}
          activeTeam={activeTeam}
          onSwitchTeam={switchTeam}
          userRole={userRole}
        />

        <main className="flex-1 overflow-hidden flex flex-col bg-brand-bg/20">
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 max-w-full">
            {isNearLimit && planUsage && (
              <PlanLimitBanner data={planUsage} isAtLimit={isAtLimit} />
            )}

            <section className="flex flex-col sm:flex-row gap-4 items-start justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 bg-brand-bg rounded-xl border border-brand-border text-brand-accent hover:text-brand-accent/80"
                >
                  <Menu size={20} />
                </button>
                <h1 className="text-2xl font-bold text-brand-fg tracking-tight flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-brand-accent" /> Feedback
                </h1>
              </div>
            </section>

            <section className="flex-1 min-h-0 max-w-full">
              {activeProject ? (
                <FeedbackFeed
                  projectId={activeProject.id}
                  currentUserId={userProfile?.id}
                />
              ) : null}
            </section>
          </div>
        </main>
      </div>

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreated={(id) => setSelectedProjectId(id)}
      />
      <CommentsPanel
        feedbackId={commentsFeedbackId}
        onClose={() => setCommentsFeedbackId(null)}
        currentUserId={userProfile?.id}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd apps/web && pnpm typecheck
```

If TypeScript complains about `onPlanLimitError` not existing on `FeedbackFeedProps`, remove that prop and the `planLimitError` state and `PlanLimitModal` from this page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): strip to Feedback-only page, move analytics/devtools out"
```

---

### Task 5: Create Settings tab components

**Files:**
- Create: `apps/web/src/components/settings/BillingTab.tsx`
- Create: `apps/web/src/components/settings/TeamTab.tsx`
- Create: `apps/web/src/components/settings/EmbedTab.tsx`

- [ ] **Step 1: Create BillingTab**

```tsx
// apps/web/src/components/settings/BillingTab.tsx
"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";

function BillingSuccessToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("You're now subscribed! Welcome to your new plan.");
      router.replace("/dashboard/settings?tab=billing");
    }
  }, [searchParams, router]);

  return null;
}

export function BillingTab() {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <BillingSuccessToast />
      </Suspense>
      <CurrentPlanCard />
      <UsageMetrics />
      <PricingCards />
    </div>
  );
}
```

- [ ] **Step 2: Create TeamTab**

Extract the content from `apps/web/src/app/dashboard/settings/team/page.tsx`, removing the `DashboardShell` and `PageHeader` wrappers. Keep all mutations and state.

```tsx
// apps/web/src/components/settings/TeamTab.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileQuery } from "@/lib/queries";
import { api } from "@/lib/api";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Shield, Mail, Trash2, Crown, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { ListItem } from "@/components/ui/list-item";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const ROLE_OPTIONS = ["admin", "member", "viewer"] as const;

export function TeamTab() {
  const queryClient = useQueryClient();
  const { activeTeam, activeTeamId, userRole } = useTeam();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");

  const { data: userProfile } = useQuery(userProfileQuery);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["teamMembers", activeTeamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeamId}/members`);
      return data;
    },
    enabled: !!activeTeamId,
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ["teamInvitations", activeTeamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeamId}/invitations`);
      return data;
    },
    enabled: !!activeTeamId && (userRole === "owner" || userRole === "admin"),
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data } = await api.post(`/teams/${activeTeamId}/invitations`, { email, role });
      return data;
    },
    onSuccess: () => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["teamInvitations"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to send invitation");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/teams/${activeTeamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/teams/${activeTeamId}/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/teams/${activeTeamId}/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamInvitations"] });
    },
  });

  const isAdmin = userRole === "owner" || userRole === "admin";

  if (!activeTeam) {
    return (
      <div className="text-center py-16 text-brand-muted text-sm">
        No team selected.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Section>
            <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-brand-accent" /> Invite Member
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteEmail.trim()) inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-brand-bg border-brand-border focus:border-brand-primary h-10"
              />
              <Select
                value={inviteRole}
                onChange={setInviteRole}
                options={ROLE_OPTIONS}
                className="w-full sm:w-[130px]"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
                className="px-6"
              >
                Send Invite
              </Button>
            </form>
          </Section>
        </motion.div>
      )}

      {isAdmin && pendingInvitations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section>
            <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-brand-accent" /> Pending Invitations
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map((inv: any) => (
                <ListItem
                  key={inv.id}
                  primary={<span className="flex items-center gap-2">{inv.email}<Badge variant="role" value={inv.role} /></span>}
                  secondary={`Invited by ${inv.invitedByEmail} · Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  actions={
                    <Button variant="ghost" size="sm" onClick={() => cancelInvitationMutation.mutate(inv.id)} className="hover:text-red-400">
                      <X className="h-4 w-4 text-brand-accent" />
                    </Button>
                  }
                />
              ))}
            </div>
          </Section>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Section>
          <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-brand-accent" /> Members ({members?.length || 0})
          </h2>
          {membersLoading ? (
            <Skeleton count={3} height="h-16" />
          ) : (
            <div className="space-y-3">
              {members?.map((member: any) => (
                <ListItem
                  key={member.id}
                  icon={member.role === "owner" ? <Crown className="h-4 w-4 text-amber-400" /> : <Users className="h-4 w-4 text-brand-accent" />}
                  primary={<span className="flex items-center gap-2">{member.email}<Badge variant="role" value={member.role} /></span>}
                  secondary={`Joined ${new Date(member.joinedAt).toLocaleDateString()}`}
                  actions={
                    <>
                      {userRole === "owner" && member.role !== "owner" && (
                        <Select
                          value={member.role}
                          onChange={(role) => changeRoleMutation.mutate({ userId: member.userId, role })}
                          options={ROLE_OPTIONS}
                          className="w-[110px]"
                        />
                      )}
                      {isAdmin && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove ${member.email} from the team?`)) {
                              removeMemberMutation.mutate(member.userId);
                            }
                          }}
                          className="hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 text-brand-accent" />
                        </Button>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Section>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Create EmbedTab**

Extract from `apps/web/src/app/dashboard/embed/page.tsx`, removing `DashboardShell`, `PageHeader`, `CreateProjectModal`.

```tsx
// apps/web/src/components/settings/EmbedTab.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { projectsQuery } from "@/lib/queries";
import {
  Code, Sparkles, Check, Type, Maximize, LayoutTemplate,
  Key, Menu, Globe, Settings as SettingsIcon, Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { CopyButton } from "@/components/ui/copy-button";
import { LabeledSection } from "@/components/ui/labeled-section";

const COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Sky", value: "#0ea5e9" },
];

const SHAPES = ["circle", "square", "rounded"] as const;
const POSITIONS = ["bottom-right", "bottom-left"] as const;
const FRAMEWORKS = ["html", "react", "angular"] as const;

export function EmbedTab() {
  const { selectedProjectId } = useSelectedProject();
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedShape, setSelectedShape] = useState<(typeof SHAPES)[number]>("rounded");
  const [selectedPosition, setSelectedPosition] = useState<(typeof POSITIONS)[number]>("bottom-right");
  const [selectedFramework, setSelectedFramework] = useState<(typeof FRAMEWORKS)[number]>("html");

  const { data: projects } = useQuery(projectsQuery);
  const activeProject = projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];
  const apiKey = activeProject?.apiKey || "LOADING...";

  const getSnippet = () => {
    const scriptUrl = process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:8080/dist/widget.iife.js";

    if (selectedFramework === "react") {
      return `import { useEffect } from 'react';

const INSIGHT_STREAM_API_KEY = '${apiKey}';

export default function InsightStreamWidget() {
  useEffect(() => {
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };
    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);
  return null;
}`;
    }

    if (selectedFramework === "angular") {
      return `import { Component, OnInit, OnDestroy } from '@angular/core';

const INSIGHT_STREAM_API_KEY = '${apiKey}';

@Component({ selector: 'app-insight-stream', template: '', standalone: true })
export class InsightStreamComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit() {
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
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
    color: '${selectedColor.value}',
    shape: '${selectedShape}',
    position: '${selectedPosition}'
  };
</script>
<script src="${scriptUrl}"></script>`;
  };

  const snippet = getSnippet();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
      <div className="xl:col-span-7 space-y-6">
        <Section>
          <h2 className="text-lg font-bold text-brand-fg mb-8 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-brand-accent" /> Visual Configuration
          </h2>
          <div className="flex flex-col gap-12">
            <LabeledSection icon={Type} label="Brand Color">
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex gap-3 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-10 h-10 rounded-full transition-all flex items-center justify-center relative",
                        selectedColor.value === color.value
                          ? "ring-2 ring-brand-accent ring-offset-4 ring-offset-brand-surface bg-opacity-100 scale-110"
                          : "opacity-60 hover:opacity-100 hover:scale-105",
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {selectedColor.value === color.value && (
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                          <Check strokeWidth={4} className="text-white w-5 h-5 drop-shadow-md" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-accent/5 border border-brand-accent/10 ml-2">
                  <Info className="h-3.5 w-3.5 text-brand-accent" />
                  <span className="text-[10px] text-brand-accent font-semibold uppercase tracking-tight">
                    Launcher & Primary Accents
                  </span>
                </div>
              </div>
            </LabeledSection>

            <div className="h-px bg-brand-border/20 w-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <LabeledSection icon={Maximize} label="Button Shape">
                <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit">
                  {SHAPES.map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setSelectedShape(shape)}
                      className={cn(
                        "min-w-[80px] px-3 py-2 text-xs font-semibold rounded-lg capitalize transition-all",
                        selectedShape === shape
                          ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                          : "text-brand-muted hover:text-brand-fg border border-transparent",
                      )}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </LabeledSection>
              <LabeledSection icon={Menu} label="Screen Position">
                <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setSelectedPosition(pos)}
                      className={cn(
                        "min-w-[100px] px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all",
                        selectedPosition === pos
                          ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                          : "text-brand-muted hover:text-brand-fg border border-transparent",
                      )}
                    >
                      {pos.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </LabeledSection>
            </div>
          </div>
        </Section>

        <Section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-brand-accent" /> Implementation Code
            </h2>
            <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw}
                  onClick={() => setSelectedFramework(fw)}
                  className={cn(
                    "min-w-[70px] px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                    selectedFramework === fw
                      ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                      : "text-brand-muted hover:text-brand-fg border border-transparent",
                  )}
                >
                  {fw === "html" ? "HTML" : fw}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-3 right-3 z-10">
              <CopyButton text={snippet} label="Copy Code" size="sm" className="h-8 px-3 text-[10px] bg-brand-surface border-brand-border hover:bg-brand-surface-hover" />
            </div>
            <pre className="bg-brand-bg border border-brand-border p-5 rounded-xl overflow-x-auto text-sm text-brand-accent/80 font-mono leading-relaxed max-h-[400px] custom-scrollbar outline-none">
              <code>{snippet}</code>
            </pre>
          </div>
          <div className="mt-4 flex items-start gap-3 p-4 bg-brand-bg/50 rounded-xl border border-brand-border/50">
            <Globe className="h-4 w-4 text-brand-accent mt-0.5 shrink-0" />
            <p className="text-xs text-brand-muted leading-relaxed">
              {selectedFramework === "html" && <>Paste this script into the <code>&lt;body&gt;</code> tag of your website.</>}
              {selectedFramework === "react" && <>Import and use this component in your React <code>App.tsx</code> or layout wrapper.</>}
              {selectedFramework === "angular" && <>Use this standalone component in your Angular application at the root level.</>}
            </p>
          </div>
        </Section>
      </div>

      <div className="xl:col-span-5 space-y-6">
        <section className="bg-brand-primary border border-brand-primary/80 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5" /> Project API Key
          </h2>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-sm font-mono truncate">{apiKey}</code>
            <CopyButton text={apiKey} label="" copiedLabel="" size="sm" className="shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all active:scale-95" />
          </div>
          <p className="text-xs text-white/80 leading-relaxed italic opacity-80">
            * Keeping your API Key secure is important. Do not expose it in public repositories.
          </p>
        </section>

        <Section className="space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-accent" /> Quick Installation Guide
          </h2>
          <div className="space-y-6">
            {[
              { n: 1, title: "Select Project", desc: "Make sure you've selected the correct project in the sidebar before copying the code." },
              { n: 2, title: "Copy & Paste", desc: "Copy the generated code snippet and place it in your application's root component or HTML file." },
              { n: 3, title: "Verify Connection", desc: "After installation, submit a test feedback. It should appear on your Feedback page instantly." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-brand-accent border border-brand-border shrink-0">{n}</div>
                <div>
                  <p className="text-xs font-bold text-brand-fg">{title}</p>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors on the new files.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/settings/
git commit -m "feat(settings): extract BillingTab, TeamTab, EmbedTab components"
```

---

### Task 6: Refactor Settings page with tab navigation

**Files:**
- Modify: `apps/web/src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Rewrite the Settings page**

```tsx
"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { userProfileQuery } from "@/lib/queries";
import { PlanType } from "@/lib/plans";
import {
  User, Mail, Calendar, Loader2, Settings,
  Palette, Monitor, Sun, Moon, LayoutList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { ListItem } from "@/components/ui/list-item";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/hooks/useColorTheme";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { BillingTab } from "@/components/settings/BillingTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { EmbedTab } from "@/components/settings/EmbedTab";

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Billing" },
  { id: "team", label: "Team" },
  { id: "embed", label: "Embed" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ColorThemeButton({ label, swatch, active, onClick }: { label: string; swatch: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
        active
          ? "border-brand-accent/50 bg-brand-accent/10 text-brand-fg"
          : "border-brand-border bg-brand-surface text-brand-muted hover:border-brand-accent/30 hover:text-brand-fg",
      )}
    >
      <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: swatch }} />
      {label}
    </button>
  );
}

function ModeButton({ label, icon: Icon, active, onClick }: { label: string; value: string; icon: LucideIcon; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
        active ? "bg-brand-accent/10 text-brand-fg shadow-sm" : "text-brand-muted hover:text-brand-fg",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "appearance") as TabId;

  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const currentPlan = (userProfile?.plan as PlanType) || PlanType.FREE;

  function setTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/dashboard/settings?${params.toString()}`);
  }

  if (profileLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-accent" /></div>;
  }

  return (
    <DashboardShell mainClassName="flex-1 overflow-hidden flex flex-col bg-brand-bg/20" noPadding>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative z-10 brand-page-container flex flex-col gap-8 text-brand-text">
          <PageHeader
            icon={<Settings className="h-8 w-8 text-brand-accent" />}
            title="Settings"
            subtitle="Manage your workspace, team, and integrations."
          />

          {/* Tab bar */}
          <div className="flex gap-1 bg-brand-surface border border-brand-border rounded-xl p-1 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20"
                    : "text-brand-muted hover:text-brand-fg",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === "appearance" && mounted && (
              <Section>
                <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-6">
                  <Palette className="h-5 w-5 text-brand-accent" /> Appearance
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-muted flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Color Theme
                    </p>
                    <div className="flex gap-3">
                      <ColorThemeButton label="Teal" swatch="#3d8a84" active={colorTheme === "teal"} onClick={() => setColorTheme("teal")} />
                      <ColorThemeButton label="Slate Blue" swatch="#5068a0" active={colorTheme === "blue"} onClick={() => setColorTheme("blue")} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-muted flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Appearance Mode
                    </p>
                    <div className="flex gap-1 rounded-xl border border-brand-border bg-brand-surface p-1">
                      <ModeButton label="System" value="system" icon={Monitor} active={theme === "system"} onClick={() => setTheme("system")} />
                      <ModeButton label="Light" value="light" icon={Sun} active={theme === "light"} onClick={() => setTheme("light")} />
                      <ModeButton label="Dark" value="dark" icon={Moon} active={theme === "dark"} onClick={() => setTheme("dark")} />
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {activeTab === "profile" && (
              <Section>
                <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-brand-accent" /> Profile
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ListItem
                    icon={<Mail className="h-4 w-4 text-brand-accent" />}
                    primary={userProfile?.email}
                    secondary="Email"
                  />
                  <ListItem
                    icon={<Calendar className="h-4 w-4 text-brand-accent" />}
                    primary={userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                    secondary="Member since"
                  />
                </div>
              </Section>
            )}

            {activeTab === "billing" && <BillingTab />}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "embed" && <EmbedTab />}
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-accent" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
```

**Note:** `Suspense` wrapper is required because `useSearchParams()` needs it in Next.js App Router.

- [ ] **Step 2: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/settings/page.tsx
git commit -m "feat(settings): consolidate Billing/Team/Embed into tabbed Settings page"
```

---

### Task 7: Convert old pages to redirects

**Files:**
- Modify: `apps/web/src/app/dashboard/archive/page.tsx`
- Modify: `apps/web/src/app/dashboard/billing/page.tsx`
- Modify: `apps/web/src/app/dashboard/settings/team/page.tsx`
- Modify: `apps/web/src/app/dashboard/embed/page.tsx`

- [ ] **Step 1: Replace each page with a redirect**

`apps/web/src/app/dashboard/archive/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function ArchivePage() {
  redirect("/dashboard");
}
```

`apps/web/src/app/dashboard/billing/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function BillingPage() {
  redirect("/dashboard/settings?tab=billing");
}
```

`apps/web/src/app/dashboard/settings/team/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function TeamSettingsPage() {
  redirect("/dashboard/settings?tab=team");
}
```

`apps/web/src/app/dashboard/embed/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function EmbedPage() {
  redirect("/dashboard/settings?tab=embed");
}
```

- [ ] **Step 2: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/dashboard/archive/page.tsx apps/web/src/app/dashboard/billing/page.tsx apps/web/src/app/dashboard/settings/team/page.tsx apps/web/src/app/dashboard/embed/page.tsx
git commit -m "chore: redirect old pages (archive, billing, embed, team) to new locations"
```

---

### Task 8: Sidebar — add New badge, move Delete to dropdown

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add feedbacksQuery import and "New" count inside Sidebar**

At the top of `Sidebar.tsx`, add imports:

```tsx
import { useQuery } from "@tanstack/react-query";
import { feedbacksQuery } from "@/lib/queries";
import type { IFeedback } from "@insightstream/shared-types";
```

Inside the `Sidebar` function body, after existing hook calls, add:

```tsx
const { data: feedbacks = [] } = useQuery({
  ...feedbacksQuery(activeProject?.id ?? ""),
  enabled: !!activeProject?.id,
});
const newCount = (feedbacks as IFeedback[]).filter((f) => f.status === "New").length;
```

- [ ] **Step 2: Add badge to the Feedback nav link**

Replace the Dashboard nav link with:

```tsx
<Link
  href="/dashboard"
  className={cn(
    "flex items-center justify-between w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
    isActive("/dashboard")
      ? "bg-brand-accent/10 text-brand-accent"
      : "text-brand-muted hover:text-brand-fg hover:bg-brand-border",
  )}
>
  <span className="flex items-center gap-3">
    <LayoutDashboard className="h-4 w-4 text-brand-accent" /> Feedback
  </span>
  {newCount > 0 && (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
      {newCount}
    </span>
  )}
</Link>
```

- [ ] **Step 3: Remove the "Project Actions" section**

Delete the entire block containing:
```tsx
<div className="my-2 border-t border-brand-border/50 mx-2" />
<div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
  Project Actions
</div>
<button onClick={...} ...>Delete Project</button>
```

- [ ] **Step 4: Add Delete Project to the project switcher dropdown**

In the project switcher `Dropdown`, after `<Dropdown.Separator />` and the "New project" item, add another separator and delete item:

```tsx
{/* Add after the existing New project Dropdown.Item */}
{activeProject && (isAdminOrOwner || !activeTeam) && (
  <>
    <Dropdown.Separator />
    <Dropdown.Item
      icon={<Trash2 className="h-4 w-4 text-red-400" />}
      onClick={() => setIsDeleteProjectOpen(true)}
    >
      <span className="text-red-400">Delete project…</span>
    </Dropdown.Item>
  </>
)}
```

Add `isDeleteProjectOpen` state at the top of the Sidebar function:

```tsx
const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
```

- [ ] **Step 5: Add delete confirmation modal**

At the bottom of the Sidebar return (before closing `</>`), add a confirmation modal:

```tsx
{isDeleteProjectOpen && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsDeleteProjectOpen(false)} />
    <div className="relative z-10 bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
      <h3 className="text-base font-bold text-brand-fg mb-2">Delete project?</h3>
      <p className="text-sm text-brand-muted mb-6">
        This will permanently delete <strong className="text-brand-fg">{activeProject?.name}</strong> and all its feedback. This cannot be undone.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setIsDeleteProjectOpen(false)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-fg border border-brand-border hover:border-brand-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (activeProject) {
              onDeleteProject(activeProject.id);
              setIsDeleteProjectOpen(false);
            }
          }}
          disabled={isDeletingProject || projects.length <= 1}
          className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDeletingProject ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "feat(sidebar): add New badge, move Delete Project to dropdown with confirmation modal"
```

---

### Task 9: Fix activeTeam bug in DashboardShell and Activity Log

**Files:**
- Modify: `apps/web/src/components/dashboard/DashboardShell.tsx`
- Modify: `apps/web/src/app/dashboard/activity/page.tsx`

- [ ] **Step 1: Fix DashboardShell**

In `DashboardShell.tsx`, add the `useTeam` hook import and replace the manual `teams` query:

```tsx
import { useTeam } from "@/hooks/useTeam";
```

Remove:
```tsx
const { data: teams } = useQuery({
  queryKey: ["teams"],
  queryFn: async () => {
    const { data } = await api.get("/teams");
    return data;
  },
});
const activeTeam = teams?.[0];
```

Replace with:
```tsx
const { teams, activeTeam, switchTeam, userRole } = useTeam();
```

Update the `Sidebar` call to pass the missing props (currently `DashboardShell` passes `teams` and `activeTeam` but not `onSwitchTeam` and `userRole`):

```tsx
<Sidebar
  projects={projects || []}
  activeProject={activeProject}
  onSelectProject={setSelectedProjectId}
  onCreateProject={() => router.push("/dashboard")}
  onDeleteProject={() => {}}
  isDeletingProject={false}
  userProfile={userProfile}
  onLogout={handleLogout}
  isOpen={isSidebarOpen}
  onClose={() => setIsSidebarOpen(false)}
  teams={teams}
  activeTeam={activeTeam}
  onSwitchTeam={switchTeam}
  userRole={userRole}
/>
```

Also remove the now-unused `api` import if it's no longer used elsewhere in the file.

- [ ] **Step 2: Fix Activity Log page**

In `apps/web/src/app/dashboard/activity/page.tsx`, replace:

```tsx
const { data: teams } = useQuery({
  queryKey: ["teams"],
  queryFn: async () => {
    const { data } = await api.get("/teams");
    return data;
  },
});
const activeTeam = teams?.[0];
```

With:

```tsx
import { useTeam } from "@/hooks/useTeam";
// ...
const { activeTeam } = useTeam();
```

Remove the now-unused `useQuery` and `api` imports if they're no longer used.

- [ ] **Step 3: Verify**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/dashboard/DashboardShell.tsx apps/web/src/app/dashboard/activity/page.tsx
git commit -m "fix: use active team instead of teams[0] in DashboardShell and Activity Log"
```

---

### Task 10: Update Sidebar nav links to match new routes

**Files:**
- Modify: `apps/web/src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Update nav links**

The Sidebar currently has links to `/dashboard/archive`, `/dashboard/embed`, `/dashboard/billing`, `/dashboard/settings/team`. These must change:

| Old link | New link |
|----------|----------|
| `/dashboard/archive` | Remove (no longer a page) |
| `/dashboard/embed` | `/dashboard/settings?tab=embed` |
| `/dashboard/billing` | `/dashboard/settings?tab=billing` |
| `/dashboard/settings/team` | `/dashboard/settings?tab=team` |

Remove the Archive nav link entirely.

Change Billing link to point to `href="/dashboard/settings?tab=billing"`.

Change Team Settings link to point to `href="/dashboard/settings?tab=team"`.

Remove the Embed Widget nav link (it's now only in Settings).

Also add the Analytics nav link:

```tsx
<Link
  href="/dashboard/analytics"
  className={cn(
    "flex items-center gap-3 w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
    isActive("/dashboard/analytics")
      ? "bg-brand-accent/10 text-brand-accent"
      : "text-brand-muted hover:text-brand-fg hover:bg-brand-border",
  )}
>
  <BarChart2 className="h-4 w-4 text-brand-accent" /> Analytics
</Link>
```

Add `BarChart2` to imports from `lucide-react`.

The `isActive` function uses exact path matching — update it to handle the Settings tab links:

```tsx
const isActive = (path: string) => {
  if (path.includes("?tab=")) {
    return pathname === path.split("?")[0] && /* can't easily check tab from pathname alone */
      false; // Settings tab items don't highlight via sidebar for now
  }
  return pathname === path;
};
```

Actually — since Billing and Team are now tabs inside Settings, highlight "Settings" link when on any Settings sub-tab. The Settings link already highlights via `isActive("/dashboard/settings")` which checks `pathname === "/dashboard/settings"`. This is correct — the Settings link stays highlighted when on the Settings page regardless of tab. So Billing and Team Settings links should be **removed from sidebar** entirely (they're no longer separate pages, just tabs).

Final sidebar nav order:
1. Feedback (`/dashboard`) — with New badge
2. Analytics (`/dashboard/analytics`)
3. Activity Log (`/dashboard/activity`)
4. `<separator>`
5. Settings (`/dashboard/settings`)

- [ ] **Step 2: Verify**

```bash
cd apps/web && pnpm typecheck && pnpm lint
```

Expected: no errors, no lint warnings.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/Sidebar.tsx
git commit -m "refactor(sidebar): update nav links to final structure (Feedback/Analytics/Activity/Settings)"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full check**

```bash
cd d:/Work/insight-stream && pnpm typecheck && pnpm lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Manual smoke test**

Start dev server:
```bash
pnpm dev
```

Verify in browser at `http://localhost:3000`:

| Check | Expected |
|-------|----------|
| `/dashboard` | Feedback page with FeedbackFeed, no analytics charts, no manual input form |
| `/dashboard/analytics` | Sentiment Trend + Category Distribution + AI Digest button |
| `/dashboard/activity` | Activity log using active team |
| `/dashboard/settings` | Tabbed settings — Appearance tab by default |
| `/dashboard/settings?tab=billing` | Billing content (plan card + usage + pricing) |
| `/dashboard/settings?tab=team` | Team members + invite form |
| `/dashboard/settings?tab=embed` | Widget config + API key |
| `/dashboard/archive` | Redirects to `/dashboard` |
| `/dashboard/billing` | Redirects to `/dashboard/settings?tab=billing` |
| `/dashboard/embed` | Redirects to `/dashboard/settings?tab=embed` |
| Sidebar | 4 links: Feedback (badge), Analytics, Activity Log, Settings |
| Ctrl+Shift+D | Navigates to `/dashboard/devtools` |
| Delete Project | Opens confirmation modal (no `window.confirm`) |
| Feedback page — "Archived" tab | Shows archived items; "All" tab hides them |

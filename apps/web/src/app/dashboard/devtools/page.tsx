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
    projects?.find((p) => p.id === selectedProjectId) || projects?.[0];

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

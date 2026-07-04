"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { projectsQuery, feedbacksQuery, digestPreviewQuery } from "@/lib/queries";
import { useTeam } from "@/hooks/useTeam";
import { BarChart2, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { DigestModal } from "@/components/dashboard/DigestModal";
import { Button } from "@/components/ui/button";
import { FeedbackStatus } from "@insightstream/shared-types";

export default function AnalyticsPage() {
  const { selectedProjectId } = useSelectedProject();
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const { activeTeamId } = useTeam();

  const { data: projects } = useQuery(projectsQuery(activeTeamId ?? ""));

  const activeProject =
    projects?.find((p) => p.id === selectedProjectId) || projects?.[0];

  const {
    data: projectFeedbacks,
    isLoading,
    isError,
  } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });

  const feedbacks =
    projectFeedbacks?.filter((fb) => fb.status !== FeedbackStatus.ARCHIVED) || [];

  const {
    data: digestData,
    isLoading: digestLoading,
    error: digestErrorRaw,
  } = useQuery({
    ...digestPreviewQuery(activeProject?.id ?? ""),
    enabled: isDigestOpen && !!activeProject?.id,
  });

  const digestError = digestErrorRaw
    ? ((digestErrorRaw as any)?.response?.data?.message ??
      "Не вдалося згенерувати digest")
    : null;

  return (
    <>
      <DashboardShell>
        <PageHeader
          icon={<BarChart2 className="h-8 w-8 text-brand-accent" />}
          title="Analytics"
          subtitle="Sentiment trends, category breakdown, and AI-generated insights."
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
        {!isLoading && !isError && feedbacks.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <AnalyticsOverview feedbacks={feedbacks} />
          </div>
        )}
        {!isLoading && feedbacks.length === 0 && (
          <div className="p-12 text-center border border-dashed border-brand-border/30 rounded-2xl text-brand-muted">
            No feedback data yet. Add some feedback to see analytics.
          </div>
        )}
      </DashboardShell>
      <DigestModal
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        isLoading={digestLoading}
        data={digestData}
        error={digestError}
      />
    </>
  );
}

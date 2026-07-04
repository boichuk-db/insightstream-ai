"use client";

import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { UsageMeter } from "@/components/ui/usage-meter";
import { Skeleton } from "@/components/ui/skeleton";
import { LabeledSection } from "@/components/ui/labeled-section";
import { BarChart2 } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";

interface UsageSummary {
  plan: string;
  projects: { current: number; max: number | null };
  feedbacksThisMonth: { current: number; max: number | null };
}

const usageQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["planUsage", teamId],
    queryFn: () =>
      api
        .get<UsageSummary>("/plans/usage", { params: { teamId } })
        .then((r) => r.data),
    enabled: !!teamId,
  });

export function UsageMetrics() {
  const { activeTeamId } = useTeam();
  const { data, isLoading } = useQuery(usageQuery(activeTeamId ?? ""));

  if (isLoading) {
    return <Skeleton count={1} height="h-28" />;
  }
  if (!data) return null;

  return (
    <div className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4">
      <LabeledSection icon={BarChart2} label="Usage this month">
        <div className="flex flex-col gap-3">
          <UsageMeter
            label="Feedback"
            current={data.feedbacksThisMonth.current}
            max={data.feedbacksThisMonth.max}
          />
          <UsageMeter
            label="Projects"
            current={data.projects.current}
            max={data.projects.max}
          />
        </div>
      </LabeledSection>
    </div>
  );
}

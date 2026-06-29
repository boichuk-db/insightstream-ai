"use client";

import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { UsageMeter } from "@/components/ui/usage-meter";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageSummary {
  plan: string;
  projects: { current: number; max: number | null };
  feedbacksThisMonth: { current: number; max: number | null };
}

const usageQuery = queryOptions({
  queryKey: ["planUsage"],
  queryFn: () => api.get<UsageSummary>("/plans/usage").then((r) => r.data),
});

export function UsageMetrics() {
  const { data, isLoading } = useQuery(usageQuery);

  if (isLoading) {
    return <Skeleton count={1} height="h-28" />;
  }
  if (!data) return null;

  return (
    <div className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-zinc-300">Usage this month</h3>
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
    </div>
  );
}

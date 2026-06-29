"use client";

import { useQuery, queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UsageSummary {
  plan: string;
  projects: { current: number; max: number | null };
  feedbacksThisMonth: { current: number; max: number | null };
}

const usageQuery = queryOptions({
  queryKey: ["planUsage"],
  queryFn: () => api.get<UsageSummary>("/plans/usage").then((r) => r.data),
});

function ProgressBar({ current, max }: { current: number; max: number | null }) {
  const percent = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isNear = percent >= 80;

  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isNear ? "bg-amber-400" : "bg-indigo-500",
          )}
          style={{ width: max ? `${percent}%` : "0%" }}
        />
      </div>
      <span className="text-xs text-zinc-500">
        {current.toLocaleString()} / {max !== null ? max.toLocaleString() : "∞"}
      </span>
    </div>
  );
}

export function UsageMetrics() {
  const { data, isLoading } = useQuery(usageQuery);

  if (isLoading) {
    return <div className="h-28 animate-pulse bg-brand-surface rounded-xl border border-brand-border" />;
  }
  if (!data) return null;

  return (
    <div className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-zinc-300">Usage this month</h3>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">Feedback</span>
          <ProgressBar
            current={data.feedbacksThisMonth.current}
            max={data.feedbacksThisMonth.max}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">Projects</span>
          <ProgressBar current={data.projects.current} max={data.projects.max} />
        </div>
      </div>
    </div>
  );
}

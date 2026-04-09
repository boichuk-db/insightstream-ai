import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PlanUsageData {
  plan: string;
  planName: string;
  feedbacksThisMonth: { current: number; max: number | null };
  projects: { current: number; max: number | null };
}

function computeLimitStatus(current: number, max: number | null) {
  if (max === null) return { isNearLimit: false, isAtLimit: false };
  const ratio = current / max;
  return {
    isNearLimit: ratio >= 0.8,
    isAtLimit: current >= max,
  };
}

export function usePlanUsage() {
  const { data, isError, isLoading } = useQuery<PlanUsageData>({
    queryKey: ["planUsage"],
    queryFn: () => api.get<PlanUsageData>("/plans/usage").then((r) => r.data),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const feedbackStatus = data
    ? computeLimitStatus(
        data.feedbacksThisMonth.current,
        data.feedbacksThisMonth.max,
      )
    : { isNearLimit: false, isAtLimit: false };

  return {
    data,
    isError,
    isLoading,
    isNearLimit: feedbackStatus.isNearLimit,
    isAtLimit: feedbackStatus.isAtLimit,
  };
}

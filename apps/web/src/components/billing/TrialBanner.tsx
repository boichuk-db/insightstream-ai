"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { planStatusQuery } from "@/lib/queries";

export function TrialBanner() {
  const router = useRouter();
  const { data } = useQuery(planStatusQuery);
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);

  if (!data || data.planStatus !== "trialing") return null;

  const daysLeft = data.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - now) / 86_400_000))
    : null;

  return (
    <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-indigo-300">
        <Zap className="h-4 w-4" />
        {daysLeft !== null
          ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your PRO trial`
          : "You are on a PRO trial"}
      </div>
      <button
        onClick={() => router.push("/dashboard/billing")}
        className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        Upgrade now →
      </button>
    </div>
  );
}

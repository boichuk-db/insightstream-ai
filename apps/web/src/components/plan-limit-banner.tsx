"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { PlanUsageData } from "@/hooks/use-plan-usage";

interface PlanLimitBannerProps {
  data: PlanUsageData;
  isAtLimit: boolean;
}

function getDismissKey() {
  const now = new Date();
  return `plan_banner_dismissed_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PlanLimitBanner({ data, isAtLimit }: PlanLimitBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(getDismissKey()) === "true",
  );

  if (dismissed) return null;

  const { current, max } = data.feedbacksThisMonth;
  // max is guaranteed non-null here (caller checks isNearLimit which returns false for null)
  const percent = Math.round((current / max!) * 100);

  const message = isAtLimit
    ? `You've reached your monthly feedback limit (${current}/${max}). Upgrade to keep collecting.`
    : `You've used ${percent}% of your monthly feedback limit (${current}/${max}). Upgrade to continue collecting insights.`;

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(), "true");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-status-warning/10 border border-status-warning/30 rounded-xl text-status-warning text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => router.push("/dashboard/billing")}
        className="shrink-0 px-3 py-1 bg-status-warning hover:opacity-90 text-black text-xs font-semibold rounded-lg transition-colors"
      >
        Upgrade Plan
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 hover:opacity-70 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

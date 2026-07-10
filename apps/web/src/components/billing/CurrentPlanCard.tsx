"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { planStatusQuery, PlanStatus } from "@/lib/queries";
import { useTeam } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function statusLabel(status: PlanStatus["planStatus"]) {
  const map: Record<PlanStatus["planStatus"], string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Payment Failed",
    canceled: "Canceled",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    unpaid: "Unpaid",
    paused: "Paused",
  };
  return map[status] ?? status;
}

function statusBadgeClass(status: PlanStatus["planStatus"]) {
  if (status === "trialing") return "bg-brand-accent/20 text-brand-accent";
  if (status === "past_due" || status === "unpaid")
    return "bg-status-danger/20 text-status-danger";
  if (
    status === "canceled" ||
    status === "incomplete_expired" ||
    status === "paused"
  )
    return "bg-zinc-500/20 text-brand-fg-muted";
  if (status === "incomplete") return "bg-status-warning/20 text-status-warning";
  return "bg-status-success/20 text-status-success";
}

export function CurrentPlanCard() {
  const { activeTeamId } = useTeam();
  const { data, isLoading } = useQuery(planStatusQuery(activeTeamId ?? ""));
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), []);

  const handleManage = async () => {
    const res = await api.get<{ url: string }>("/plans/portal", {
      params: { teamId: activeTeamId },
    });
    window.location.href = res.data.url;
  };

  if (isLoading) {
    return <Skeleton count={1} height="h-24" />;
  }
  if (!data) return null;

  const daysLeft =
    data.trialEndsAt && data.planStatus === "trialing"
      ? Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - now) / 86_400_000))
      : null;

  return (
    <div className="p-5 bg-brand-surface border border-brand-border rounded-xl flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="plan" value={data.plan} />
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              statusBadgeClass(data.planStatus),
            )}
          >
            {statusLabel(data.planStatus)}
          </span>
        </div>
        {daysLeft !== null && (
          <p className="text-sm text-brand-fg-muted">
            Trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
          </p>
        )}
        {data.planStatus === "past_due" && (
          <p className="text-sm text-status-danger">
            Payment failed — update your payment method to avoid downgrade to Free
          </p>
        )}
      </div>
      {data.stripeSubscriptionId && data.isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManage}
          className="whitespace-nowrap shrink-0"
        >
          Manage subscription →
        </Button>
      )}
    </div>
  );
}

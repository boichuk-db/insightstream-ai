"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import { planStatusQuery } from "@/lib/queries";
import { useTeam } from "@/hooks/useTeam";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Eyebrow } from "@/components/ui/eyebrow";

const PLANS = [
  {
    name: "PRO",
    monthlyPrice: "$9",
    annualPrice: "$90",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
    features: [
      "10,000 feedback/month",
      "5 projects",
      "Full AI analysis",
      "Weekly digest",
      "Data export",
      "Up to 5 team members",
    ],
  },
  {
    name: "BUSINESS",
    monthlyPrice: "$29",
    annualPrice: "$290",
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? "",
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? "",
    features: [
      "Unlimited feedback",
      "Unlimited projects",
      "Full AI analysis",
      "Weekly digest",
      "Data export",
      "Unlimited team members",
    ],
  },
];

export function PricingCards() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const { activeTeamId } = useTeam();
  const { data: status } = useQuery(planStatusQuery(activeTeamId ?? ""));

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) {
      toast.error("Price ID not configured. Check environment variables.");
      return;
    }
    setLoadingPriceId(priceId);
    try {
      const res = await api.post<{ url: string }>("/plans/checkout", {
        priceId,
        teamId: activeTeamId,
      });
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = res.data.url;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(
          "You already have an active subscription — manage it from Billing settings.",
        );
      } else {
        toast.error("Failed to start checkout. Please try again.");
      }
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-fg-muted">Upgrade Plan</h3>
        <div className="flex items-center gap-1 bg-brand-border rounded-lg p-1 text-xs">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              billing === "monthly" ? "bg-brand-surface text-brand-fg" : "text-brand-fg-muted hover:text-brand-fg",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              billing === "annual" ? "bg-brand-surface text-brand-fg" : "text-brand-fg-muted hover:text-brand-fg",
            )}
          >
            Annual <span className="text-brand-accent">–17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLANS.map((plan) => {
          const priceId = billing === "monthly" ? plan.monthlyPriceId : plan.annualPriceId;
          const displayPrice = billing === "monthly" ? plan.monthlyPrice : plan.annualPrice;
          const isCurrentPlan =
            status?.plan === plan.name &&
            (status.planStatus === "active" || status.planStatus === "trialing");
          const isNonOwner = !!status && !status.isOwner;

          return (
            <div
              key={plan.name}
              className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4"
            >
              <div>
                <Eyebrow>{plan.name}</Eyebrow>
                <p className="text-2xl font-bold text-brand-fg mt-1">
                  {displayPrice}
                  <span className="text-sm font-normal text-brand-fg-muted">
                    /{billing === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-brand-fg-muted flex items-center gap-1.5">
                    <span className="text-brand-accent shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(priceId)}
                disabled={!status || isCurrentPlan || isNonOwner || loadingPriceId === priceId}
                title={isNonOwner ? "Only the team owner manages billing" : undefined}
                className={cn(
                  "w-full py-2 rounded-lg text-sm font-medium transition-colors",
                  isCurrentPlan
                    ? "bg-brand-border text-brand-fg-muted cursor-default"
                    : "bg-brand-primary hover:bg-brand-primary/90 text-white disabled:opacity-70",
                )}
              >
                {isCurrentPlan
                  ? "Current plan"
                  : loadingPriceId === priceId
                    ? "Redirecting..."
                    : "Start 14-day trial"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

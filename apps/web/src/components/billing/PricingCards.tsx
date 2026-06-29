"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { planStatusQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { data: status } = useQuery(planStatusQuery);

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) {
      toast.error("Price ID not configured. Check environment variables.");
      return;
    }
    setLoadingPriceId(priceId);
    try {
      const res = await api.post<{ url: string }>("/plans/checkout", { priceId });
      window.location.href = res.data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Upgrade Plan</h3>
        <div className="flex items-center gap-1 bg-brand-border rounded-lg p-1 text-xs">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              billing === "monthly" ? "bg-brand-surface text-white" : "text-zinc-400 hover:text-zinc-300",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={cn(
              "px-3 py-1 rounded-md transition-colors",
              billing === "annual" ? "bg-brand-surface text-white" : "text-zinc-400 hover:text-zinc-300",
            )}
          >
            Annual <span className="text-indigo-400">–17%</span>
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

          return (
            <div
              key={plan.name}
              className="p-5 bg-brand-surface border border-brand-border rounded-xl flex flex-col gap-4"
            >
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  {plan.name}
                </p>
                <p className="text-2xl font-bold text-white mt-1">
                  {displayPrice}
                  <span className="text-sm font-normal text-zinc-400">
                    /{billing === "monthly" ? "mo" : "yr"}
                  </span>
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span className="text-indigo-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(priceId)}
                disabled={isCurrentPlan || loadingPriceId === priceId}
                className={cn(
                  "w-full py-2 rounded-lg text-sm font-medium transition-colors",
                  isCurrentPlan
                    ? "bg-brand-border text-zinc-500 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-70",
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

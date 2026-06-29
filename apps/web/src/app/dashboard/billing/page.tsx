"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";
import { ArrowLeft, CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("You're now subscribed! Welcome to your new plan.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, router]);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-6 mb-8 mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-indigo-400 hover:text-indigo-300 transition-all hover:scale-105 active:scale-95 shadow-lg group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-indigo-400" /> Billing
            </h1>
            <p className="text-brand-muted text-sm mt-1">
              Manage your plan, usage, and subscription.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 max-w-3xl">
        <CurrentPlanCard />
        <UsageMetrics />
        <PricingCards />
      </div>
    </DashboardShell>
  );
}

"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";
import { CreditCard } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
      <PageHeader
        icon={<CreditCard className="h-8 w-8 text-indigo-400" />}
        title="Billing"
        subtitle="Manage your plan, usage, and subscription."
      />

      <div className="flex flex-col gap-8">
        <CurrentPlanCard />
        <UsageMetrics />
        <PricingCards />
      </div>
    </DashboardShell>
  );
}

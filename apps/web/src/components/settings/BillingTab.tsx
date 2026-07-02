"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";

function BillingSuccessToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("You're now subscribed! Welcome to your new plan.");
      router.replace("/dashboard/settings?tab=billing");
    }
  }, [searchParams, router]);

  return null;
}

export function BillingTab() {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={null}>
        <BillingSuccessToast />
      </Suspense>
      <CurrentPlanCard />
      <UsageMetrics />
      <PricingCards />
    </div>
  );
}

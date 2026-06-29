"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMetrics } from "@/components/billing/UsageMetrics";
import { PricingCards } from "@/components/billing/PricingCards";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("You're now subscribed! Welcome to your new plan.");
      router.replace("/dashboard/billing");
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Billing</h1>
      <CurrentPlanCard />
      <UsageMetrics />
      <PricingCards />
    </div>
  );
}

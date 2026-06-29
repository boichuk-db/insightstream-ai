"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileQuery } from "@/lib/queries";
import { api } from "@/lib/api";
import {
  PLAN_CONFIGS,
  PlanType,
  formatLimit,
} from "@/lib/plans";
import {
  Sparkles,
  User,
  Mail,
  Calendar,
  Loader2,
  Check,
  Shield,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { UsageMeter } from "@/components/ui/usage-meter";
import { ListItem } from "@/components/ui/list-item";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";

const PLAN_ORDER = [PlanType.FREE, PlanType.PRO, PlanType.BUSINESS] as const;

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);

  const currentPlan = (userProfile?.plan as PlanType) || PlanType.FREE;

  const { data: usage } = useQuery({
    queryKey: ["planUsage"],
    queryFn: async () => {
      const { data } = await api.get("/plans/usage");
      return data;
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const { data } = await api.patch("/plans/upgrade", { plan });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["planUsage"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
    onError: () => {
      alert("Failed to change plan. Please try again.");
    },
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      mainClassName="flex-1 overflow-hidden flex flex-col bg-brand-bg/20"
      noPadding
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative z-10 brand-page-container text-brand-text">
          <PageHeader
            icon={<Settings className="h-8 w-8 text-indigo-400" />}
            title="Settings"
            subtitle="Manage your account and subscription plan."
          />

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-indigo-400" /> Profile
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <ListItem
                  icon={<Mail className="h-4 w-4 text-indigo-400" />}
                  primary={userProfile?.email}
                  secondary="Email"
                />
                <ListItem
                  icon={<Calendar className="h-4 w-4 text-indigo-400" />}
                  primary={
                    userProfile?.createdAt
                      ? new Date(userProfile.createdAt).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" },
                        )
                      : "—"
                  }
                  secondary="Member since"
                />
              </div>
            </Section>
          </motion.div>

          {/* Usage Section */}
          {usage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <Section>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-indigo-400" /> Current Usage
                </h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <UsageMeter
                    label="Projects"
                    current={usage.projects.current}
                    max={usage.projects.max}
                  />
                  <UsageMeter
                    label="Feedbacks this month"
                    current={usage.feedbacksThisMonth.current}
                    max={usage.feedbacksThisMonth.max}
                  />
                  <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                      AI Analysis
                    </p>
                    <p className="text-lg font-bold text-white capitalize">
                      {usage.features.aiAnalysis}
                    </p>
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {/* Plan Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
          <Section>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-indigo-400" /> Subscription
              Plan
            </h2>
            <p className="text-sm text-brand-muted mb-6">
              Select a plan that fits your needs. Changes take effect
              immediately.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              {PLAN_ORDER.map((planType) => {
                const config = PLAN_CONFIGS[planType];
                const isCurrent = currentPlan === planType;
                const isUpgrading = upgradeMutation.isPending;

                return (
                  <div
                    key={planType}
                    className={cn(
                      "relative flex flex-col p-5 rounded-xl border transition-all",
                      isCurrent
                        ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                        : "border-zinc-800/50 bg-zinc-950/50 hover:border-zinc-700",
                    )}
                  >
                    {isCurrent && (
                      <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold uppercase rounded">
                        Current
                      </div>
                    )}

                    <h3 className="text-base font-bold mb-1">
                      {config.name}
                    </h3>
                    <p className="text-xs text-brand-muted mb-3">
                      {config.description}
                    </p>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-extrabold">
                        {config.price === 0 ? "Free" : `$${config.price}`}
                      </span>
                      {config.price > 0 && (
                        <span className="text-brand-muted text-xs">/mo</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 mb-4 text-xs text-zinc-400">
                      <p>
                        {formatLimit(config.maxProjects)} project
                        {config.maxProjects !== 1 ? "s" : ""}
                      </p>
                      <p>
                        {formatLimit(config.maxFeedbacksPerMonth)}{" "}
                        feedbacks/mo
                      </p>
                      <p>AI: {config.aiAnalysis}</p>
                      <p>Digest: {config.weeklyDigest ? "Yes" : "No"}</p>
                      <p>Export: {config.dataExport ? "Yes" : "No"}</p>
                    </div>

                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                        <Check className="h-3.5 w-3.5" /> Active Plan
                      </div>
                    ) : (
                      <Button
                        variant={
                          planType === PlanType.BUSINESS
                            ? "primary"
                            : planType === PlanType.PRO
                              ? "primary"
                              : "secondary"
                        }
                        size="sm"
                        onClick={() => upgradeMutation.mutate(planType)}
                        isLoading={isUpgrading}
                        className={cn(
                          "w-full font-bold",
                          planType === PlanType.BUSINESS &&
                            "bg-amber-500 hover:bg-amber-600 text-black border-transparent",
                          planType === PlanType.PRO &&
                            "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent",
                        )}
                      >
                        Switch to {config.name}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}


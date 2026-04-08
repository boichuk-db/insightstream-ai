"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileQuery, projectsQuery } from "@/lib/queries";
import { api } from "@/lib/api";
import {
  PLAN_CONFIGS,
  PlanType,
  formatLimit,
  getPlanConfig,
} from "@/lib/plans";
import {
  Sparkles,
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Loader2,
  Check,
  Shield,
  Menu,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { useTeam } from "@/hooks/useTeam";
import { useState } from "react";
import { useSelectedProject } from "@/hooks/useSelectedProject";

const PLAN_ORDER = [PlanType.FREE, PlanType.PRO, PlanType.BUSINESS] as const;

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { teams, activeTeam, switchTeam, userRole } = useTeam();

  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);

  const currentPlan = (userProfile?.plan as PlanType) || PlanType.FREE;

  const { data: usage, isLoading: usageLoading } = useQuery({
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

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/");
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden text-brand-text">
      <Sidebar
        projects={projects || []}
        activeProject={activeProject}
        onSelectProject={setSelectedProjectId}
        onCreateProject={() => router.push("/dashboard")}
        onDeleteProject={() => {}}
        isDeletingProject={false}
        userProfile={userProfile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        teams={teams}
        activeTeam={activeTeam}
        onSwitchTeam={switchTeam}
        userRole={userRole}
      />

      <main className="flex-1 overflow-hidden flex flex-col bg-brand-bg/20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="relative z-10 brand-page-container">
            <header className="flex items-center gap-4 mb-10">
              <Button
                variant="brand"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu size={20} />
              </Button>
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-white transition-all hover:scale-105 active:scale-95 shadow-lg group"
                title="Back to Dashboard"
              >
                <ArrowLeft
                  size={20}
                  className="group-hover:-translate-x-0.5 transition-transform"
                />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <Settings className="h-8 w-8 text-indigo-400" /> Settings
                </h1>
                <p className="text-brand-muted text-sm mt-1">
                  Manage your account and subscription plan.
                </p>
              </div>
            </header>

            {/* Profile Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 mb-8"
            >
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-indigo-400" /> Profile
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                      Email
                    </p>
                    <p className="text-sm text-zinc-200">
                      {userProfile?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                      Member since
                    </p>
                    <p className="text-sm text-zinc-200">
                      {userProfile?.createdAt
                        ? new Date(userProfile.createdAt).toLocaleDateString(
                            "en-US",
                            { year: "numeric", month: "long", day: "numeric" },
                          )
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Usage Section */}
            {usage && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6 mb-8"
              >
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
              </motion.section>
            )}

            {/* Plan Selection */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-6"
            >
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
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}

function UsageMeter({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number | null;
}) {
  const pct = max ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-white">
        {current}{" "}
        <span className="text-zinc-500 text-sm font-normal">
          / {max ?? "\u221e"}
        </span>
      </p>
      {max && (
        <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct > 90
                ? "bg-red-500"
                : pct > 70
                  ? "bg-amber-500"
                  : "bg-indigo-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

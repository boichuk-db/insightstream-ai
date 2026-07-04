import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { feedbacksQuery, planStatusQuery } from "@/lib/queries";
import { FeedbackStatus } from "@insightstream/shared-types";
import type { IFeedback } from "@insightstream/shared-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Plus,
  Sparkles,
  User,
  LayoutDashboard,
  ChevronDown,
  Check,
  Trash2,
  Settings,
  Activity,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getPlanConfig, isPaidPlan, PlanType } from "@/lib/plans";
import { CreateTeamModal } from "@/components/teams/CreateTeamModal";
import { CreateTeamProjectModal } from "@/components/teams/CreateTeamProjectModal";
import { Dropdown } from "@/components/ui/dropdown";

export function Sidebar({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  isDeletingProject,
  userProfile,
  onLogout,
  isOpen,
  onClose,
  teams,
  activeTeam,
  onSwitchTeam,
  userRole,
}: {
  projects: any[];
  activeProject: any;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  isDeletingProject: boolean;
  userProfile: any;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  teams?: any[];
  activeTeam?: any;
  onSwitchTeam?: (teamId: string) => void;
  userRole?: string | null;
}) {
  const pathname = usePathname();
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateTeamProjectOpen, setIsCreateTeamProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);

  const { data: feedbacks = [] } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });
  const { data: planStatus } = useQuery(planStatusQuery(activeTeam?.id ?? ""));
  const newCount = (feedbacks as IFeedback[]).filter(
    (f) => f.status === FeedbackStatus.NEW,
  ).length;

  const isAdminOrOwner = userRole === "owner" || userRole === "admin";

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div
        className={cn(
          "fixed inset-y-0 left-0 w-64 h-screen bg-brand-surface border-r border-brand-border shrink-0 z-50 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 lg:h-full",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Decorative Glow */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-brand-accent/10 rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        {/* Brand & Team/Project Switcher */}
        <div className="p-5 flex flex-col gap-6 border-b border-brand-border/50">
          <div className="flex items-center gap-2 font-bold text-lg text-brand-fg">
            <Sparkles className="h-5 w-5 text-brand-accent" />
            InsightStream
          </div>

          {/* Team Switcher */}
          {teams && teams.length > 0 && (
            <Dropdown
              trigger={
                <button className="w-full flex items-center justify-between p-2 bg-brand-bg border border-brand-border hover:border-brand-border rounded-xl transition-colors">
                  <div className="flex items-center gap-2 px-2">
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] text-brand-accent/80 font-medium uppercase tracking-wider">
                        Team
                      </span>
                      <span className="text-sm font-semibold text-brand-fg truncate max-w-[130px]">
                        {activeTeam?.name || "Select team"}
                      </span>
                    </div>
                  </div>
                  {teams.length > 1 && (
                    <ChevronDown className="h-4 w-4 text-brand-accent/60" />
                  )}
                </button>
              }
              className="w-full"
            >
              {teams.length > 1 && (
                <div className="max-h-48 overflow-y-auto">
                  {teams.map((t: any) => (
                    <Dropdown.Item
                      key={t.id}
                      onClick={() => onSwitchTeam?.(t.id)}
                      icon={
                        activeTeam?.id === t.id ? (
                          <Check className="h-4 w-4 shrink-0" />
                        ) : undefined
                      }
                    >
                      <span
                        className={cn(
                          "truncate pr-2",
                          activeTeam?.id === t.id
                            ? "text-brand-accent font-semibold"
                            : "text-brand-muted",
                        )}
                      >
                        {t.name}
                      </span>
                    </Dropdown.Item>
                  ))}
                </div>
              )}
              <Dropdown.Separator />
              <Dropdown.Item
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateTeamOpen(true)}
              >
                Create team
              </Dropdown.Item>
            </Dropdown>
          )}

          <Dropdown
            trigger={
              <button className="w-full flex items-center justify-between p-2 rx-3 bg-brand-bg border border-brand-border hover:border-brand-border rounded-xl transition-colors group">
                <div className="flex flex-col items-start px-2">
                  <span className="text-[10px] text-brand-accent/80 font-medium uppercase tracking-wider mb-0.5">
                    Active Project
                  </span>
                  <span className="text-sm font-semibold text-brand-fg truncate max-w-[140px]">
                    {activeProject?.name || "Loading..."}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-brand-accent/60" />
              </button>
            }
            className="w-full"
          >
            <div className="max-h-60 overflow-y-auto">
              {projects?.map((p) => (
                <Dropdown.Item
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  icon={
                    activeProject?.id === p.id ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : undefined
                  }
                >
                  <span
                    className={cn(
                      "truncate pr-2",
                      activeProject?.id === p.id
                        ? "text-brand-accent font-semibold"
                        : "text-brand-muted",
                    )}
                  >
                    {p.name}
                  </span>
                </Dropdown.Item>
              ))}
            </div>
            <Dropdown.Separator />
            {isAdminOrOwner && activeTeam ? (
              <Dropdown.Item
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateTeamProjectOpen(true)}
              >
                New project
              </Dropdown.Item>
            ) : !activeTeam ? (
              <Dropdown.Item
                icon={<Plus className="h-4 w-4" />}
                onClick={onCreateProject}
              >
                New project
              </Dropdown.Item>
            ) : null}
            {activeProject && (isAdminOrOwner || !activeTeam) && (
              <>
                <Dropdown.Separator />
                <Dropdown.Item
                  icon={<Trash2 className="h-4 w-4 text-red-400" />}
                  onClick={() => setIsDeleteProjectOpen(true)}
                >
                  <span className="text-red-400">Delete project…</span>
                </Dropdown.Item>
              </>
            )}
          </Dropdown>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center justify-between w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
              isActive("/dashboard")
                ? "bg-brand-accent/10 text-brand-accent"
                : "text-brand-muted hover:text-brand-fg hover:bg-brand-border",
            )}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard className="h-4 w-4 text-brand-accent" /> Feedback
            </span>
            {newCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                {newCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/analytics"
            className={cn(
              "flex items-center gap-3 w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
              isActive("/dashboard/analytics")
                ? "bg-brand-accent/10 text-brand-accent"
                : "text-brand-muted hover:text-brand-fg hover:bg-brand-border",
            )}
          >
            <BarChart2 className="h-4 w-4 text-brand-accent" /> Analytics
          </Link>
          <Link
            href="/dashboard/activity"
            className={cn(
              "flex items-center gap-3 w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
              isActive("/dashboard/activity")
                ? "bg-brand-accent/10 text-brand-accent"
                : "text-brand-muted hover:text-brand-fg hover:bg-brand-border",
            )}
          >
            <Activity className="h-4 w-4 text-brand-accent" /> Activity Log
          </Link>

          <div className="my-1 h-px bg-brand-border/30 mx-2" />

          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 w-full p-2.5 rounded-xl font-medium text-sm transition-colors",
              isActive("/dashboard/settings")
                ? "bg-brand-accent/10 text-brand-accent"
                : "text-brand-muted hover:text-brand-fg hover:bg-brand-border",
            )}
          >
            <Settings className="h-4 w-4 text-brand-accent" /> Settings
          </Link>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t bg-brand-surface/50 border-brand-border/50 mt-auto">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 mb-4 group cursor-pointer rounded-xl p-1.5 -m-1.5 hover:bg-brand-border/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-border flex items-center justify-center border border-brand-border overflow-hidden text-brand-muted group-hover:border-brand-muted transition-colors">
              <User size={16} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-brand-fg truncate group-hover:text-brand-fg transition-colors">
                {userProfile?.email || "User"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                    planStatus?.plan === PlanType.BUSINESS
                      ? "bg-amber-500/20 text-amber-400"
                      : planStatus?.plan === PlanType.PRO
                        ? "bg-brand-accent/20 text-brand-accent"
                        : "bg-brand-border text-brand-muted",
                  )}
                >
                  {getPlanConfig(planStatus?.plan || "FREE").name}
                </span>
                {userRole && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-accent/20 text-brand-accent">
                    {userRole}
                  </span>
                )}
                {!isPaidPlan(planStatus?.plan || "FREE") && (
                  <span className="text-[10px] text-brand-accent font-medium">
                    Upgrade
                  </span>
                )}
              </div>
            </div>
          </Link>
          <Button
            onClick={onLogout}
            variant="secondary"
            size="sm"
            className="w-full text-brand-muted hover:text-brand-fg justify-start px-3"
          >
            <LogOut className="h-4 w-4 mr-2 text-brand-accent" /> Sign Out
          </Button>
        </div>
      </div>
      {isDeleteProjectOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsDeleteProjectOpen(false)}
          />
          <div className="relative z-10 bg-brand-surface border border-brand-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-base font-bold text-brand-fg mb-2">Delete project?</h3>
            <p className="text-sm text-brand-muted mb-6">
              This will permanently delete{" "}
              <strong className="text-brand-fg">{activeProject?.name}</strong> and all
              its feedback. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsDeleteProjectOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-brand-muted hover:text-brand-fg border border-brand-border hover:border-brand-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeProject) {
                    onDeleteProject(activeProject.id);
                    setIsDeleteProjectOpen(false);
                  }
                }}
                disabled={isDeletingProject || projects.length <= 1}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingProject ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
      />
      {activeTeam && (
        <CreateTeamProjectModal
          isOpen={isCreateTeamProjectOpen}
          onClose={() => setIsCreateTeamProjectOpen(false)}
          teamId={activeTeam.id}
        />
      )}
    </>
  );
}

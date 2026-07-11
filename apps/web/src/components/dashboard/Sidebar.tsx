import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { feedbacksQuery, planStatusQuery, lastSeenQuery } from "@/lib/queries";
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
  Pencil,
  Settings,
  Activity,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlanConfig, isPaidPlan, PlanType } from "@/lib/plans";
import { CreateTeamModal } from "@/components/teams/CreateTeamModal";
import { CreateTeamProjectModal } from "@/components/teams/CreateTeamProjectModal";
import { EditProjectModal } from "@/components/dashboard/EditProjectModal";
import { Dropdown } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { NavItem } from "@/components/ui/nav-item";
import { Eyebrow } from "@/components/ui/eyebrow";

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
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);

  const { data: feedbacks = [] } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });
  const { data: planStatus } = useQuery(planStatusQuery(activeTeam?.id ?? ""));
  const { data: lastSeen } = useQuery(lastSeenQuery(activeProject?.id ?? ""));
  const newCount = (feedbacks as IFeedback[]).filter((f) =>
    lastSeen === undefined
      ? false
      : lastSeen === null
        ? true
        : new Date(f.createdAt) > lastSeen,
  ).length;

  const isAdminOrOwner = userRole === "owner" || userRole === "admin";

  const isActive = (path: string) => pathname === path;

  // ConfirmDialog has no way to keep Confirm permanently disabled outside of
  // isConfirming (loading) state, so "can't delete your last project" is now
  // enforced by disabling the menu item that opens the dialog instead of the
  // dialog's own Confirm button.
  const canDeleteProject = projects.length > 1;

  // Close the confirm dialog once the pending delete settles (success or
  // error — ConfirmDialog can't tell them apart via isConfirming alone).
  // Adjusted during render, not in an effect, per React's "adjusting state
  // when a prop changes" guidance — avoids an extra cascading render.
  const [prevIsDeletingProject, setPrevIsDeletingProject] = useState(isDeletingProject);
  if (isDeletingProject !== prevIsDeletingProject) {
    setPrevIsDeletingProject(isDeletingProject);
    if (prevIsDeletingProject && !isDeletingProject) {
      setIsDeleteProjectOpen(false);
    }
  }

  const sidebarContent = (
    <>
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
              <button className="w-full flex items-center justify-between p-2 bg-brand-bg border border-brand-border hover:border-brand-border rounded-lg transition-colors">
                <div className="flex items-center gap-2 px-2">
                  <div className="flex flex-col items-start">
                    <Eyebrow className="text-brand-accent/80 font-medium tracking-wider">
                      Team
                    </Eyebrow>
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
                          : "text-brand-fg-muted",
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
            <button className="w-full flex items-center justify-between p-2 bg-brand-bg border border-brand-border hover:border-brand-border rounded-lg transition-colors group">
              <div className="flex flex-col items-start px-2">
                <Eyebrow className="text-brand-accent/80 font-medium tracking-wider mb-0.5">
                  Active Project
                </Eyebrow>
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
                      : "text-brand-fg-muted",
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
                icon={<Pencil className="h-4 w-4" />}
                onClick={() => setIsEditProjectOpen(true)}
              >
                Edit project…
              </Dropdown.Item>
              <Dropdown.Item
                icon={<Trash2 className="h-4 w-4 text-red-400" />}
                onClick={() => setIsDeleteProjectOpen(true)}
                disabled={!canDeleteProject}
              >
                <span className="text-red-400">Delete project…</span>
              </Dropdown.Item>
            </>
          )}
        </Dropdown>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          label="Feedback"
          active={isActive("/dashboard")}
          badge={
            newCount > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                {newCount}
              </span>
            ) : undefined
          }
        />
        <NavItem
          href="/dashboard/analytics"
          icon={BarChart2}
          label="Analytics"
          active={isActive("/dashboard/analytics")}
        />
        <NavItem
          href="/dashboard/activity"
          icon={Activity}
          label="Activity Log"
          active={isActive("/dashboard/activity")}
        />

        <div className="my-1 h-px bg-brand-border/30 mx-2" />

        <NavItem
          href="/dashboard/settings"
          icon={Settings}
          label="Settings"
          active={isActive("/dashboard/settings")}
        />
      </div>

      {/* User Footer */}
      <div className="p-4 border-t bg-brand-surface/50 border-brand-border/50 mt-auto flex flex-col gap-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 group cursor-pointer rounded-lg p-1.5 -m-1.5 hover:bg-brand-border/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-brand-border flex items-center justify-center border border-brand-border overflow-hidden text-brand-fg-muted group-hover:border-brand-muted transition-colors">
            <User size={16} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-brand-fg truncate group-hover:text-brand-fg transition-colors">
              {userProfile?.email || "User"}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-lg",
                  planStatus?.plan === PlanType.BUSINESS
                    ? "bg-status-warning/20 text-status-warning"
                    : planStatus?.plan === PlanType.PRO
                      ? "bg-brand-accent/20 text-brand-accent"
                      : "bg-brand-border text-brand-fg-muted",
                )}
              >
                {getPlanConfig(planStatus?.plan || "FREE").name}
              </span>
              {userRole && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-lg bg-brand-accent/20 text-brand-accent">
                  {userRole}
                </span>
              )}
              {/* TrialBanner (dashboard/layout.tsx) already shows an Upgrade
                  CTA with days-left context while trialing — don't duplicate it here. */}
              {!isPaidPlan(planStatus?.plan || "FREE") &&
                planStatus?.planStatus !== "trialing" && (
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
          className="w-full text-brand-fg-muted hover:text-brand-fg justify-start px-3"
        >
          <LogOut className="h-4 w-4 mr-2 text-brand-accent" /> Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: always part of the flex layout, never unmounted */}
      <div className="hidden lg:flex lg:relative w-64 h-full bg-brand-surface border-r border-brand-border shrink-0 flex-col">
        {sidebarContent}
      </div>

      {/* Mobile: off-canvas drawer, only mounted while open */}
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        side="left"
        className="lg:hidden w-64 max-w-none bg-brand-surface flex flex-col"
      >
        {sidebarContent}
      </Drawer>

      <ConfirmDialog
        isOpen={isDeleteProjectOpen}
        title="Delete project?"
        message={
          <>
            This will permanently delete{" "}
            <strong className="text-brand-fg">{activeProject?.name}</strong> and all
            its feedback. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        danger
        isConfirming={isDeletingProject}
        onConfirm={() => {
          if (activeProject) onDeleteProject(activeProject.id);
        }}
        onCancel={() => setIsDeleteProjectOpen(false)}
      />
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
      <EditProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        project={activeProject ?? null}
      />
    </>
  );
}

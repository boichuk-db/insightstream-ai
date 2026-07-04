"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { userProfileQuery, projectsQuery } from "@/lib/queries";
import { useTeam } from "@/hooks/useTeam";
import { Sidebar } from "@/components/dashboard/Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  mainClassName?: string;
  noPadding?: boolean;
}

export function DashboardShell({
  children,
  mainClassName,
  noPadding,
}: DashboardShellProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();

  const { teams, activeTeam, activeTeamId, switchTeam, userRole } = useTeam();
  const { data: userProfile } = useQuery(userProfileQuery);
  const { data: projects } = useQuery(projectsQuery(activeTeamId ?? ""));

  const activeProject =
    projects?.find((p) => p.id === selectedProjectId) || projects?.[0];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/");
  };

  return (
    <div className="flex h-full bg-brand-bg overflow-hidden">
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
      <main className={mainClassName ?? "flex-1 overflow-y-auto scrollbar-hide"}>
        {noPadding ? children : (
          <div className="brand-page-container">{children}</div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileQuery, projectsQuery, feedbacksQuery } from "@/lib/queries";
import { api } from "@/lib/api";
import { Menu, MessageSquare } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CreateProjectModal } from "@/components/dashboard/CreateProjectModal";
import { FeedbackFeed } from "@/components/dashboard/FeedbackFeed";
import { CommentsPanel } from "@/components/dashboard/CommentsPanel";
import { useSocket } from "@/hooks/useSocket";
import { useTeam } from "@/hooks/useTeam";
import { toast } from "sonner";
import { usePlanUsage } from "@/hooks/use-plan-usage";
import { PlanLimitBanner } from "@/components/plan-limit-banner";
import { captureEvent } from "@/lib/posthog";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedbackView } from "@/hooks/useFeedbackView";

export default function FeedbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedProjectId, setSelectedProjectId } = useSelectedProject();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [commentsFeedbackId, setCommentsFeedbackId] = useState<string | null>(null);

  const { teams, activeTeam, activeTeamId, switchTeam, userRole } = useTeam();
  const { data: planUsage, isNearLimit, isAtLimit } = usePlanUsage(activeTeamId ?? "");
  const { feedbackView } = useFeedbackView();

  useEffect(() => {
    captureEvent("dashboard_viewed");
  }, []);

  const { data: userProfile } = useQuery(userProfileQuery);
  const { data: projects } = useQuery(projectsQuery(activeTeamId ?? ""));

  const activeProject =
    projects?.find((p) => p.id === selectedProjectId) || projects?.[0];

  const {
    data: projectFeedbacks,
    isLoading,
    isError,
  } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });

  const feedbacks =
    projectFeedbacks?.filter((fb: any) => fb.status !== "Archived") || [];

  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({ queryKey: ["feedbacks", activeProject?.id] });
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["planUsage"] });
      setSelectedProjectId(null);
    },
    onError: () => {
      toast.error("Failed to delete project.");
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/");
  };

  return (
    <div data-testid="dashboard-root" className="flex flex-col h-full bg-brand-bg overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects || []}
          activeProject={activeProject}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsCreateProjectModalOpen(true)}
          onDeleteProject={(id) => deleteProjectMutation.mutate(id)}
          isDeletingProject={deleteProjectMutation.isPending}
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 max-w-full">
            {isNearLimit && planUsage && (
              <PlanLimitBanner data={planUsage} isAtLimit={isAtLimit} />
            )}

            <section className="flex flex-col sm:flex-row gap-4 items-start justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 bg-brand-bg rounded-xl border border-brand-border text-brand-accent hover:text-brand-accent/80"
                >
                  <Menu size={20} />
                </button>
                <h1 className="text-2xl font-bold text-brand-fg tracking-tight flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-brand-accent" /> Feedback
                </h1>
              </div>
            </section>

            <section className="flex-1 min-h-0 max-w-full">
              {feedbackView === "feed" ? (
                activeProject ? (
                  <FeedbackFeed
                    projectId={activeProject.id}
                    currentUserId={userProfile?.id}
                  />
                ) : null
              ) : isError ? (
                <div className="p-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl text-red-400">
                  <span className="block text-lg font-bold mb-1">Service Error</span>
                  Failed to load feedback. Make sure your local API server is running on port 3001.
                </div>
              ) : isLoading || !activeProject ? (
                <Skeleton count={5} height="h-[600px]" layout="grid" cols={5} />
              ) : (
                <KanbanBoard
                  initialFeedbacks={feedbacks}
                  projectId={activeProject?.id}
                />
              )}
            </section>
          </div>
        </main>
      </div>

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreated={(id) => setSelectedProjectId(id)}
      />
      <CommentsPanel
        feedbackId={commentsFeedbackId}
        onClose={() => setCommentsFeedbackId(null)}
        currentUserId={userProfile?.id}
      />
    </div>
  );
}

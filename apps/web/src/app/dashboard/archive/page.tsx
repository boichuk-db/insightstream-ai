"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userProfileQuery, projectsQuery, feedbacksQuery } from "@/lib/queries";
import { api } from "@/lib/api";
import { useTeam } from "@/hooks/useTeam";
import { Sparkles, Archive, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";

export default function ArchivePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedProjectId } = useSelectedProject();
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const { activeTeam } = useTeam();

  const { data: userProfile } = useQuery(userProfileQuery);

  const { data: projects } = useQuery(projectsQuery);

  const activeProject =
    projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({
      queryKey: ["feedbacks", activeProject?.id],
    });
  });

  const { data: projectFeedbacks, isLoading } = useQuery({
    ...feedbacksQuery(activeProject?.id ?? ""),
    enabled: !!activeProject?.id,
  });

  const archivedFeedbacks =
    projectFeedbacks?.filter((fb: any) => fb.status === "Archived") || [];

  const totalPages = Math.ceil(archivedFeedbacks.length / itemsPerPage);
  const paginatedFeedbacks = archivedFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/feedback/${id}/status`, { status: "New" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
    },
  });

  return (
    <DashboardShell
      mainClassName="flex-1 overflow-hidden flex flex-col bg-brand-bg/20"
      noPadding
    >
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="brand-page-container py-8 flex flex-col gap-8 flex-1 min-h-0">
          <PageHeader
            icon={<Archive className="text-brand-accent h-8 w-8" />}
            title="Archive"
            subtitle={`View or restore archived feedback for ${activeProject?.name ?? "your project"}.`}
          />

          <Section glow="none" padding="none" className="overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/50 bg-brand-surface/60">
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                      Feedback
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                      Category
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                      Archived At
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {isLoading || !activeProject ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4">
                        <Skeleton count={5} height="h-10" />
                      </td>
                    </tr>
                  ) : paginatedFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState
                          icon={Archive}
                          title="Nothing archived yet"
                          description="Resolved feedback will appear here."
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedFeedbacks.map((fb: any) => (
                      <tr
                        key={fb.id}
                        className="hover:bg-brand-surface/30 transition-colors group"
                      >
                        <td className="px-6 py-5 max-w-md">
                          <p className="text-sm text-brand-fg line-clamp-2 leading-relaxed">
                            {fb.content}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <Badge
                            variant="category"
                            value={fb.category || "Feedback"}
                            size="sm"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs text-brand-muted font-medium">
                            {new Date(fb.updatedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                              onClick={() => restoreMutation.mutate(fb.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-brand-accent" />{" "}
                              Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                              onClick={() => deleteMutation.mutate(fb.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5 text-brand-accent" />{" "}
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            <div className="px-6 py-4 bg-brand-surface/20 border-t border-brand-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-xs text-brand-muted whitespace-nowrap">
                  Showing{" "}
                  <span className="text-brand-fg font-bold">
                    {Math.min(itemsPerPage, paginatedFeedbacks.length)}
                  </span>{" "}
                  of{" "}
                  <span className="text-brand-fg font-bold">
                    {archivedFeedbacks.length}
                  </span>{" "}
                  results
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">
                    Per page:
                  </span>
                  <div className="flex bg-brand-bg border border-brand-border rounded-xl p-0.5">
                    {[20, 50, 100].map((size) => (
                      <Button
                        key={size}
                        variant={itemsPerPage === size ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => {
                          setItemsPerPage(size);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "px-3 h-7 rounded-lg",
                          itemsPerPage === size
                            ? "bg-brand-accent/20 text-brand-accent border-brand-accent/30 hover:bg-brand-accent/30"
                            : "hover:bg-white/5",
                        )}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="px-3"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 px-0",
                          currentPage === page
                            ? "bg-brand-accent/20 text-brand-accent border-brand-accent/30"
                            : "bg-transparent border-transparent text-brand-muted hover:border-brand-border",
                        )}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </DashboardShell>
  );
}

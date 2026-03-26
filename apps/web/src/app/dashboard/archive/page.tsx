'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { KanbanCard } from '@/components/dashboard/KanbanCard';
import { useTeam } from '@/hooks/useTeam';
import { Sparkles, Archive, ArrowLeft, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { getCategoryColor } from '@/lib/colors';

export default function ArchivePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const { teams, activeTeam, switchTeam, userRole } = useTeam();

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  useSocket(userProfile?.id, () => {
    queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
  });

  const activeProject = projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const { data: allFeedbacks, isLoading } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const { data } = await api.get('/feedback');
      return data;
    },
  });

  const archivedFeedbacks = allFeedbacks?.filter((fb: any) => 
    fb.projectId === activeProject?.id && fb.status === 'Archived'
  ) || [];

  const totalPages = Math.ceil(archivedFeedbacks.length / itemsPerPage);
  const paginatedFeedbacks = archivedFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/feedback/${id}/status`, { status: 'New' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.replace('/');
  };

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      <Sidebar
        projects={projects || []}
        activeProject={activeProject}
        onSelectProject={setSelectedProjectId}
        onCreateProject={() => router.push('/dashboard')}
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
          <div className="brand-page-container pt-0 flex flex-col gap-8 h-full">
            <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-indigo-400 hover:text-indigo-300 transition-all hover:scale-105 active:scale-95 shadow-lg group"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <Archive className="text-indigo-400 h-8 w-8" /> Archive
                </h1>
                <p className="text-brand-muted text-sm mt-1">View or restore archived feedback for {activeProject?.name}.</p>
              </div>
            </div>
          </header>

          <section className="bg-brand-surface/40 border border-brand-border/50 rounded-2xl overflow-hidden shadow-xl flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/50 bg-brand-surface/60">
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Feedback</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">Archived At</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-6"><div className="h-4 bg-brand-border/50 rounded w-full" /></td>
                        <td className="px-6 py-6"><div className="h-6 bg-brand-border/50 rounded-full w-20" /></td>
                        <td className="px-6 py-6"><div className="h-4 bg-brand-border/50 rounded w-24" /></td>
                        <td className="px-6 py-6"><div className="h-8 bg-brand-border/50 rounded-xl w-32 ml-auto" /></td>
                      </tr>
                    ))
                  ) : paginatedFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                          <Archive className="h-12 w-12 mb-4 text-indigo-400" />
                          <p className="text-sm font-medium">No archived feedback items found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedFeedbacks.map((fb: any) => (
                      <tr key={fb.id} className="hover:bg-brand-surface/30 transition-colors group">
                        <td className="px-6 py-5 max-w-md">
                          <p className="text-sm text-zinc-200 line-clamp-2 leading-relaxed">
                            {fb.content}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                            getCategoryColor(fb.category).bg,
                            getCategoryColor(fb.category).text,
                            getCategoryColor(fb.category).border
                          )}>
                            {fb.category || 'Feedback'}
                          </span>
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
                               <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-indigo-400" /> Restore
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                              onClick={() => deleteMutation.mutate(fb.id)}
                              disabled={deleteMutation.isPending}
                            >
                               <Trash2 className="h-3.5 w-3.5 mr-1.5 text-indigo-400" /> Delete
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
                  Showing <span className="text-zinc-200 font-bold">{Math.min(itemsPerPage, paginatedFeedbacks.length)}</span> of <span className="text-zinc-200 font-bold">{archivedFeedbacks.length}</span> results
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">Per page:</span>
                  <div className="flex bg-brand-bg border border-brand-border rounded-xl p-0.5">
                    {[20, 50, 100].map((size) => (
                      <Button
                        key={size}
                        variant={itemsPerPage === size ? 'primary' : 'ghost'}
                        size="xs"
                        onClick={() => {
                          setItemsPerPage(size);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "px-3 h-7 rounded-lg",
                          itemsPerPage === size ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30" : "hover:bg-white/5"
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
                  variant="brand" 
                  size="xs" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-3"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'primary' : 'brand'}
                      size="xs"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-8 px-0",
                        currentPage === page ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-transparent border-transparent text-brand-muted hover:border-brand-border"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="brand" 
                  size="xs" 
                  disabled={currentPage === totalPages || totalPages === 0} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
    </div>
  );
}

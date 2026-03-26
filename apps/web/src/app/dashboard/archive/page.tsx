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
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

export default function ArchivePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
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

      <main className="flex-1 overflow-hidden flex flex-col bg-neutral-950/20">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Archive className="text-amber-500 h-6 w-6" /> Archive
                </h1>
                <p className="text-neutral-500 text-sm">View or restore archived feedback for {activeProject?.name}.</p>
              </div>
            </div>
          </header>

          <section className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-neutral-900/50 rounded-2xl border border-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : archivedFeedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
                <Archive className="h-12 w-12 text-neutral-800 mb-4" />
                <p className="text-neutral-500">No archived feedback found.</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={() => {}}>
                <Droppable droppableId="archive-list">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20"
                    >
                      {archivedFeedbacks.map((fb: any, index: number) => (
                        <div key={fb.id} className="relative group">
                          <KanbanCard 
                            feedback={fb} 
                            index={index}
                            onDelete={(id: string) => deleteMutation.mutate(id)}
                            isDeleting={deleteMutation.isPending}
                            onStatusChange={() => {}}
                            onReanalyze={() => {}}
                            isReanalyzing={false}
                            isDragDisabled={true}
                          />
                          <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-4">
                            <Button
                              onClick={() => restoreMutation.mutate(fb.id)}
                              isLoading={restoreMutation.isPending}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" /> Restore
                            </Button>
                            <Button
                              onClick={() => deleteMutation.mutate(fb.id)}
                              isLoading={deleteMutation.isPending}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

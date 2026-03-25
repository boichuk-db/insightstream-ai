'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, Sparkles, Menu, Code } from 'lucide-react';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';
import { WidgetGeneratorModal } from '@/components/dashboard/WidgetGeneratorModal';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { CreateProjectModal } from '@/components/dashboard/CreateProjectModal';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { useSocket } from '@/hooks/useSocket';

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newFeedback, setNewFeedback] = useState('');
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  // Real-time updates via socket — single source of truth for feedbacks invalidation
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

  const { data: allFeedbacks, isLoading, isError } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const { data } = await api.get('/feedback');
      return data;
    },
  });

  const feedbacks = allFeedbacks?.filter((fb: any) => fb.projectId === activeProject?.id) || [];

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post('/feedback', { content, projectId: activeProject?.id, source: 'Web Dashboard' });
      return data;
    },
    onSuccess: () => {
      setNewFeedback('');
      // No manual invalidation — socket event from backend triggers it after AI analysis
    },
    onError: () => {
      alert('Failed to send feedback.');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProjectId(null);
    },
    onError: () => {
      alert('Failed to delete project.');
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
        onCreateProject={() => setIsCreateProjectModalOpen(true)}
        onDeleteProject={(id) => deleteProjectMutation.mutate(id)}
        isDeletingProject={deleteProjectMutation.isPending}
        userProfile={userProfile}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 overflow-hidden flex flex-col bg-neutral-950/20">
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8 sm:gap-10 max-w-full">

          {/* Header */}
          <section className="flex flex-col sm:flex-row gap-6 items-start justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white"
              >
                <Menu size={20} />
              </button>
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" /> Dashboard
                </h1>
                <p className="hidden xs:block text-neutral-500 text-xs sm:text-sm">Manage your project feedback and analysis.</p>
              </div>
            </div>

            <Button
              onClick={() => setIsWidgetModalOpen(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-[0_0_20px_rgba(99,102,241,0.3)] h-9 px-3 sm:px-4 text-xs"
            >
              <Code className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Embed Widget</span>
              <span className="xs:hidden">Embed</span>
            </Button>
          </section>

          {/* Manual Input */}
          <section className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6 relative group transition-all duration-300 hover:bg-neutral-900/80 shadow-2xl shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex flex-col gap-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Plus className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-none">Manual Input Testing</h3>
                  <p className="text-xs text-neutral-500 mt-1">Submit an internal feedback to test migrations or AI response tags.</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newFeedback.trim()) createMutation.mutate(newFeedback);
                }}
                className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full"
              >
                <div className="w-full sm:flex-1">
                  <Input
                    placeholder="Type a feedback message here..."
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    className="w-full bg-neutral-950/80 border-neutral-800 focus:border-indigo-500 h-11 pl-4 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending}
                  disabled={!newFeedback.trim()}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 h-11 w-full sm:min-w-[140px] sm:w-auto shrink-0"
                >
                  Post Internal
                </Button>
              </form>
            </div>
          </section>

          {/* Analytics */}
          {!isLoading && !isError && feedbacks?.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <AnalyticsOverview feedbacks={feedbacks} />
            </div>
          )}

          {/* Kanban Board */}
          <section className="flex flex-col gap-6 min-h-[600px] pb-20 max-w-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-neutral-800/50 rounded-lg border border-neutral-700">
                <MessageSquare className="h-5 w-5 text-neutral-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Feedback Pipelines</h2>
            </div>

            <div className="flex-1 min-h-[600px] w-full max-w-full overflow-hidden">
              {isLoading ? (
                <div className="flex w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-0 px-4 sm:px-0 gap-4 overflow-x-auto lg:overflow-x-hidden pb-6 scrollbar-hide">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex-1 min-w-[280px] sm:min-w-[300px] lg:min-w-0 h-[600px] bg-neutral-900/50 rounded-2xl border border-neutral-800/50 p-4 space-y-4 animate-pulse">
                      <div className="h-6 w-1/3 bg-neutral-800 rounded mb-2" />
                      {[1, 2, 3].map(j => (
                        <div key={j} className="h-32 w-full bg-neutral-800/40 rounded-xl border border-neutral-800/40" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="p-12 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-3xl text-red-400">
                  <span className="block text-lg font-bold mb-1">Service Error</span>
                  Failed to load feedback. Make sure your local API server is running on port 3001.
                </div>
              ) : (
                <KanbanBoard initialFeedbacks={feedbacks || []} />
              )}
            </div>
          </section>
        </div>
      </main>

      <WidgetGeneratorModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        apiKey={activeProject?.apiKey || 'LOADING...'}
      />
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreated={(id) => setSelectedProjectId(id)}
      />
    </div>
  );
}

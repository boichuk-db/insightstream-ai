'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { CommentsPanel } from '@/components/dashboard/CommentsPanel';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { DigestModal } from '@/components/dashboard/DigestModal';
import { useSocket } from '@/hooks/useSocket';
import { useTeam } from '@/hooks/useTeam';
import { isPaidPlan } from '@/lib/plans';

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newFeedback, setNewFeedback] = useState('');
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDigestOpen, setIsDigestOpen] = useState(false);
  const [digestData, setDigestData] = useState<any>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);

  const { teams, activeTeam, activeTeamId, switchTeam, userRole } = useTeam();
  const [commentsFeedbackId, setCommentsFeedbackId] = useState<string | null>(null);

  const handleOpenDigest = async () => {
    if (!activeProject?.id) return;
    setIsDigestOpen(true);
    setDigestData(null);
    setDigestError(null);
    setDigestLoading(true);
    try {
      const { data } = await api.get(`/digest/preview/${activeProject.id}`);
      setDigestData(data);
    } catch (e: any) {
      setDigestError(e?.response?.data?.message || 'Не вдалося згенерувати digest');
    } finally {
      setDigestLoading(false);
    }
  };

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

  const { data: usage } = useQuery({
    queryKey: ['planUsage'],
    queryFn: async () => {
      const { data } = await api.get('/plans/usage');
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

  const [seedProgress, setSeedProgress] = useState<string | null>(null);

  const SEED_FEEDBACKS = [
    'The app crashes every time I try to upload a file larger than 5MB. This is a critical bug!',
    'Login page keeps throwing a 401 error even with correct credentials. Very frustrating.',
    'Dashboard is incredibly slow to load — takes over 10 seconds on first open.',
    'The new dark mode looks amazing! Great work on the UI redesign.',
    'Would love to see CSV export for the analytics section. Super useful feature request.',
    'Got charged twice for my subscription this month. Please fix billing ASAP.',
    'The mobile layout is completely broken on iPhone 14. Buttons overlap the navigation bar.',
    'API rate limiting is too aggressive — 100 req/min is not enough for our use case.',
    'Onboarding flow is very smooth and intuitive. New users will have no trouble getting started.',
    'The real-time notifications are a game changer. Love how instant the updates are!',
    'Search functionality doesn\'t work at all — returns no results even for exact matches.',
    'Integration with Slack is missing. This is a must-have for our team workflow.',
    'The AI summaries are surprisingly accurate. Saves us hours of manual review every week.',
    'Password reset email never arrives. Been waiting 30 minutes — checked spam too.',
    'Kanban board drag and drop is buttery smooth. Really impressive UX!',
    'Would be great to have team collaboration features — shared projects and comments.',
    'Widget embed code breaks our website layout on Safari. Works fine on Chrome.',
    'The pricing page is confusing — not clear what\'s included in each plan.',
    'Customer support responded in under 5 minutes. Absolutely stellar service!',
    'Data export is too slow — generating a 500-row CSV takes over 2 minutes.',
  ];

  const handleSeedFeedbacks = async () => {
    if (!activeProject?.id) return;
    setSeedProgress('Починаємо...');
    for (let i = 0; i < SEED_FEEDBACKS.length; i++) {
      setSeedProgress(`Додаємо ${i + 1}/${SEED_FEEDBACKS.length}...`);
      try {
        await api.post('/feedback', {
          content: SEED_FEEDBACKS[i],
          projectId: activeProject.id,
          source: 'Seed Data',
        });
        await new Promise(r => setTimeout(r, 400));
      } catch {
        // continue on error
      }
    }
    setSeedProgress(null);
  };

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post('/feedback', { content, projectId: activeProject?.id, source: 'Web Dashboard' });
      return data;
    },
    onSuccess: () => {
      setNewFeedback('');
      // No manual invalidation — socket event from backend triggers it after AI analysis
    },
    onError: (error: any) => {
      if (error.response?.data?.error === 'PlanLimitExceeded') {
        if (confirm(`${error.response.data.message}\n\nWould you like to upgrade your plan?`)) {
          router.push('/pricing');
        }
      } else {
        alert('Failed to send feedback.');
      }
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
        teams={teams}
        activeTeam={activeTeam}
        onSwitchTeam={switchTeam}
        userRole={userRole}
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

          {/* Usage Meters */}
          {usage && (
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Plan</p>
                <p className="text-lg font-bold text-white">{usage.planName}</p>
              </div>
              <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Projects</p>
                <p className="text-lg font-bold text-white">
                  {usage.projects.current} <span className="text-neutral-500 text-sm font-normal">/ {usage.projects.max ?? '∞'}</span>
                </p>
                {usage.projects.max && (
                  <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usage.projects.current / usage.projects.max > 0.8 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (usage.projects.current / usage.projects.max) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Feedbacks / mo</p>
                <p className="text-lg font-bold text-white">
                  {usage.feedbacksThisMonth.current} <span className="text-neutral-500 text-sm font-normal">/ {usage.feedbacksThisMonth.max ?? '∞'}</span>
                </p>
                {usage.feedbacksThisMonth.max && (
                  <div className="mt-2 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usage.feedbacksThisMonth.current / usage.feedbacksThisMonth.max > 0.8 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (usage.feedbacksThisMonth.current / usage.feedbacksThisMonth.max) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-4">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">AI Analysis</p>
                <p className="text-lg font-bold text-white capitalize">{usage.features.aiAnalysis}</p>
                {!isPaidPlan(usage.plan) && (
                  <Link href="/pricing" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium mt-1 inline-block">
                    Upgrade for full AI
                  </Link>
                )}
              </div>
            </section>
          )}

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
                <Button
                  type="button"
                  onClick={handleSeedFeedbacks}
                  disabled={!!seedProgress || !activeProject?.id}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 h-11 w-full sm:w-auto shrink-0 font-semibold"
                >
                  {seedProgress ?? '🌱 Seed 20 feedbacks'}
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

          {/* Activity Feed */}
          {activeTeamId && (
            <ActivityFeed teamId={activeTeamId} />
          )}

          {/* Kanban Board */}
          <section className="flex flex-col gap-6 min-h-[600px] pb-20 max-w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-neutral-800/50 rounded-lg border border-neutral-700">
                  <MessageSquare className="h-5 w-5 text-neutral-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Feedback Pipelines</h2>
              </div>
              <button
                onClick={handleOpenDigest}
                disabled={!activeProject?.id}
                className="flex items-center gap-2 px-3 h-9 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Digest
              </button>
            </div>

            <div className="flex-1 w-full max-w-full">
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
                <KanbanBoard 
                  initialFeedbacks={feedbacks || []} 
                  projectId={activeProject?.id} 
                />
              )}
            </div>
          </section>
        </div>
      </main>

      <DigestModal
        isOpen={isDigestOpen}
        onClose={() => setIsDigestOpen(false)}
        isLoading={digestLoading}
        data={digestData}
        error={digestError}
      />
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
      <CommentsPanel
        feedbackId={commentsFeedbackId}
        onClose={() => setCommentsFeedbackId(null)}
        currentUserId={userProfile?.id}
      />
    </div>
  );
}

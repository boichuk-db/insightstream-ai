'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Clock, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { motion } from 'framer-motion';

export default function ActivityPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/auth/profile');
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return data;
    },
  });

  const activeTeam = teams?.[0];

  const { data: projects } = useQuery({
    queryKey: ['projects', activeTeam?.id],
    queryFn: async () => {
      const { data } = await api.get(`/projects?teamId=${activeTeam?.id}`);
      return data;
    },
    enabled: !!activeTeam?.id,
  });

  const activeProject = projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

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
      />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="brand-page-container">
          {/* Header */}
          <div className="flex flex-col gap-6 mb-8 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-indigo-400 hover:text-indigo-300 transition-all hover:scale-105 active:scale-95 shadow-lg group"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <Activity className="h-8 w-8 text-indigo-400" /> Recent Activity
                  </h1>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-surface/40 border border-brand-border/50 rounded-2xl backdrop-blur-sm">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-medium text-brand-muted">Real-time updates enabled</span>
              </div>
            </div>

            <p className="text-brand-muted text-sm leading-relaxed max-w-2xl">
              Track all changes and interactions across your team and projects. This log provides a comprehensive audit trail of system events.
            </p>
          </div>

          {/* Activity Content */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-brand-surface border border-brand-border rounded-2xl shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="p-6 border-b border-brand-border/50 bg-brand-surface/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <Activity className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white uppercase tracking-wider">Activity Feed</h2>
                      <p className="text-[10px] text-brand-muted mt-0.5">Showing last 30 events for {activeTeam?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <Button variant="brand" size="xs" className="px-3">
                        <Filter className="h-3 w-3 mr-2 text-indigo-400" /> All Events
                     </Button>
                  </div>
                </div>

                <div className="p-2 min-h-[500px]">
                  <ActivityFeed teamId={activeTeam?.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

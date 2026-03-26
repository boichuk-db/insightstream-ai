'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Shield, Mail, Trash2, ArrowLeft, Crown, X, ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Select } from '@/components/ui/select';
import { Sidebar } from '@/components/dashboard/Sidebar';

const ROLE_OPTIONS = ['admin', 'member', 'viewer'] as const;
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-indigo-500/20 text-indigo-400',
  member: 'bg-emerald-500/20 text-emerald-400',
  viewer: 'bg-zinc-700/50 text-zinc-400',
};

export default function TeamSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeTeam, activeTeamId, userRole, switchTeam, teams } = useTeam();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data;
    },
  });

  const activeProject = projects?.find((p: any) => p.id === selectedProjectId) || projects?.[0];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.replace('/');
  };

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['teamMembers', activeTeamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeamId}/members`);
      return data;
    },
    enabled: !!activeTeamId,
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ['teamInvitations', activeTeamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeamId}/invitations`);
      return data;
    },
    enabled: !!activeTeamId && (userRole === 'owner' || userRole === 'admin'),
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data } = await api.post(`/teams/${activeTeamId}/invitations`, { email, role });
      return data;
    },
    onSuccess: () => {
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['teamInvitations'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to send invitation');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/teams/${activeTeamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/teams/${activeTeamId}/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/teams/${activeTeamId}/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInvitations'] });
    },
  });

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden text-white">
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="relative z-10 brand-page-container">
            <header className="flex items-center gap-4 mb-10">
              <Button
                variant="brand"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu size={20} />
              </Button>
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-muted hover:text-white transition-all hover:scale-105 active:scale-95 shadow-lg group"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Users className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{activeTeam?.name || 'Team'} Settings</h1>
                  <p className="text-sm text-brand-muted">Manage members, roles, and invitations</p>
                </div>
              </div>
            </header>

        {/* Invite Form */}
        {isAdmin && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-400" /> Invite Member
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteEmail.trim()) {
                  inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
                }
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-brand-bg border-brand-border focus:border-indigo-500 h-10"
              />
              <Select
                value={inviteRole}
                onChange={setInviteRole}
                options={ROLE_OPTIONS}
                className="w-full sm:w-[130px]"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
                className="px-6"
              >
                Send Invite
              </Button>
            </form>
          </motion.section>
        )}

        {/* Pending Invitations */}
        {isAdmin && pendingInvitations?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-bold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvitations.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-brand-bg/50 rounded-xl border border-brand-border/50">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">{inv.email}</span>
                    <span className={cn("ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", ROLE_COLORS[inv.role])}>
                      {inv.role}
                    </span>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Invited by {inv.invitedByEmail} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => cancelInvitationMutation.mutate(inv.id)}
                    className="hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Members List */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-surface/60 border border-brand-border/50 rounded-2xl p-6"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" /> Members ({members?.length || 0})
          </h2>

          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-brand-border/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-brand-bg/50 rounded-xl border border-brand-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-border flex items-center justify-center border border-zinc-700 text-zinc-400">
                      {member.role === 'owner' ? <Crown className="h-4 w-4 text-amber-400" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-zinc-200">{member.email}</span>
                      <span className={cn("ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", ROLE_COLORS[member.role])}>
                        {member.role}
                      </span>
                      <p className="text-xs text-brand-muted mt-0.5">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Role change (Owner only, can't change owner) */}
                    {userRole === 'owner' && member.role !== 'owner' && (
                      <Select
                        value={member.role}
                        onChange={(role) => changeRoleMutation.mutate({ userId: member.userId, role })}
                        options={ROLE_OPTIONS}
                        className="w-[110px]"
                      />
                    )}

                    {/* Remove (Admin+, can't remove owner) */}
                    {isAdmin && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          if (confirm(`Remove ${member.email} from the team?`)) {
                            removeMemberMutation.mutate(member.userId);
                          }
                        }}
                        className="hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}

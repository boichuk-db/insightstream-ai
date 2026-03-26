'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Shield, Mail, Trash2, ArrowLeft, Crown, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Select } from '@/components/ui/select';

const ROLE_OPTIONS = ['admin', 'member', 'viewer'] as const;
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-500/20 text-amber-400',
  admin: 'bg-indigo-500/20 text-indigo-400',
  member: 'bg-emerald-500/20 text-emerald-400',
  viewer: 'bg-neutral-700/50 text-neutral-400',
};

export default function TeamSettingsPage() {
  const queryClient = useQueryClient();
  const { activeTeam, activeTeamId, userRole } = useTeam();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');

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
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Users className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{activeTeam?.name || 'Team'} Settings</h1>
            <p className="text-sm text-neutral-500">Manage members, roles, and invitations</p>
          </div>
        </div>

        {/* Invite Form */}
        {isAdmin && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6 mb-8"
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
                className="flex-1 bg-neutral-950 border-neutral-800 focus:border-indigo-500 h-10"
              />
              <Select
                value={inviteRole}
                onChange={setInviteRole}
                options={ROLE_OPTIONS}
                className="w-full sm:w-[130px]"
              />
              <Button
                type="submit"
                isLoading={inviteMutation.isPending}
                disabled={!inviteEmail.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white h-10 px-6"
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
            className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-lg font-bold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvitations.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
                  <div>
                    <span className="text-sm font-medium text-neutral-200">{inv.email}</span>
                    <span className={cn("ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", ROLE_COLORS[inv.role])}>
                      {inv.role}
                    </span>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Invited by {inv.invitedByEmail} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelInvitationMutation.mutate(inv.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
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
          className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-6"
        >
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" /> Members ({members?.length || 0})
          </h2>

          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-neutral-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-neutral-950/50 rounded-xl border border-neutral-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 text-neutral-400">
                      {member.role === 'owner' ? <Crown className="h-4 w-4 text-amber-400" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-neutral-200">{member.email}</span>
                      <span className={cn("ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", ROLE_COLORS[member.role])}>
                        {member.role}
                      </span>
                      <p className="text-xs text-neutral-500 mt-0.5">
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
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.email} from the team?`)) {
                            removeMemberMutation.mutate(member.userId);
                          }
                        }}
                        className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

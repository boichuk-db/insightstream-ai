'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, UserMinus, Shield, MessageCircle, FolderPlus, FolderMinus, Mail, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  member_joined: { icon: UserPlus, color: 'text-emerald-400', label: 'joined the team' },
  member_removed: { icon: UserMinus, color: 'text-red-400', label: 'was removed' },
  member_role_changed: { icon: Shield, color: 'text-amber-400', label: 'role changed' },
  feedback_status_changed: { icon: Activity, color: 'text-blue-400', label: 'updated feedback status' },
  comment_added: { icon: MessageCircle, color: 'text-indigo-400', label: 'added a comment' },
  project_created: { icon: FolderPlus, color: 'text-emerald-400', label: 'created a project' },
  project_deleted: { icon: FolderMinus, color: 'text-red-400', label: 'deleted a project' },
  invitation_sent: { icon: Mail, color: 'text-indigo-400', label: 'sent an invitation' },
};

interface ActivityFeedProps {
  teamId: string | null;
}

export function ActivityFeed({ teamId }: ActivityFeedProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['teamActivity', teamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${teamId}/activity?limit=30`);
      return data;
    },
    enabled: !!teamId,
    refetchInterval: 30000,
  });

  if (!teamId) return null;

  return (
    <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-indigo-400" /> Recent Activity
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-neutral-800/40 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !events?.length ? (
        <p className="text-sm text-neutral-500 text-center py-4">No activity yet</p>
      ) : (
        <div className="space-y-1">
          {events.map((event: any, i: number) => {
            const config = ACTION_CONFIG[event.action] || {
              icon: Activity,
              color: 'text-neutral-400',
              label: event.action,
            };
            const Icon = config.icon;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-neutral-800/30 transition-colors"
              >
                <div className={`mt-0.5 ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    <span className="font-medium text-neutral-200">{event.actorEmail}</span>{' '}
                    {config.label}
                    {event.metadata?.email && (
                      <span className="text-neutral-500"> ({event.metadata.email})</span>
                    )}
                    {event.metadata?.teamName && (
                      <span className="text-neutral-500"> "{event.metadata.teamName}"</span>
                    )}
                  </p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

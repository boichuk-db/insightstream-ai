'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export function useTeam() {
  const queryClient = useQueryClient();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('activeTeamId') : null)
  );

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return data;
    },
  });

  // Auto-select first team if none selected
  useEffect(() => {
    if (teams?.length && !activeTeamId) {
      const firstTeam = teams[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTeamId(firstTeam.id);
      localStorage.setItem('activeTeamId', firstTeam.id);
    }
  }, [teams, activeTeamId]);

  const activeTeam = teams?.find(t => t.id === activeTeamId) || teams?.[0] || null;

  const { data: members } = useQuery<TeamMember[]>({
    queryKey: ['teamMembers', activeTeam?.id],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeam!.id}/members`);
      return data;
    },
    enabled: !!activeTeam?.id,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data;
    },
  });

  const userRole = members?.find(m => m.userId === userProfile?.id)?.role || null;

  const switchTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId);
    localStorage.setItem('activeTeamId', teamId);
    // Invalidate team-scoped queries
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    queryClient.invalidateQueries({ queryKey: ['teamProjects'] });
    queryClient.invalidateQueries({ queryKey: ['teamActivity'] });
  }, [queryClient]);

  return {
    teams: teams || [],
    activeTeam,
    activeTeamId: activeTeam?.id || null,
    members: members || [],
    userRole,
    teamsLoading,
    switchTeam,
  };
}

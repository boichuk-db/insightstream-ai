"use client";

import { useTeamContext } from "@/contexts/TeamContext";

export type { Team, TeamMember, TeamContextValue } from "@/contexts/TeamContext";

/**
 * Team state shared across the app via TeamContext.
 *
 * The state (activeTeamId, teams, members, ...) lives in a single
 * <TeamProvider> instance mounted in app/dashboard/layout.tsx, so
 * switchTeam() in one component re-renders every consumer with the
 * new team id — no per-instance drift.
 */
export function useTeam() {
  return useTeamContext();
}

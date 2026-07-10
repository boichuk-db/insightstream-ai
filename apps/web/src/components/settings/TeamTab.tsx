"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Shield, Mail, Trash2, Crown, X } from "lucide-react";
import { motion } from "framer-motion";
import { Select } from "@/components/ui/select";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { ListItem } from "@/components/ui/list-item";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_OPTIONS = ["admin", "member", "viewer"] as const;

export function TeamTab() {
  const queryClient = useQueryClient();
  const { activeTeam, activeTeamId, userRole } = useTeam();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["teamMembers", activeTeamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeamId}/members`);
      return data;
    },
    enabled: !!activeTeamId,
  });

  const { data: pendingInvitations } = useQuery({
    queryKey: ["teamInvitations", activeTeamId],
    queryFn: async () => {
      const { data } = await api.get(`/teams/${activeTeamId}/invitations`);
      return data;
    },
    enabled: !!activeTeamId && (userRole === "owner" || userRole === "admin"),
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data } = await api.post(`/teams/${activeTeamId}/invitations`, { email, role });
      return data;
    },
    onSuccess: () => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["teamInvitations"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to send invitation");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/teams/${activeTeamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/teams/${activeTeamId}/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/teams/${activeTeamId}/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamInvitations"] });
    },
  });

  const isAdmin = userRole === "owner" || userRole === "admin";

  if (!activeTeam) {
    return (
      <div className="text-center py-16 text-brand-fg-muted text-sm">
        No team selected.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Section>
            <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-brand-accent" /> Invite Member
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inviteEmail.trim()) inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-brand-bg border-brand-border focus:border-brand-primary h-10"
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
          </Section>
        </motion.div>
      )}

      {isAdmin && pendingInvitations?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section>
            <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-brand-accent" /> Pending Invitations
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map((inv: any) => (
                <ListItem
                  key={inv.id}
                  primary={
                    <span className="flex items-center gap-2">
                      {inv.email}
                      <Badge variant="role" value={inv.role} />
                    </span>
                  }
                  secondary={`Invited by ${inv.invitedByEmail} · Expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  actions={
                    <Button variant="ghost" size="sm" onClick={() => cancelInvitationMutation.mutate(inv.id)} className="hover:text-red-400">
                      <X className="h-4 w-4 text-brand-accent" />
                    </Button>
                  }
                />
              ))}
            </div>
          </Section>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Section>
          <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-brand-accent" /> Members ({members?.length || 0})
          </h2>
          {membersLoading ? (
            <Skeleton count={3} height="h-16" />
          ) : (
            <div className="space-y-3">
              {members?.map((member: any) => (
                <ListItem
                  key={member.id}
                  icon={
                    member.role === "owner" ? (
                      <Crown className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Users className="h-4 w-4 text-brand-accent" />
                    )
                  }
                  primary={
                    <span className="flex items-center gap-2">
                      {member.email}
                      <Badge variant="role" value={member.role} />
                    </span>
                  }
                  secondary={`Joined ${new Date(member.joinedAt).toLocaleDateString()}`}
                  actions={
                    <>
                      {userRole === "owner" && member.role !== "owner" && (
                        <Select
                          value={member.role}
                          onChange={(role) => changeRoleMutation.mutate({ userId: member.userId, role })}
                          options={ROLE_OPTIONS}
                          className="w-[110px]"
                        />
                      )}
                      {isAdmin && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Remove ${member.email} from the team?`)) {
                              removeMemberMutation.mutate(member.userId);
                            }
                          }}
                          className="hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 text-brand-accent" />
                        </Button>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Section>
      </motion.div>
    </div>
  );
}

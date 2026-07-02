"use client";

import { Activity, Clock } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/ui/section";
import { useTeam } from "@/hooks/useTeam";

export default function ActivityPage() {
  const { activeTeam } = useTeam();

  return (
    <DashboardShell>
      <PageHeader
        icon={<Activity className="h-8 w-8 text-brand-accent" />}
        title="Recent Activity"
        subtitle="Track all changes and interactions across your team and projects."
        right={
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-surface/40 border border-brand-border/50 rounded-2xl backdrop-blur-sm">
            <Clock className="h-4 w-4 text-brand-accent" />
            <span className="text-xs font-medium text-brand-muted">Real-time updates enabled</span>
          </div>
        }
      />

      <Section glow="top-right">
        <ActivityFeed teamId={activeTeam?.id ?? null} />
      </Section>
    </DashboardShell>
  );
}

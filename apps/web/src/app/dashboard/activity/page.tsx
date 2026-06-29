"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Activity, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Section } from "@/components/ui/section";

export default function ActivityPage() {
  const router = useRouter();

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data } = await api.get("/teams");
      return data;
    },
  });

  const activeTeam = teams?.[0];

  return (
    <DashboardShell>
      <PageHeader
        icon={<Activity className="h-8 w-8 text-indigo-400" />}
        title="Recent Activity"
        subtitle="Track all changes and interactions across your team and projects."
        right={
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-surface/40 border border-brand-border/50 rounded-2xl backdrop-blur-sm">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-medium text-brand-muted">Real-time updates enabled</span>
          </div>
        }
      />

      {/* Activity Content */}
      <div className="grid grid-cols-1 gap-6">
        <Section glow="top-right" padding="sm" className="overflow-hidden">
          <div>
            <div className="p-6 border-b border-brand-border/50 bg-brand-surface/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <Activity className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Activity Feed
                  </h2>
                  <p className="text-[10px] text-brand-muted mt-0.5">
                    Showing last 30 events for {activeTeam?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="brand" size="xs" className="px-3">
                  <Filter className="h-3 w-3 mr-2 text-indigo-400" /> All
                  Events
                </Button>
              </div>
            </div>

            <div className="p-2 min-h-[500px]">
              <ActivityFeed teamId={activeTeam?.id} />
            </div>
          </div>
        </Section>
      </div>
    </DashboardShell>
  );
}

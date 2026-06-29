"use client";

import { useQuery } from "@tanstack/react-query";
import { userProfileQuery } from "@/lib/queries";
import { PlanType } from "@/lib/plans";
import {
  User,
  Mail,
  Calendar,
  Loader2,
  Settings,
  CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { ListItem } from "@/components/ui/list-item";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";

export default function SettingsPage() {
  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);

  const currentPlan = (userProfile?.plan as PlanType) || PlanType.FREE;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <DashboardShell
      mainClassName="flex-1 overflow-hidden flex flex-col bg-brand-bg/20"
      noPadding
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative z-10 brand-page-container flex flex-col gap-8 text-brand-text">
          <PageHeader
            icon={<Settings className="h-8 w-8 text-indigo-400" />}
            title="Settings"
            subtitle="Manage your account and subscription plan."
          />

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-indigo-400" /> Profile
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <ListItem
                  icon={<Mail className="h-4 w-4 text-indigo-400" />}
                  primary={userProfile?.email}
                  secondary="Email"
                />
                <ListItem
                  icon={<Calendar className="h-4 w-4 text-indigo-400" />}
                  primary={
                    userProfile?.createdAt
                      ? new Date(userProfile.createdAt).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" },
                        )
                      : "—"
                  }
                  secondary="Member since"
                />
              </div>
            </Section>
          </motion.div>

          {/* Billing & Plan Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Section>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-indigo-400" /> Billing &amp; Plan
              </h2>
              <div className="flex items-center justify-between">
                <Badge variant="plan" value={currentPlan} />
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center h-9 px-3.5 text-[11px] font-bold rounded-xl border border-transparent bg-transparent text-brand-muted hover:text-zinc-200 hover:bg-white/5 transition-all"
                >
                  Manage billing →
                </Link>
              </div>
            </Section>
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}

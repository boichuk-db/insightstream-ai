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
  Palette,
  Monitor,
  Sun,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { ListItem } from "@/components/ui/list-item";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/hooks/useColorTheme";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

function ColorThemeButton({
  label,
  swatch,
  active,
  onClick,
}: {
  label: string;
  swatch: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
        active
          ? "border-brand-accent/50 bg-brand-accent/10 text-brand-fg"
          : "border-brand-border bg-brand-surface text-brand-muted hover:border-brand-accent/30 hover:text-brand-fg",
      )}
    >
      <span
        className="h-4 w-4 rounded-full shrink-0"
        style={{ backgroundColor: swatch }}
      />
      {label}
    </button>
  );
}

function ModeButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
        active
          ? "bg-brand-accent/10 text-brand-fg shadow-sm"
          : "text-brand-muted hover:text-brand-fg",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function SettingsPage() {
  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();

  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const currentPlan = (userProfile?.plan as PlanType) || PlanType.FREE;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  return (
    <DashboardShell
      mainClassName="flex-1 overflow-hidden flex flex-col bg-brand-bg/20"
      noPadding
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="relative z-10 brand-page-container flex flex-col gap-8 text-brand-text">
          <PageHeader
            icon={<Settings className="h-8 w-8 text-brand-accent" />}
            title="Settings"
            subtitle="Manage your account and subscription plan."
          />

          {/* Appearance Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Section>
              <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
                <Palette className="h-5 w-5 text-brand-accent" /> Appearance
              </h2>
              {mounted && (
                <div className="space-y-6">
                  {/* Color Theme */}
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-muted flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Theme
                    </p>
                    <div className="flex gap-3">
                      <ColorThemeButton
                        label="Teal"
                        swatch="#3d8a84"
                        active={colorTheme === "teal"}
                        onClick={() => setColorTheme("teal")}
                      />
                      <ColorThemeButton
                        label="Slate Blue"
                        swatch="#5068a0"
                        active={colorTheme === "blue"}
                        onClick={() => setColorTheme("blue")}
                      />
                    </div>
                  </div>

                  {/* Appearance Mode */}
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-muted flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Appearance Mode
                    </p>
                    <div className="flex gap-1 rounded-xl border border-brand-border bg-brand-surface p-1">
                      <ModeButton
                        label="System"
                        value="system"
                        icon={Monitor}
                        active={theme === "system"}
                        onClick={() => setTheme("system")}
                      />
                      <ModeButton
                        label="Light"
                        value="light"
                        icon={Sun}
                        active={theme === "light"}
                        onClick={() => setTheme("light")}
                      />
                      <ModeButton
                        label="Dark"
                        value="dark"
                        icon={Moon}
                        active={theme === "dark"}
                        onClick={() => setTheme("dark")}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Section>
          </motion.div>

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Section>
              <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-brand-accent" /> Profile
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <ListItem
                  icon={<Mail className="h-4 w-4 text-brand-accent" />}
                  primary={userProfile?.email}
                  secondary="Email"
                />
                <ListItem
                  icon={<Calendar className="h-4 w-4 text-brand-accent" />}
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
            transition={{ delay: 0.2 }}
          >
            <Section>
              <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-brand-accent" /> Billing &amp; Plan
              </h2>
              <div className="flex items-center justify-between">
                <Badge variant="plan" value={currentPlan} />
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center h-9 px-3.5 text-[11px] font-bold rounded-xl border border-transparent bg-transparent text-brand-muted hover:text-brand-fg hover:bg-white/5 transition-all"
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

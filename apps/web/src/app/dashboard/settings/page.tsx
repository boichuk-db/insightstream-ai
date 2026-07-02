"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { userProfileQuery } from "@/lib/queries";
import {
  User,
  Mail,
  Calendar,
  Loader2,
  Settings,
  Palette,
  Monitor,
  Sun,
  Moon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { ListItem } from "@/components/ui/list-item";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/hooks/useColorTheme";
import { cn } from "@/lib/utils";
import { BillingTab } from "@/components/settings/BillingTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { EmbedTab } from "@/components/settings/EmbedTab";

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Billing" },
  { id: "team", label: "Team" },
  { id: "embed", label: "Embed" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "appearance") as TabId;

  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function setTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/dashboard/settings?${params.toString()}`);
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
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
            subtitle="Manage your workspace, team, and integrations."
          />

          {/* Tab bar */}
          <div className="flex gap-1 bg-brand-surface border border-brand-border rounded-xl p-1 w-fit flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20"
                    : "text-brand-muted hover:text-brand-fg",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "appearance" && mounted && (
              <Section>
                <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2 mb-6">
                  <Palette className="h-5 w-5 text-brand-accent" /> Appearance
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-muted flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Color Theme
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
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-muted flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Appearance Mode
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
              </Section>
            )}

            {activeTab === "profile" && (
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
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        : "—"
                    }
                    secondary="Member since"
                  />
                </div>
              </Section>
            )}

            {activeTab === "billing" && <BillingTab />}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "embed" && <EmbedTab />}
          </motion.div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

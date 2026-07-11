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
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/section";
import { ListItem } from "@/components/ui/list-item";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Tabs } from "@/components/ui/tabs";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useTheme } from "next-themes";
import { useColorTheme } from "@/hooks/useColorTheme";
import { BillingTab } from "@/components/settings/BillingTab";
import { TeamTab } from "@/components/settings/TeamTab";
import { EmbedTab } from "@/components/settings/EmbedTab";
import { DevtoolsTab } from "@/components/settings/DevtoolsTab";
import { useFeedbackView } from "@/hooks/useFeedbackView";

const TABS = [
  { value: "appearance", label: "Appearance" },
  { value: "profile", label: "Profile" },
  { value: "billing", label: "Billing" },
  { value: "team", label: "Team" },
  { value: "embed", label: "Embed" },
  { value: "devtools", label: "Developer Tools" },
] as const;

type TabId = (typeof TABS)[number]["value"];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") ?? "appearance") as TabId;

  const { data: userProfile, isLoading: profileLoading } = useQuery(userProfileQuery);
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { feedbackView, setFeedbackView } = useFeedbackView();
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

          <Tabs
            tabs={TABS.map((tab) => ({ label: tab.label, value: tab.value }))}
            activeTab={activeTab}
            onChange={(value) => setTab(value as TabId)}
          />

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
                    <p className="mb-3 text-sm font-medium text-brand-fg-muted flex items-center gap-2">
                      <Palette className="h-4 w-4" /> Color Theme
                    </p>
                    <div className="flex gap-3">
                      <ChoiceCard
                        selected={colorTheme === "teal"}
                        onClick={() => setColorTheme("teal")}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="h-4 w-4 rounded-full shrink-0"
                          style={{ backgroundColor: "#3d8a84" }}
                        />
                        <span className="text-sm font-medium text-brand-fg">Teal</span>
                      </ChoiceCard>
                      <ChoiceCard
                        selected={colorTheme === "blue"}
                        onClick={() => setColorTheme("blue")}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="h-4 w-4 rounded-full shrink-0"
                          style={{ backgroundColor: "#5068a0" }}
                        />
                        <span className="text-sm font-medium text-brand-fg">Slate Blue</span>
                      </ChoiceCard>
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-fg-muted flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Appearance Mode
                    </p>
                    <SegmentedControl
                      options={[
                        { label: "System", value: "system", icon: Monitor },
                        { label: "Light", value: "light", icon: Sun },
                        { label: "Dark", value: "dark", icon: Moon },
                      ]}
                      value={theme ?? "system"}
                      onChange={setTheme}
                    />
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium text-brand-fg-muted flex items-center gap-2">
                      <LayoutList className="h-4 w-4" /> Feedback View
                    </p>
                    <div className="flex gap-3">
                      <ChoiceCard
                        selected={feedbackView === "feed"}
                        onClick={() => setFeedbackView("feed")}
                        className="flex items-center gap-3"
                      >
                        <LayoutList className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium text-brand-fg">Feed</span>
                      </ChoiceCard>
                      <ChoiceCard
                        selected={feedbackView === "kanban"}
                        onClick={() => setFeedbackView("kanban")}
                        className="flex items-center gap-3"
                      >
                        <LayoutGrid className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium text-brand-fg">Kanban</span>
                      </ChoiceCard>
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
            {activeTab === "devtools" && <DevtoolsTab />}
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

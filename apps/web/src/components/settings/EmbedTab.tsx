"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { projectsQuery } from "@/lib/queries";
import { useTeam } from "@/hooks/useTeam";
import {
  Sparkles,
  LayoutTemplate,
  Key,
  Globe,
  Settings as SettingsIcon,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { CopyButton } from "@/components/ui/copy-button";
import { WidgetConfigForm } from "@/components/ui/widget-config-form";
import {
  WIDGET_COLORS,
  WIDGET_SHAPES,
  WIDGET_POSITIONS,
  WIDGET_FRAMEWORKS,
  buildWidgetSnippet,
} from "@/lib/widgetSnippet";

export function EmbedTab() {
  const { selectedProjectId } = useSelectedProject();
  const [color, setColor] = useState<(typeof WIDGET_COLORS)[number]["value"]>(
    WIDGET_COLORS[0].value,
  );
  const [shape, setShape] = useState<(typeof WIDGET_SHAPES)[number]>("rounded");
  const [position, setPosition] =
    useState<(typeof WIDGET_POSITIONS)[number]>("bottom-right");
  const [framework, setFramework] =
    useState<(typeof WIDGET_FRAMEWORKS)[number]>("html");
  const { activeTeamId } = useTeam();

  const { data: projects } = useQuery(projectsQuery(activeTeamId ?? ""));
  const activeProject =
    projects?.find((p) => p.id === selectedProjectId) || projects?.[0];
  const apiKey = activeProject?.apiKey || "LOADING...";

  const snippet = buildWidgetSnippet({
    apiKey,
    color,
    shape,
    position,
    framework,
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
      <div className="xl:col-span-7 space-y-6">
        <Section>
          <h2 className="text-lg font-bold text-brand-fg mb-8 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-brand-accent" /> Visual
            Configuration
          </h2>
          <WidgetConfigForm
            color={color}
            onColorChange={setColor}
            shape={shape}
            onShapeChange={setShape}
            position={position}
            onPositionChange={setPosition}
            framework={framework}
            onFrameworkChange={setFramework}
          />
        </Section>

        <Section>
          <h2 className="text-lg font-bold text-brand-fg mb-6 flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-brand-accent" />{" "}
            Implementation Code
          </h2>
          <div className="relative group/snippet">
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <CopyButton
                text={snippet}
                label="Copy Code"
                size="sm"
                className="h-8 px-3 text-[10px] bg-brand-surface border-brand-border hover:bg-brand-surface-hover"
              />
            </div>
            <pre className="bg-brand-bg border border-brand-border p-5 rounded-xl overflow-x-auto text-sm text-brand-accent/80 font-mono leading-relaxed max-h-[400px] custom-scrollbar focus:ring-1 focus:ring-brand-accent/30 outline-none">
              <code>{snippet}</code>
            </pre>
          </div>
          <div className="mt-4 flex items-start gap-3 p-4 bg-brand-bg/50 rounded-xl border border-brand-border/50">
            <Globe className="h-4 w-4 text-brand-accent mt-0.5 shrink-0" />
            <p className="text-xs text-brand-fg-muted leading-relaxed">
              {framework === "html" && (
                <>
                  Paste this script into the <code>&lt;body&gt;</code> tag of
                  your website. It handles loading and initialization
                  automatically.
                </>
              )}
              {framework === "react" && (
                <>
                  Import and use this component in your React{" "}
                  <code>App.tsx</code> or layout wrapper. Make sure to install
                  dependencies if needed.
                </>
              )}
              {framework === "angular" && (
                <>
                  Use this standalone component in your Angular application at
                  the root level for global feedback collection.
                </>
              )}
            </p>
          </div>
        </Section>
      </div>

      <div className="xl:col-span-5 space-y-6">
        <section className="bg-brand-primary border border-brand-primary/80 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5" /> Project API Key
          </h2>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 bg-black/20 border border-white/20 rounded-xl px-4 py-3 text-sm font-mono truncate">
              {apiKey}
            </code>
            <CopyButton
              text={apiKey}
              label=""
              copiedLabel=""
              size="sm"
              className="shrink-0 p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-all active:scale-95"
            />
          </div>
          <p className="text-xs text-white/80 leading-relaxed italic opacity-80">
            * Keeping your API Key secure is important. Do not expose it in
            public repositories.
          </p>
        </section>

        <Section className="space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-accent" /> Quick
            Installation Guide
          </h2>
          <div className="space-y-6">
            {[
              {
                n: 1,
                title: "Select Project",
                desc: "Make sure you've selected the correct project in the sidebar before copying the code.",
              },
              {
                n: 2,
                title: "Copy & Paste",
                desc: "Copy the generated code snippet and place it in your application's root component or HTML file.",
              },
              {
                n: 3,
                title: "Verify Connection",
                desc: "After installation, submit a test feedback. It should appear on your Feedback page instantly.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-brand-accent border border-brand-border shrink-0">
                  {n}
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-fg">{title}</p>
                  <p className="text-xs text-brand-fg-muted mt-1 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

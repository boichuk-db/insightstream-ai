"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelectedProject } from "@/hooks/useSelectedProject";
import { projectsQuery } from "@/lib/queries";
import { useTeam } from "@/hooks/useTeam";
import {
  Sparkles,
  Check,
  Type,
  Maximize,
  LayoutTemplate,
  Key,
  Menu,
  Globe,
  Settings as SettingsIcon,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Section } from "@/components/ui/section";
import { CopyButton } from "@/components/ui/copy-button";
import { LabeledSection } from "@/components/ui/labeled-section";

const COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Sky", value: "#0ea5e9" },
];

const SHAPES = ["circle", "square", "rounded"] as const;
const POSITIONS = ["bottom-right", "bottom-left"] as const;
const FRAMEWORKS = ["html", "react", "angular"] as const;

export function EmbedTab() {
  const { selectedProjectId } = useSelectedProject();
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedShape, setSelectedShape] = useState<(typeof SHAPES)[number]>("rounded");
  const [selectedPosition, setSelectedPosition] = useState<(typeof POSITIONS)[number]>("bottom-right");
  const [selectedFramework, setSelectedFramework] = useState<(typeof FRAMEWORKS)[number]>("html");
  const { activeTeamId } = useTeam();

  const { data: projects } = useQuery(projectsQuery(activeTeamId ?? ""));
  const activeProject = projects?.find((p) => p.id === selectedProjectId) || projects?.[0];
  const apiKey = activeProject?.apiKey || "LOADING...";

  const getSnippet = () => {
    const scriptUrl = process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:8080/dist/widget.iife.js";

    if (selectedFramework === "react") {
      return `import { useEffect } from 'react';

const INSIGHT_STREAM_API_KEY = '${apiKey}';

export default function InsightStreamWidget() {
  useEffect(() => {
    // 1. Set configuration
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    // 2. Load the widget script
    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}`;
    }

    if (selectedFramework === "angular") {
      return `import { Component, OnInit, OnDestroy } from '@angular/core';

const INSIGHT_STREAM_API_KEY = '${apiKey}';

@Component({
  selector: 'app-insight-stream',
  template: '',
  standalone: true
})
export class InsightStreamComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit() {
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    this.scriptElement = document.createElement('script');
    this.scriptElement.src = "${scriptUrl}";
    this.scriptElement.async = true;
    document.body.appendChild(this.scriptElement);
  }

  ngOnDestroy() {
    if (this.scriptElement && document.body.contains(this.scriptElement)) {
      document.body.removeChild(this.scriptElement);
    }
  }
}`;
    }

    return `<!-- InsightStream AI Widget -->
<script id="insight-stream-config">
  window.InsightStreamConfig = {
    apiKey: '${apiKey}',
    color: '${selectedColor.value}',
    shape: '${selectedShape}',
    position: '${selectedPosition}'
  };
</script>
<script src="${scriptUrl}"></script>`;
  };

  const snippet = getSnippet();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
      <div className="xl:col-span-7 space-y-6">
        <Section>
          <h2 className="text-lg font-bold text-brand-fg mb-8 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-brand-accent" /> Visual Configuration
          </h2>
          <div className="flex flex-col gap-12">
            <LabeledSection icon={Type} label="Brand Color">
              <div className="flex gap-4 flex-wrap items-center">
                <div className="flex gap-3 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-10 h-10 rounded-full transition-all flex items-center justify-center relative",
                        selectedColor.value === color.value
                          ? "ring-2 ring-brand-accent ring-offset-4 ring-offset-brand-surface bg-opacity-100 scale-110"
                          : "opacity-60 hover:opacity-100 hover:scale-105",
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    >
                      {selectedColor.value === color.value && (
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                          <Check strokeWidth={4} className="text-white w-5 h-5 drop-shadow-md" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-accent/5 border border-brand-accent/10 ml-2">
                  <Info className="h-3.5 w-3.5 text-brand-accent" />
                  <span className="text-[10px] text-brand-accent font-semibold uppercase tracking-tight">
                    Launcher & Primary Accents
                  </span>
                </div>
              </div>
            </LabeledSection>

            <div className="h-px bg-brand-border/20 w-full" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="min-w-0">
                <LabeledSection icon={Maximize} label="Button Shape">
                  <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit max-w-full overflow-x-auto no-scrollbar">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        onClick={() => setSelectedShape(shape)}
                        className={cn(
                          "min-w-[80px] px-3 py-2 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap",
                          selectedShape === shape
                            ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                            : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                        )}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </LabeledSection>
              </div>
              <div className="min-w-0">
                <LabeledSection icon={Menu} label="Screen Position">
                  <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit max-w-full overflow-x-auto no-scrollbar">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setSelectedPosition(pos)}
                        className={cn(
                          "min-w-[100px] px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap",
                          selectedPosition === pos
                            ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                            : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                        )}
                      >
                        {pos.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </LabeledSection>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-brand-fg flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-brand-accent" /> Implementation Code
            </h2>
            <div className="flex bg-brand-bg rounded-xl p-1 border border-brand-border w-fit">
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw}
                  onClick={() => setSelectedFramework(fw)}
                  className={cn(
                    "min-w-[70px] px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                    selectedFramework === fw
                      ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                      : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                  )}
                >
                  {fw === "html" ? "HTML" : fw}
                </button>
              ))}
            </div>
          </div>
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
              {selectedFramework === "html" && (
                <>Paste this script into the <code>&lt;body&gt;</code> tag of your website. It handles loading and initialization automatically.</>
              )}
              {selectedFramework === "react" && (
                <>Import and use this component in your React <code>App.tsx</code> or layout wrapper. Make sure to install dependencies if needed.</>
              )}
              {selectedFramework === "angular" && (
                <>Use this standalone component in your Angular application at the root level for global feedback collection.</>
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
            * Keeping your API Key secure is important. Do not expose it in public repositories.
          </p>
        </section>

        <Section className="space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-accent" /> Quick Installation Guide
          </h2>
          <div className="space-y-6">
            {[
              { n: 1, title: "Select Project", desc: "Make sure you've selected the correct project in the sidebar before copying the code." },
              { n: 2, title: "Copy & Paste", desc: "Copy the generated code snippet and place it in your application's root component or HTML file." },
              { n: 3, title: "Verify Connection", desc: "After installation, submit a test feedback. It should appear on your Feedback page instantly." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-brand-bg flex items-center justify-center text-[10px] font-bold text-brand-accent border border-brand-border shrink-0">{n}</div>
                <div>
                  <p className="text-xs font-bold text-brand-fg">{title}</p>
                  <p className="text-xs text-brand-fg-muted mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

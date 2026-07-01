// apps/web/src/components/dashboard/AITrendsBar.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import { feedbackTrendsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface AITrendsBarProps {
  projectId: string;
  onThemeFilter: (theme: string) => void;
}

export function AITrendsBar({ projectId, onThemeFilter }: AITrendsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: trends, isLoading } = useQuery(feedbackTrendsQuery(projectId));

  if (isLoading || !trends?.length) return null;

  return (
    <div className="border-b border-brand-accent/15 bg-brand-accent/[0.04]">
      <div
        className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-brand-accent/[0.07] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-1.5 text-brand-accent shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            AI Trends
          </span>
        </div>

        {!expanded && (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {trends.map((theme) => (
              <button
                key={theme.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onThemeFilter(theme.name);
                }}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-accent/8 border border-brand-accent/20 text-[11px] text-brand-fg/80 hover:bg-brand-accent/15 hover:text-brand-fg transition-colors"
              >
                <span>{theme.emoji}</span>
                <span>{theme.name}</span>
                <span className="text-brand-accent font-semibold">
                  {theme.count}
                </span>
              </button>
            ))}
          </div>
        )}
        {expanded && <div className="flex-1" />}

        <div className="flex items-center gap-1 text-brand-muted text-[11px] shrink-0">
          {expanded ? (
            <>
              Collapse <ChevronDown className="w-3 h-3" />
            </>
          ) : (
            <>
              Details <ChevronRight className="w-3 h-3" />
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {trends.map((theme) => (
            <button
              key={theme.name}
              onClick={() => onThemeFilter(theme.name)}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border border-brand-border",
                "bg-brand-surface text-left hover:border-brand-accent/30 hover:bg-brand-accent/5 transition-colors",
              )}
            >
              <div className="flex items-center gap-2 text-sm text-brand-fg">
                <span>{theme.emoji}</span>
                <span>{theme.name}</span>
              </div>
              <span className="text-brand-accent font-bold text-sm">
                {theme.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

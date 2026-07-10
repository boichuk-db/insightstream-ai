"use client";

import { cn } from "@/lib/utils";

export interface TabItem {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function Tabs({ tabs, activeTab, onChange, className, rightSlot }: TabsProps) {
  return (
    <div className={cn("flex items-center border-b border-brand-border bg-brand-surface overflow-x-auto", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors",
            activeTab === tab.value ? "border-brand-accent text-brand-fg" : "border-transparent text-brand-fg-muted hover:text-brand-fg",
          )}
        >
          {tab.label}
        </button>
      ))}
      {rightSlot && <div className="ml-auto pr-4">{rightSlot}</div>}
    </div>
  );
}

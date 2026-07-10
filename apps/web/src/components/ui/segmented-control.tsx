"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn("flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit", className)}>
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-w-[80px] items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              value === opt.value
                ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { FeedbackStatus } from "@insightstream/shared-types";
import { getStatusConfig } from "@/lib/statusConfig";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";
import { Check, ChevronDown } from "lucide-react";

const ALL_STATUSES = Object.values(FeedbackStatus);

interface StatusSelectProps {
  value: FeedbackStatus;
  onChange: (value: FeedbackStatus) => void;
  size?: "sm" | "md";
  className?: string;
}

export function StatusSelect({ value, onChange, size = "md", className }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const config = getStatusConfig(value);

  return (
    <Popover
      align="left"
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider transition-colors",
            size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
            config.badge,
            className,
          )}
        >
          {value}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      }
    >
      <div className="flex flex-col gap-0.5 min-w-[140px]">
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              onChange(status);
              // Closes the popover on selection — Popover has no built-in
              // close-on-select; omitting this is a caught, recurring regression
              // (see Task 5's Select/FilterChips fixes for the same bug).
              setOpen(false);
            }}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors",
              status === value
                ? "text-brand-accent bg-brand-accent/5"
                : "text-brand-fg-muted hover:bg-white/5 hover:text-brand-fg",
            )}
          >
            {status}
            {status === value && <Check className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}

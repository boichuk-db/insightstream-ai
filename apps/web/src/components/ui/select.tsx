"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  className?: string;
  placeholder?: string;
}

export function Select({ value, onChange, options, className, placeholder }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = value || placeholder;

  return (
    <div className={cn("relative min-w-[120px]", className)}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        className="min-w-[120px] w-full mt-1.5 p-1"
        trigger={
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-fg ring-offset-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/30 transition-all min-w-[120px]"
          >
            <span className="capitalize">{selectedOption}</span>
            <ChevronDown className="h-4 w-4 text-brand-fg-muted transition-transform duration-200" />
          </button>
        }
      >
        <div className="flex flex-col gap-0.5">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                // Closes the popover on selection — Popover has no built-in
                // close-on-select; omitting this re-introduces a caught regression.
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                value === option
                  ? "bg-brand-accent/10 text-brand-accent font-medium"
                  : "text-brand-fg-muted hover:bg-brand-surface hover:text-brand-fg",
              )}
            >
              <span className="capitalize">{option}</span>
              {value === option && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

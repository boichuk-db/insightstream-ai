"use client";

import { cn } from "@/lib/utils";

interface ChoiceCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ChoiceCard({ selected, onClick, children, className }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/30"
          : "border-brand-border bg-brand-surface hover:border-brand-border-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}

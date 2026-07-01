// apps/web/src/components/ui/FilterChips.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";

export interface ChipOption {
  label: string;
  value: string;
}

export interface FilterGroup {
  key: string;
  label?: string;
  options: ChipOption[];
  multi?: boolean;
}

interface FilterChipsProps {
  groups: FilterGroup[];
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  className?: string;
}

function DropdownChip({
  group,
  selected,
  onChange,
}: {
  group: FilterGroup;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    if (group.multi) {
      onChange(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value],
      );
    } else {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
    }
  }

  const hasActive = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-colors",
          hasActive
            ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent"
            : "bg-transparent border-dashed border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-fg",
        )}
      >
        {group.label}
        {hasActive && (
          <span className="bg-brand-accent text-brand-bg rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-brand-surface border border-brand-border rounded-xl shadow-lg py-1">
          {group.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                selected.includes(opt.value)
                  ? "text-brand-accent bg-brand-accent/5"
                  : "text-brand-fg hover:bg-brand-surface-hover",
              )}
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
                  selected.includes(opt.value)
                    ? "border-brand-accent bg-brand-accent"
                    : "border-brand-border",
                )}
              >
                {selected.includes(opt.value) && (
                  <Check className="w-2.5 h-2.5 text-brand-bg" />
                )}
              </span>
              {opt.label}
            </button>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-muted hover:text-brand-fg border-t border-brand-border mt-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FilterChips({ groups, values, onChange, className }: FilterChipsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-5 py-2 border-b border-brand-border bg-brand-bg flex-wrap",
        className,
      )}
    >
      {groups.map((group, i) => (
        <div key={group.key} className="flex items-center gap-2">
          {i > 0 && <div className="w-px h-4 bg-brand-border" />}
          {group.options.length <= 4 && !group.multi ? (
            group.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  onChange(
                    group.key,
                    values[group.key]?.includes(opt.value) ? [] : [opt.value],
                  )
                }
                className={cn(
                  "px-3 py-1 rounded-full text-xs border transition-colors",
                  values[group.key]?.includes(opt.value)
                    ? "bg-brand-accent/10 border-brand-accent/30 text-brand-accent"
                    : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-muted hover:text-brand-fg",
                )}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <DropdownChip
              group={group}
              selected={values[group.key] ?? []}
              onChange={(v) => onChange(group.key, v)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

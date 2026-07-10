"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  className?: string;
  placeholder?: string;
}

export function Select({
  value,
  onChange,
  options,
  className,
  placeholder,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = value || placeholder;

  return (
    <div className={cn("relative min-w-[120px]", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-fg ring-offset-brand-bg focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          isOpen && "border-brand-accent/30 ring-2 ring-brand-accent/30",
        )}
      >
        <span className="capitalize">{selectedOption}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-brand-fg-muted transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1.5 w-full min-w-[120px] overflow-hidden rounded-xl border border-brand-border bg-brand-bg p-1 shadow-2xl"
          >
            <div className="flex flex-col gap-0.5">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

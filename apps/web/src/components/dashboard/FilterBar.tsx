"use client";

import { Filter, X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Dropdown } from "../ui/dropdown";

interface FilterBarProps {
  searchText: string;
  onSearchChange: (v: string) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  allTags: string[];
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function FilterBar({
  selectedTags,
  onToggleTag,
  allTags,
  totalCount,
  filteredCount,
  hasActiveFilters,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Dropdown
          trigger={
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                "h-8 rounded-xl border border-brand-border/50 bg-brand-surface/50 px-3 flex items-center gap-2 transition-all hover:bg-brand-surface group",
                hasActiveFilters &&
                  "border-brand-accent/30 bg-brand-accent/5 text-brand-accent font-bold",
              )}
            >
              <Filter
                className={cn(
                  "h-3.5 w-3.5",
                  hasActiveFilters
                    ? "text-brand-accent"
                    : "text-brand-muted group-hover:text-white",
                )}
              />
              <span className="text-[11px] uppercase tracking-wider">Filter</span>
              {selectedTags.length > 0 && (
                <span className="flex items-center justify-center bg-brand-primary text-white text-[9px] w-4 h-4 rounded-full ml-0.5">
                  {selectedTags.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-brand-muted group-hover:text-white" />
            </Button>
          }
          className="w-72 p-4"
        >
          <div className="flex items-center justify-between mb-4 border-b border-brand-border/50 pb-3">
            <h4 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Filter className="h-3 w-3 text-brand-accent" /> Refine View
            </h4>
            <p className="text-[10px] text-brand-muted font-mono">
              {filteredCount}/{totalCount}
            </p>
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-brand-muted tracking-widest">
                Tags
              </span>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => onClearFilters()}
                  className="text-[10px] font-bold text-brand-accent hover:text-brand-accent/80"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar py-1">
              {allTags.length > 0 ? (
                allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all flex items-center gap-1.5",
                      selectedTags.includes(tag)
                        ? "bg-brand-accent/20 border-brand-accent/50 text-brand-accent"
                        : "bg-brand-bg border-brand-border text-brand-muted hover:border-zinc-700 hover:text-white",
                    )}
                  >
                    {selectedTags.includes(tag) && (
                      <Check className="h-3 w-3" />
                    )}
                    #{tag}
                  </button>
                ))
              ) : (
                <p className="text-[11px] text-brand-muted italic py-2 px-1 text-center w-full">
                  No tags available yet.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/50">
            <p className="text-[9px] text-brand-muted italic leading-relaxed text-center">
              Drag & drop is disabled when filters are active.
            </p>
          </div>
        </Dropdown>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-2 h-8 text-[10px] uppercase tracking-widest font-bold text-brand-muted hover:text-red-400 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

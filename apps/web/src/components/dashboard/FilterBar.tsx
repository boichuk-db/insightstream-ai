'use client';

import { Search, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  searchText, onSearchChange,
  selectedTags, onToggleTag,
  allTags,
  totalCount, filteredCount,
  hasActiveFilters, onClearFilters,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 bg-neutral-900/60 border border-neutral-800/50 rounded-2xl p-4">
      {/* Row 1: Search + Sentiment + Clear */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search feedbacks..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
          {searchText && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-mono text-neutral-500">
              {filteredCount}<span className="text-neutral-700">/{totalCount}</span>
            </span>
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600 transition-all"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Tags */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-3 w-3 text-neutral-600 shrink-0" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-md border transition-all",
                selectedTags.includes(tag)
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-400"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <p className="text-[10px] text-neutral-600 italic">
          Drag &amp; drop is disabled while filters are active.
        </p>
      )}
    </div>
  );
}

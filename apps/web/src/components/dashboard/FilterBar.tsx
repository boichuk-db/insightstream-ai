'use client';

import { useState } from 'react';
import { Filter, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

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
  selectedTags, onToggleTag,
  allTags,
  totalCount, filteredCount,
  hasActiveFilters, onClearFilters,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-8 rounded-xl border border-brand-border/50 bg-brand-surface/50 px-3 flex items-center gap-2 transition-all hover:bg-brand-surface group",
            hasActiveFilters && "border-indigo-500/30 bg-indigo-500/5 text-indigo-400 font-bold"
          )}
        >
          <Filter className={cn("h-3.5 w-3.5", hasActiveFilters ? "text-indigo-400" : "text-brand-muted group-hover:text-white")} />
          <span className="text-[11px] uppercase tracking-wider">Filter</span>
          {selectedTags.length > 0 && (
            <span className="flex items-center justify-center bg-indigo-500 text-white text-[9px] w-4 h-4 rounded-full ml-0.5">
              {selectedTags.length}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 transition-transform text-brand-muted group-hover:text-white", isOpen && "rotate-180")} />
        </Button>

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

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 mt-2 w-72 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-50 p-4"
            >
              <div className="flex items-center justify-between mb-4 border-b border-brand-border/50 pb-3">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                   <Filter className="h-3 w-3 text-indigo-400" /> Refine View
                </h4>
                <p className="text-[10px] text-brand-muted font-mono">
                  {filteredCount}/{totalCount}
                </p>
              </div>

              {/* Tags Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-brand-muted tracking-widest">Tags</span>
                  {selectedTags.length > 0 && (
                    <button onClick={() => onClearFilters()} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300">Reset</button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar py-1">
                  {allTags.length > 0 ? (
                    allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => onToggleTag(tag)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all flex items-center gap-1.5",
                          selectedTags.includes(tag)
                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400"
                            : "bg-brand-bg border-brand-border text-brand-muted hover:border-zinc-700 hover:text-white"
                        )}
                      >
                        {selectedTags.includes(tag) && <Check className="h-3 w-3" />}
                        #{tag}
                      </button>
                    ))
                  ) : (
                    <p className="text-[11px] text-brand-muted italic py-2 px-1 text-center w-full">No tags available yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-border/50">
                <p className="text-[9px] text-brand-muted italic leading-relaxed text-center">
                  Drag & drop is disabled when filters are active.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

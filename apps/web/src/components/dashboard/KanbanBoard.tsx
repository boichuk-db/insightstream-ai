import { useState, useCallback, useEffect, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { FilterBar } from './FilterBar';
import { api } from '@/lib/api';
import { exportToCSV, exportToPDF } from '@/lib/exportFeedbacks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, Printer, ChevronDown, Archive, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanBoardProps {
  initialFeedbacks: any[];
  projectId: string;
}

const COLUMNS = [
  { id: 'New', title: 'New', color: 'bg-indigo-500' },
  { id: 'In Review', title: 'In Review', color: 'bg-amber-500' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'Done', title: 'Done', color: 'bg-emerald-500' },
  { id: 'Rejected', title: 'Rejected', color: 'bg-red-500' },
];

function applyFilters(
  feedbacks: any[],
  searchText: string,
  selectedCategories: string[],
  sortBySentiment: boolean,
  selectedTags: string[],
): any[] {
  let result = [...feedbacks];

  if (searchText.trim()) {
    const q = searchText.toLowerCase();
    result = result.filter(fb =>
      fb.content?.toLowerCase().includes(q) ||
      fb.aiSummary?.toLowerCase().includes(q)
    );
  }

  if (selectedCategories.length > 0) {
    result = result.filter(fb => {
      const cat = fb.category || 'Other';
      return selectedCategories.includes(cat);
    });
  }

  if (selectedTags.length > 0) {
    result = result.filter(fb =>
      fb.tags?.some((t: string) => selectedTags.includes(t))
    );
  }

  if (sortBySentiment) {
    result.sort((a, b) => (a.sentimentScore ?? 0.5) - (b.sentimentScore ?? 0.5));
  }

  return result;
}

export function KanbanBoard({ initialFeedbacks, projectId }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Local state for optimistic UI during drag & drop
  const [columns, setColumns] = useState<Record<string, any[]>>({});

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Sync prop changes to local state
  useEffect(() => {
    const newCols: Record<string, any[]> = {
      'New': [],
      'In Review': [],
      'In Progress': [],
      'Done': [],
      'Rejected': []
    };

    initialFeedbacks.forEach(fb => {
      const status = fb.status && COLUMNS.some(c => c.id === fb.status) ? fb.status : 'New';
      newCols[status].push(fb);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns(newCols);
  }, [initialFeedbacks]);

  // Derived: all unique tags across all feedbacks
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    initialFeedbacks.forEach(fb => fb.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [initialFeedbacks]);

  const hasActiveFilters = searchText.trim() !== '' || selectedTags.length > 0;

  // Filtered columns (for display) — only computed when filters are active
  const displayColumns = useMemo(() => {
    if (!hasActiveFilters) return columns;
    const filtered: Record<string, any[]> = {};
    for (const colId of Object.keys(columns)) {
      filtered[colId] = applyFilters(columns[colId], searchText, [], false, selectedTags);
    }
    return filtered;
  }, [columns, searchText, selectedTags, hasActiveFilters]);

  const totalCount = initialFeedbacks.length;
  const filteredCount = useMemo(() =>
    Object.values(displayColumns).reduce((sum, arr) => sum + arr.length, 0),
    [displayColumns]
  );

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setSelectedTags([]);
  }, []);

  // Export state
  const [exportScope, setExportScope] = useState<'all' | string>('all');

  const getExportFeedbacks = useCallback(() => {
    if (exportScope === 'all') return Object.values(displayColumns).flat();
    return displayColumns[exportScope] || [];
  }, [exportScope, displayColumns]);

  const getExportTitle = useCallback(() => {
    const col = exportScope === 'all' ? 'All Feedbacks' : `${exportScope} — Feedbacks`;
    return hasActiveFilters ? `${col} (filtered)` : col;
  }, [exportScope, hasActiveFilters]);

  const handleExportCSV = useCallback(() => {
    const feedbacks = getExportFeedbacks();
    const filename = `feedbacks-${exportScope === 'all' ? 'all' : exportScope.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}`;
    exportToCSV(feedbacks, filename);
  }, [getExportFeedbacks, exportScope]);

  const handleExportPDF = useCallback(() => {
    exportToPDF(getExportFeedbacks(), getExportTitle());
  }, [getExportFeedbacks, getExportTitle]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.patch(`/feedback/${id}/status`, { status });
    },
    onError: (err: any) => {
      console.error('Update Form Error:', err?.response?.data || err.message);
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      alert(`Failed to update feedback status: ${err?.response?.data?.message || err.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/feedback/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: () => {
      alert('Failed to delete feedback');
    }
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/feedback/${id}/reanalyze`);
    },
    onSuccess: () => {
      // Socket will trigger invalidation, but manual invalidate is safer for feedback from user
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: (err: any) => {
      alert(`Re-analysis failed: ${err?.response?.data?.message || err.message}`);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/feedback/bulk-archive', { projectId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: (err: any) => {
      alert(`Archiving failed: ${err?.response?.data?.message || err.message}`);
    }
  });

  const handleStatusChange = useCallback((id: string, newStatus: string) => {
    const sourceColumnId = Object.keys(columns).find(colId =>
      columns[colId].some((fb: any) => fb.id === id)
    );
    if (!sourceColumnId || sourceColumnId === newStatus) return;

    const sourceColumn = [...(columns[sourceColumnId] || [])];
    const destColumn = [...(columns[newStatus] || [])];
    const itemIndex = sourceColumn.findIndex((fb: any) => fb.id === id);
    const [movedItem] = sourceColumn.splice(itemIndex, 1);
    movedItem.status = newStatus;
    destColumn.unshift(movedItem);

    setColumns({ ...columns, [sourceColumnId]: sourceColumn, [newStatus]: destColumn });
    updateStatusMutation.mutate({ id, status: newStatus });
  }, [columns, updateStatusMutation]);

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = [...(columns[source.droppableId] || [])];
    const destColumn = [...(columns[destination.droppableId] || [])];
    const [movedItem] = sourceColumn.splice(source.index, 1);

    movedItem.status = destination.droppableId;

    if (source.droppableId === destination.droppableId) {
      sourceColumn.splice(destination.index, 0, movedItem);
      setColumns({ ...columns, [source.droppableId]: sourceColumn });
    } else {
      destColumn.splice(destination.index, 0, movedItem);
      setColumns({
        ...columns,
        [source.droppableId]: sourceColumn,
        [destination.droppableId]: destColumn,
      });

      updateStatusMutation.mutate({ id: draggableId, status: destination.droppableId });
    }
  }, [columns, updateStatusMutation]);

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center text-brand-muted">
        Loading Board...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Board Header / Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded-2xl shadow-lg relative group z-30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex items-center gap-4 flex-wrap relative z-20">
          <FilterBar
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            allTags={allTags}
            totalCount={totalCount}
            filteredCount={filteredCount}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />

          <div className="h-4 w-px bg-brand-border/50 hidden md:block" />

          <ExportMenu 
            scope={exportScope} 
            onScopeChange={setExportScope} 
            onExportCSV={handleExportCSV} 
            onExportPDF={handleExportPDF}
            columns={COLUMNS} 
            displayColumns={displayColumns} 
            totalCount={totalCount} 
          />
        </div>

        <div className="relative z-20 flex items-center gap-3">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('Archive all "Done" and "Rejected" cards?')) {
                archiveMutation.mutate();
              }
            }}
            isLoading={archiveMutation.isPending}
            disabled={displayColumns['Done']?.length === 0 && displayColumns['Rejected']?.length === 0}
            className="w-full md:w-auto px-4"
          >
            <Archive className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Clean Board</span>
            <span className="sm:hidden">Archive Done</span>
          </Button>
        </div>
      </div>

      <div className="flex w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-0 px-4 sm:px-0 gap-4 overflow-x-auto lg:overflow-x-hidden pb-6 scrollbar-hide">
        <DragDropContext onDragEnd={handleDragEnd}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              colorClass={col.color}
              feedbacks={displayColumns[col.id] || []}
              onDeleteFeedback={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
              onStatusChange={handleStatusChange}
              onReanalyzeFeedback={(id) => reanalyzeMutation.mutate(id)}
              isReanalyzing={reanalyzeMutation.isPending}
              isDragDisabled={hasActiveFilters}
            />
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

function ExportMenu({ scope, onScopeChange, onExportCSV, onExportPDF, columns, displayColumns, totalCount }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTitle = scope === 'all' 
    ? `All columns (${totalCount})` 
    : `${scope} (${displayColumns[scope]?.length ?? 0})`;

  return (
    <div className="relative">
      <Button
        variant="brand"
        size="xs"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "bg-brand-surface/50 transition-all px-3",
          isOpen && "border-indigo-500/30 bg-indigo-500/5 text-brand"
        )}
      >
        <FileDown className="h-3.5 w-3.5 text-indigo-400 group-hover/btn:text-white" />
        <span className="mx-1">Export</span>
        <div className="h-3 w-px bg-brand-border/50 mx-1" />
        <span className="truncate max-w-[100px] lowercase first-letter:uppercase">{activeTitle}</span>
        <ChevronDown className={cn("ml-2 h-3 w-3 text-indigo-400 transition-all", isOpen && "rotate-180")} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              className="absolute top-full left-0 mt-2 w-64 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden p-3"
            >
              <div className="space-y-4">
                {/* Scope Selection */}
                <div>
                  <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-2 px-1">Select Scope</h4>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      onClick={() => onScopeChange('all')}
                      className={cn(
                        "text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between",
                        scope === 'all' ? "bg-indigo-500/15 text-indigo-400 font-bold" : "text-brand-muted hover:bg-brand-bg hover:text-white"
                      )}
                    >
                      All columns ({totalCount})
                      {scope === 'all' && <Check className="h-3 w-3" />}
                    </button>
                    {columns.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => onScopeChange(c.id)}
                        className={cn(
                          "text-left px-3 py-2 rounded-xl text-[11px] transition-all flex items-center justify-between",
                          scope === c.id ? "bg-indigo-500/15 text-indigo-400 font-bold" : "text-brand-muted hover:bg-brand-bg hover:text-white"
                        )}
                      >
                        {c.title} ({displayColumns[c.id]?.length ?? 0})
                        {scope === c.id && <Check className="h-3 w-3 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-brand-border/50" />

                {/* Export Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => { onExportCSV(); setIsOpen(false); }}
                    className="hover:text-emerald-400 hover:border-emerald-500/40"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => { onExportPDF(); setIsOpen(false); }}
                    className="hover:text-indigo-400 hover:border-indigo-500/40"
                  >
                    <Printer className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                    PDF
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

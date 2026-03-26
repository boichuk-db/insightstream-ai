import { useState, useCallback, useEffect, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { FilterBar } from './FilterBar';
import { api } from '@/lib/api';
import { exportToCSV, exportToPDF } from '@/lib/exportFeedbacks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, Printer, ChevronDown, Archive } from 'lucide-react';
import { Button } from '../ui/button';

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
      <div className="h-64 flex items-center justify-center text-neutral-500">
        Loading Board...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
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

      {/* Export bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">Export</span>

        <div className="relative">
          <select
            value={exportScope}
            onChange={e => setExportScope(e.target.value)}
            className="h-7 pl-2 pr-6 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 appearance-none focus:outline-none focus:border-neutral-700 cursor-pointer"
          >
            <option value="all">All columns ({totalCount})</option>
            {COLUMNS.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({displayColumns[c.id]?.length ?? 0})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500" />
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-neutral-800 bg-neutral-950 text-[10px] font-semibold text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
        >
          <FileDown className="h-3 w-3" />
          CSV
        </button>

        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-neutral-800 bg-neutral-950 text-[10px] font-semibold text-neutral-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-colors"
        >
          <Printer className="h-3 w-3" />
          PDF
        </button>

        <div className="h-4 w-px bg-neutral-800 mx-1" />

        <button
          onClick={() => {
            if (confirm('Archive all "Done" and "Rejected" cards?')) {
              archiveMutation.mutate();
            }
          }}
          disabled={archiveMutation.isPending || (displayColumns['Done']?.length === 0 && displayColumns['Rejected']?.length === 0)}
          className="flex items-center gap-1.5 h-7 px-3 rounded-lg border border-neutral-800 bg-neutral-950 text-[10px] font-semibold text-neutral-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors disabled:opacity-30 disabled:hover:text-neutral-400 disabled:hover:border-neutral-800"
        >
          <Archive className="h-3 w-3" />
          Clean Board (Archive)
        </button>
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

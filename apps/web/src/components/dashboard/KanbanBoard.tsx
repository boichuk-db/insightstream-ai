import { useState, useCallback, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { api } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface KanbanBoardProps {
  initialFeedbacks: any[];
}

const COLUMNS = [
  { id: 'New', title: 'New', color: 'bg-indigo-500' },
  { id: 'In Review', title: 'In Review', color: 'bg-amber-500' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'Done', title: 'Done', color: 'bg-emerald-500' },
  { id: 'Rejected', title: 'Rejected', color: 'bg-red-500' },
];

export function KanbanBoard({ initialFeedbacks }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  
  // Local state for optimistic UI during drag & drop
  const [columns, setColumns] = useState<Record<string, any[]>>({});

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.patch(`/feedback/${id}/status`, { status });
    },
    onError: (err: any) => {
      // Revert to server state on error
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

  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    
    // Unchanged
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = [...(columns[source.droppableId] || [])];
    const destColumn = [...(columns[destination.droppableId] || [])];
    const [movedItem] = sourceColumn.splice(source.index, 1);

    // Optimistically update status
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
      
      // Fire backend update
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
    <div className="flex min-h-[500px] w-full gap-5 overflow-x-auto pb-6 scrollbar-hide">
      <DragDropContext onDragEnd={handleDragEnd}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            colorClass={col.color}
            feedbacks={columns[col.id] || []}
            onDeleteFeedback={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </DragDropContext>
    </div>
  );
}

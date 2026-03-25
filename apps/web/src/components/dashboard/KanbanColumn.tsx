import { Droppable } from '@hello-pangea/dnd';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  feedbacks: any[];
  onDeleteFeedback: (id: string) => void;
  isDeleting: boolean;
  colorClass: string;
  onStatusChange: (id: string, status: string) => void;
}

export function KanbanColumn({ id, title, feedbacks, onDeleteFeedback, isDeleting, colorClass, onStatusChange }: KanbanColumnProps) {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] sm:min-w-[300px] lg:min-w-0 h-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl group/column">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.04]">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", colorClass, "shadow-[0_0_10px_rgba(255,255,255,0.1)]")} />
          {title}
        </h3>
        <span className="text-[10px] font-mono font-bold text-neutral-400 px-2 py-0.5 bg-neutral-800 rounded-md border border-neutral-700">
          {feedbacks.length}
        </span>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] transition-colors scrollbar-hide",
              snapshot.isDraggingOver ? "bg-white/[0.02]" : ""
            )}
          >
            {feedbacks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-neutral-600 border-2 border-dashed border-neutral-800/60 rounded-xl m-2 bg-neutral-900/20">
                <Search className="h-6 w-6 mb-2 opacity-30" />
                <span className="text-xs font-medium opacity-50">Empty</span>
              </div>
            )}
            
            {feedbacks.map((fb, index) => (
              <KanbanCard
                key={fb.id}
                feedback={fb}
                index={index}
                onDelete={onDeleteFeedback}
                isDeleting={isDeleting}
                onStatusChange={onStatusChange}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

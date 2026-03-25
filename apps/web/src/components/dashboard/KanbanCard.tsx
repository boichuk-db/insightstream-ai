import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Sparkles, Trash2, CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = [
  { id: 'New', color: 'bg-indigo-500' },
  { id: 'In Review', color: 'bg-amber-500' },
  { id: 'In Progress', color: 'bg-blue-500' },
  { id: 'Done', color: 'bg-emerald-500' },
  { id: 'Rejected', color: 'bg-red-500' },
];

interface KanbanCardProps {
  feedback: any;
  index: number;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onStatusChange: (id: string, status: string) => void;
}

export function KanbanCard({ feedback, index, onDelete, isDeleting, onStatusChange }: KanbanCardProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <Draggable draggableId={feedback.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setShowPicker(v => !v)}
          className={cn(
            "w-full overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col group relative select-none transition-colors duration-200",
            snapshot.isDragging
              ? "border-indigo-500 shadow-2xl z-50 ring-2 ring-indigo-500/50 opacity-100"
              : "hover:border-neutral-700 hover:bg-neutral-800/50",
            showPicker && "border-neutral-700 bg-neutral-800/50"
          )}
          style={{
            ...provided.draggableProps.style,
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
          }}
        >
          {/* Header Row */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                {feedback.source || 'Direct'}
              </span>
              {feedback.category && (
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                  feedback.category === 'Bug' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  feedback.category === 'Feature' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  feedback.category === 'UI/UX' ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                  "bg-neutral-800 text-neutral-300 border-neutral-700"
                )}>
                  {feedback.category}
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this feedback?')) onDelete(feedback.id);
              }}
              disabled={isDeleting}
              className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <p className="text-neutral-200 text-sm leading-relaxed mb-3 line-clamp-4 break-words">
            {feedback.content}
          </p>

          {feedback.aiSummary && (
            <div className="mb-3 p-2 bg-neutral-950/50 rounded border border-neutral-800/50">
              <p className="text-[11px] text-neutral-400 italic leading-snug line-clamp-2 break-words">
                <Sparkles className="h-3 w-3 inline mr-1 text-indigo-400" />
                {feedback.aiSummary}
              </p>
            </div>
          )}

          {feedback.tags && feedback.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {feedback.tags.map((tag: string) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-neutral-950 text-neutral-500 rounded-md border border-neutral-800">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-neutral-800/50 flex items-center justify-between">
            {feedback.sentimentScore !== null && feedback.sentimentScore !== undefined ? (
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      feedback.sentimentScore > 0.6 ? "bg-emerald-500" : feedback.sentimentScore < 0.4 ? "bg-red-500" : "bg-amber-500"
                    )}
                    style={{ width: `${feedback.sentimentScore * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 font-medium font-mono">
                  {Math.round(feedback.sentimentScore * 100)}%
                </span>
              </div>
            ) : <div />}

            <div className="flex items-center text-[10px] text-neutral-500 font-mono gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Status picker */}
          {showPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-3 border-t border-neutral-700 flex flex-col gap-1"
            >
              <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Move to</p>
              <div className="grid grid-cols-1 gap-1">
                {STATUSES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id !== feedback.status) onStatusChange(feedback.id, s.id);
                      setShowPicker(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left",
                      s.id === feedback.status
                        ? "bg-neutral-700 text-white cursor-default"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", s.color)} />
                    {s.id}
                    {s.id === feedback.status && (
                      <span className="ml-auto text-[9px] text-neutral-500">current</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tap hint for mobile — visible only when picker is closed */}
          {!showPicker && (
            <div className="absolute bottom-3 right-3 flex items-center gap-0.5 text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <ChevronDown className="h-3 w-3" />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

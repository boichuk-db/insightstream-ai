import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  Sparkles,
  Trash2,
  CalendarDays,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getCategoryColor } from "@/lib/colors";

const STATUSES = [
  { id: "In Review", color: "bg-amber-500" },
  { id: "In Progress", color: "bg-blue-500" },
  { id: "Done", color: "bg-emerald-500" },
  { id: "Rejected", color: "bg-red-500" },
];

interface KanbanCardProps {
  feedback: any;
  index: number;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onStatusChange: (id: string, status: string) => void;
  onReanalyze: (id: string) => void;
  isReanalyzing: boolean;
  isDragDisabled?: boolean;
  onOpenComments?: (feedbackId: string) => void;
  commentCount?: number;
}

export function KanbanCard({
  feedback,
  index,
  onDelete,
  isDeleting,
  onStatusChange,
  isDragDisabled,
  onOpenComments,
  commentCount,
  onReanalyze,
  isReanalyzing,
}: KanbanCardProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <Draggable
      draggableId={feedback.id}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => (
        <div
          data-testid="kanban-card"
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            "w-full overflow-hidden bg-brand-surface border border-brand-border/50 rounded-2xl p-4 flex flex-col group relative select-none transition-colors duration-200",
            snapshot.isDragging
              ? "border-indigo-500 shadow-2xl z-50 ring-2 ring-indigo-500/50 opacity-100"
              : "hover:border-zinc-700 hover:bg-brand-border/50",
            showPicker && "border-zinc-700 bg-brand-border/50",
          )}
          style={{
            ...provided.draggableProps.style,
            cursor: snapshot.isDragging ? "grabbing" : "grab",
          }}
        >
          {/* Header Row */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                {feedback.source || "Direct"}
              </span>
              {feedback.category && (
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border",
                    getCategoryColor(feedback.category).bg,
                    getCategoryColor(feedback.category).text,
                    getCategoryColor(feedback.category).border,
                  )}
                >
                  {feedback.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReanalyze(feedback.id);
                }}
                disabled={isReanalyzing}
                title="Re-run AI Analysis"
                className={cn(
                  "p-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500/40 transition-all",
                  isReanalyzing &&
                    "animate-pulse cursor-not-allowed opacity-70",
                )}
              >
                <Sparkles
                  className={cn("h-3.5 w-3.5", isReanalyzing && "animate-spin")}
                />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this feedback?")) onDelete(feedback.id);
                }}
                disabled={isDeleting}
                className="text-brand-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-zinc-200 text-sm leading-relaxed mb-3 line-clamp-4 wrap-break-word">
            {feedback.content}
          </p>

          {!feedback.aiSummary && !isReanalyzing && (
            <div className="mb-3 p-3 bg-indigo-500/5 border border-dashed border-indigo-500/20 rounded-xl flex items-center justify-between group/re">
              <span className="text-[11px] text-brand-muted">
                Not analyzed yet
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReanalyze(feedback.id);
                }}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Sparkles size={12} /> Analyze
              </button>
            </div>
          )}

          {feedback.aiSummary && (
            <div className="mb-3 p-2 bg-brand-bg/50 rounded border border-brand-border/50">
              <p className="text-[11px] text-zinc-400 italic leading-snug line-clamp-2 wrap-break-word">
                <Sparkles className="h-3 w-3 inline mr-1 text-indigo-400" />
                {feedback.aiSummary}
              </p>
            </div>
          )}

          {feedback.tags && feedback.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {feedback.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-brand-bg text-brand-muted rounded-md border border-brand-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-brand-border/50 flex items-center justify-between">
            {feedback.sentimentScore !== null &&
            feedback.sentimentScore !== undefined ? (
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      feedback.sentimentScore > 0.6
                        ? "bg-emerald-500"
                        : feedback.sentimentScore < 0.4
                          ? "bg-red-500"
                          : "bg-amber-500",
                    )}
                    style={{ width: `${feedback.sentimentScore * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-brand-muted font-medium font-mono">
                  {Math.round(feedback.sentimentScore * 100)}%
                </span>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments?.(feedback.id);
                }}
                className="flex items-center gap-1 text-[10px] text-brand-muted hover:text-indigo-400 transition-colors"
              >
                <MessageCircle className="h-3 w-3" />
                {commentCount || 0}
              </button>
              <div className="flex items-center text-[10px] text-brand-muted font-mono gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDistanceToNow(new Date(feedback.createdAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>

          {/* Status picker */}
          {showPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-3 border-t border-zinc-700 flex flex-col gap-1"
            >
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                Move to
              </p>
              <div className="grid grid-cols-1 gap-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id !== feedback.status)
                        onStatusChange(feedback.id, s.id);
                      setShowPicker(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left",
                      s.id === feedback.status
                        ? "bg-zinc-700 text-white cursor-default"
                        : "text-zinc-400 hover:bg-brand-border hover:text-white",
                    )}
                  >
                    <span
                      className={cn("w-2 h-2 rounded-full shrink-0", s.color)}
                    />
                    {s.id}
                    {s.id === feedback.status && (
                      <span className="ml-auto text-[9px] text-brand-muted">
                        current
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tap hint for mobile — visible only when picker is closed */}
          {!showPicker && (
            <div className="absolute bottom-3 right-3 flex items-center gap-0.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <ChevronDown className="h-3 w-3" />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Sparkles, Trash2, CalendarDays, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { StatusSelect } from "@/components/ui/status-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Draggable
      draggableId={feedback.id}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(provided, snapshot) => (
        <>
          <div
            data-testid="kanban-card"
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "w-full overflow-hidden bg-brand-surface border border-brand-border/50 rounded-2xl p-4 flex flex-col group relative select-none transition-colors duration-200",
              snapshot.isDragging
                ? "border-brand-accent shadow-2xl z-50 ring-2 ring-brand-accent/30 opacity-100"
                : "hover:border-brand-border hover:bg-brand-border/50",
            )}
            style={{
              ...provided.draggableProps.style,
              cursor: snapshot.isDragging ? "grabbing" : "grab",
            }}
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Eyebrow className="rounded border border-brand-accent/20 bg-brand-accent/10 px-2 py-0.5 tracking-wider text-brand-accent">
                  {feedback.source || "Direct"}
                </Eyebrow>
                {feedback.category && (
                  <Badge variant="category" value={feedback.category} size="sm" />
                )}
                <StatusSelect
                  value={feedback.status}
                  onChange={(status) => onStatusChange(feedback.id, status)}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReanalyze(feedback.id);
                  }}
                  isLoading={isReanalyzing}
                  title="Re-run AI Analysis"
                  className="border-brand-accent/20 bg-brand-accent/5 text-brand-accent hover:bg-brand-accent/15 hover:border-brand-accent/40"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteOpen(true);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-brand-fg text-sm leading-relaxed mb-3 line-clamp-4 wrap-break-word">
              {feedback.content}
            </p>

            {!feedback.aiSummary && !isReanalyzing && (
              <div className="mb-3 p-3 bg-brand-accent/5 border border-dashed border-brand-accent/20 rounded-xl flex items-center justify-between group/re">
                <span className="text-[11px] text-brand-fg-muted">
                  Not analyzed yet
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReanalyze(feedback.id);
                  }}
                  className="text-[10px] font-bold text-brand-accent hover:text-brand-accent/70 flex items-center gap-1"
                >
                  <Sparkles size={12} /> Analyze
                </button>
              </div>
            )}

            {feedback.aiSummary && (
              <div className="mb-3 p-2 bg-brand-bg/50 rounded border border-brand-border/50">
                <p className="text-[11px] text-brand-fg-muted italic leading-snug line-clamp-2 wrap-break-word">
                  <Sparkles className="h-3 w-3 inline mr-1 text-brand-accent" />
                  {feedback.aiSummary}
                </p>
              </div>
            )}

            {feedback.tags && feedback.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {feedback.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 bg-brand-bg text-brand-fg-muted rounded-md border border-brand-border"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-brand-border/50 flex items-center justify-between">
              <SentimentBar score={feedback.sentimentScore} />

              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments?.(feedback.id);
                  }}
                  className="flex items-center gap-1 text-[10px] text-brand-fg-muted hover:text-brand-accent transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  {commentCount || 0}
                </button>
                <div className="flex items-center text-[10px] text-brand-fg-muted font-mono gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDistanceToNow(new Date(feedback.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
          </div>

          <ConfirmDialog
            isOpen={confirmDeleteOpen}
            title="Delete feedback?"
            message="This will permanently delete this feedback. This action cannot be undone."
            confirmLabel="Delete"
            danger
            isConfirming={isDeleting}
            onConfirm={() => onDelete(feedback.id)}
            onCancel={() => setConfirmDeleteOpen(false)}
          />
        </>
      )}
    </Draggable>
  );
}

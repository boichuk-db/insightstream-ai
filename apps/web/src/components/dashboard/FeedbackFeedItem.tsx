// apps/web/src/components/dashboard/FeedbackFeedItem.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trash2,
  RotateCcw,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Send,
} from "lucide-react";
import { formatDistanceToNow, format, isThisYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { useComments } from "@/hooks/useComments";
import type { IFeedback } from "@insightstream/shared-types";

const STATUSES = [
  { id: "New", color: "text-brand-accent" },
  { id: "In Review", color: "text-amber-400" },
  { id: "In Progress", color: "text-blue-400" },
  { id: "Done", color: "text-emerald-400" },
  { id: "Rejected", color: "text-red-400" },
];

const PREVIEW_COMMENT_COUNT = 3;

interface FeedbackFeedItemProps {
  feedback: IFeedback;
  isNew: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onReanalyze: (id: string) => void;
  isDeleting: boolean;
  isReanalyzing: boolean;
  currentUserId?: string;
}

export function FeedbackFeedItem({
  feedback,
  isNew,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onDelete,
  onReanalyze,
  isDeleting,
  isReanalyzing,
  currentUserId,
}: FeedbackFeedItemProps) {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const {
    comments,
    isLoading: commentsLoading,
    draft,
    setDraft,
    submit,
    isSubmitting,
    deleteComment,
  } = useComments(isExpanded ? feedback.id : null);

  const visibleComments = showAllComments
    ? comments
    : comments.slice(0, PREVIEW_COMMENT_COUNT);
  const hiddenCount = comments.length - PREVIEW_COMMENT_COUNT;

  return (
    <div
      className={cn(
        "border-l-2 border-b border-brand-border transition-colors",
        isNew ? "border-l-brand-accent" : "border-l-transparent",
        isExpanded ? "bg-brand-surface" : "hover:bg-brand-surface-hover",
      )}
    >
      {/* Collapsed row — always visible */}
      <div
        className="flex items-start gap-3 px-5 py-3.5 cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* New dot */}
        <div className="mt-1.5 flex-shrink-0">
          {isNew ? (
            <div className="w-2 h-2 rounded-full bg-brand-accent" />
          ) : (
            <div className="w-2 h-2 rounded-full border border-brand-muted/40" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {feedback.source && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-surface-hover border border-brand-border text-brand-muted">
                {feedback.source}
              </span>
            )}
            {feedback.category && (
              <Badge variant="category" value={feedback.category} size="sm" />
            )}
            {feedback.sentimentScore !== undefined && (
              <SentimentBar
                score={feedback.sentimentScore}
                className="ml-0.5"
              />
            )}
            <span
              className="ml-auto text-[11px] text-brand-muted shrink-0"
              title={formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
            >
              {isThisYear(new Date(feedback.createdAt))
                ? format(new Date(feedback.createdAt), "MMM d, HH:mm")
                : format(new Date(feedback.createdAt), "MMM d yyyy")}
            </span>
          </div>

          <p
            className={cn(
              "text-sm text-brand-fg leading-relaxed",
              !isExpanded && "line-clamp-2",
            )}
          >
            {feedback.content}
          </p>

          {!isExpanded && feedback.category && (
            <p className="mt-1.5 text-[11px] text-brand-accent flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
              {feedback.category}
              {feedback.aiSummary && " · AI analyzed"}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 mt-0.5 text-brand-muted">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div className="px-5 pb-4 space-y-4 border-t border-brand-border">
              {/* AI Summary */}
              {feedback.aiSummary && (
                <div className="mt-4 flex gap-2.5 p-3 rounded-xl bg-brand-accent/5 border border-brand-accent/15">
                  <Sparkles className="w-3.5 h-3.5 text-brand-accent mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-brand-fg/80 leading-relaxed">
                    {feedback.aiSummary}
                  </p>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status picker */}
                <div className="relative">
                  <button
                    onClick={() => setShowStatusPicker((s) => !s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface-hover text-xs text-brand-fg hover:border-brand-muted transition-colors"
                  >
                    <Badge
                      variant="status"
                      value={feedback.status}
                      size="sm"
                    />
                    <ChevronDown className="w-3 h-3 text-brand-muted" />
                  </button>
                  {showStatusPicker && (
                    <div className="absolute top-full left-0 mt-1 z-10 bg-brand-surface border border-brand-border rounded-xl shadow-lg py-1 min-w-[130px]">
                      {STATUSES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onStatusChange(feedback.id, s.id);
                            setShowStatusPicker(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-xs hover:bg-brand-surface-hover transition-colors",
                            s.color,
                          )}
                        >
                          {s.id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onReanalyze(feedback.id)}
                  disabled={isReanalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface-hover text-xs text-brand-muted hover:text-brand-fg hover:border-brand-muted transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-analyze
                </button>

                <button
                  onClick={() => onDelete(feedback.id)}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-brand-muted">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>
                    {commentsLoading
                      ? "Loading comments..."
                      : `${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
                  </span>
                </div>

                {visibleComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="group flex gap-2.5 p-2.5 rounded-lg bg-brand-bg border border-brand-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-fg leading-relaxed">
                        {comment.content}
                      </p>
                      <p className="text-[10px] text-brand-muted mt-1">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {comment.user?.id === currentUserId && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 text-brand-muted hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {hiddenCount > 0 && !showAllComments && (
                  <button
                    onClick={() => setShowAllComments(true)}
                    className="text-xs text-brand-accent hover:underline"
                  >
                    View all {comments.length} comments →
                  </button>
                )}

                {/* Comment input */}
                <div className="flex gap-2 mt-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 text-xs bg-brand-bg border border-brand-border rounded-lg text-brand-fg placeholder:text-brand-muted focus:outline-none focus:border-brand-accent transition-colors"
                  />
                  <button
                    onClick={submit}
                    disabled={!draft.trim() || isSubmitting}
                    className="p-2 rounded-lg bg-brand-accent/10 border border-brand-accent/25 text-brand-accent hover:bg-brand-accent/20 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

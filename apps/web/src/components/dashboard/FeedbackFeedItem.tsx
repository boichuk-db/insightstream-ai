// apps/web/src/components/dashboard/FeedbackFeedItem.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, format, isThisYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/ui/status-select";
import { CommentThread } from "@/components/ui/comment-thread";
import type { IFeedback, FeedbackStatus } from "@insightstream/shared-types";

interface FeedbackFeedItemProps {
  feedback: IFeedback;
  isNew: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
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
          {/* Feedback content is the primary thing on this row — it comes first. */}
          <p
            className={cn(
              "text-sm text-brand-fg leading-relaxed",
              !isExpanded && "line-clamp-2",
            )}
          >
            {feedback.content}
          </p>

          {/* Meta line — secondary info, below the content it describes. */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {feedback.source && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-brand-surface-hover border border-brand-border text-brand-fg-muted">
                {feedback.source}
              </span>
            )}
            {feedback.category && (
              <Badge variant="category" value={feedback.category} size="sm" />
            )}
            <SentimentBar score={feedback.sentimentScore} className="ml-0.5" />
            {!isExpanded && feedback.aiSummary && (
              <span className="text-xs text-brand-accent flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI analyzed
              </span>
            )}
            <span
              className="ml-auto text-xs text-brand-fg-muted shrink-0"
              title={formatDistanceToNow(new Date(feedback.createdAt), {
                addSuffix: true,
              })}
            >
              {isThisYear(new Date(feedback.createdAt))
                ? format(new Date(feedback.createdAt), "MMM d, HH:mm")
                : format(new Date(feedback.createdAt), "MMM d yyyy")}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 mt-0.5 text-brand-fg-muted">
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
                <StatusSelect
                  value={feedback.status}
                  onChange={(status) => onStatusChange(feedback.id, status)}
                  size="sm"
                />

                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => onReanalyze(feedback.id)}
                  isLoading={isReanalyzing}
                >
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Re-analyze
                </Button>

                <Button
                  size="xs"
                  variant="danger"
                  onClick={() => onDelete(feedback.id)}
                  isLoading={isDeleting}
                  className="ml-auto"
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Delete
                </Button>
              </div>

              {/* Comments */}
              <CommentThread
                feedbackId={feedback.id}
                currentUserId={currentUserId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

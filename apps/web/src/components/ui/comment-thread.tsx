"use client";

import { useComments } from "@/hooks/useComments";
import { Button } from "./button";
import { Input } from "./input";
import { Trash2 } from "lucide-react";

interface CommentThreadProps {
  feedbackId: string;
  currentUserId?: string;
}

export function CommentThread({ feedbackId, currentUserId }: CommentThreadProps) {
  const {
    comments,
    isLoading,
    draft,
    setDraft,
    submit,
    isSubmitting,
    deleteComment,
    isDeleting,
  } = useComments(feedbackId);

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <p className="text-xs text-brand-fg-muted">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-brand-fg-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="text-brand-fg">{comment.content}</p>
                <p className="text-[11px] text-brand-fg-muted mt-0.5">
                  {comment.user?.name ?? comment.user?.email ?? "Unknown"}
                </p>
              </div>
              {comment.user?.id === currentUserId && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  disabled={isDeleting}
                  className="text-brand-fg-muted hover:text-red-400 transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment..."
          className="flex-1 h-9"
        />
        <Button size="sm" onClick={submit} isLoading={isSubmitting} disabled={!draft.trim()}>
          Post
        </Button>
      </div>
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { CommentThread } from "@/components/ui/comment-thread";

interface CommentsPanelProps {
  feedbackId: string | null;
  onClose: () => void;
  currentUserId?: string;
}

export function CommentsPanel({
  feedbackId,
  onClose,
  currentUserId,
}: CommentsPanelProps) {
  return (
    <Drawer
      isOpen={!!feedbackId}
      onClose={onClose}
      className="max-w-md bg-brand-surface"
    >
      <div className="flex items-center justify-between p-4 border-b border-brand-border">
        <h3 className="text-lg font-bold text-brand-fg">Comments</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-brand-fg-muted hover:text-brand-fg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {feedbackId && (
          <CommentThread feedbackId={feedbackId} currentUserId={currentUserId} />
        )}
      </div>
    </Drawer>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { X, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentsPanelProps {
  feedbackId: string | null;
  onClose: () => void;
  currentUserId?: string;
}

export function CommentsPanel({ feedbackId, onClose, currentUserId }: CommentsPanelProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', feedbackId],
    queryFn: async () => {
      const { data } = await api.get(`/feedbacks/${feedbackId}/comments`);
      return data;
    },
    enabled: !!feedbackId,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/feedbacks/${feedbackId}/comments`, { content });
      return data;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', feedbackId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', feedbackId] });
    },
  });

  return (
    <AnimatePresence>
      {feedbackId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-brand-surface border-l border-brand-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">Comments</h3>
              <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-zinc-800/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : comments?.length === 0 ? (
                <div className="text-center py-12 text-brand-muted">
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs mt-1">Be the first to comment</p>
                </div>
              ) : (
                comments?.map((comment: any) => (
                  <div key={comment.id} className="bg-brand-bg/50 border border-brand-border/50 rounded-xl p-3 group">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-zinc-200">{comment.userEmail}</span>
                        <span className="text-[10px] text-brand-muted ml-2">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {comment.userId === currentUserId && (
                        <button
                          onClick={() => deleteMutation.mutate(comment.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newComment.trim()) addMutation.mutate(newComment);
              }}
              className="p-4 border-t border-zinc-800 flex gap-2"
            >
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 outline-none"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || addMutation.isPending}
                className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

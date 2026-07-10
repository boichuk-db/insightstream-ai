// apps/web/src/hooks/useComments.ts
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

export function useComments(feedbackId: string | null) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", feedbackId],
    queryFn: async () => {
      const { data } = await api.get<Comment[]>(
        `/feedbacks/${feedbackId}/comments`,
      );
      return data;
    },
    enabled: !!feedbackId,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/feedbacks/${feedbackId}/comments`, {
        content,
      });
      return data;
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["comments", feedbackId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", feedbackId] });
    },
  });

  function submit() {
    if (!draft.trim()) return;
    addMutation.mutate(draft.trim());
  }

  return {
    comments,
    isLoading,
    draft,
    setDraft,
    submit,
    isSubmitting: addMutation.isPending,
    deleteComment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

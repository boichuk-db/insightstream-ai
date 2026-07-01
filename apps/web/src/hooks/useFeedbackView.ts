"use client";

import { useState, useCallback } from "react";

export type FeedbackView = "feed" | "kanban";

const STORAGE_KEY = "is-feedback-view";

function getInitial(): FeedbackView {
  if (typeof window === "undefined") return "feed";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "kanban" ? "kanban" : "feed";
}

export function useFeedbackView() {
  const [feedbackView, setViewState] = useState<FeedbackView>(getInitial);

  const setFeedbackView = useCallback((view: FeedbackView) => {
    setViewState(view);
    localStorage.setItem(STORAGE_KEY, view);
  }, []);

  return { feedbackView, setFeedbackView };
}

// apps/web/src/components/dashboard/FeedbackFeed.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { feedbacksQuery, lastSeenQuery } from "@/lib/queries";
import { StatusTabs } from "@/components/ui/StatusTabs";
import { FilterChips } from "@/components/ui/FilterChips";
import { AITrendsBar } from "@/components/dashboard/AITrendsBar";
import { FeedbackFeedItem } from "@/components/dashboard/FeedbackFeedItem";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import type { IFeedback } from "@insightstream/shared-types";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "New" },
  { label: "In Review", value: "In Review" },
  { label: "In Progress", value: "In Progress" },
  { label: "Done", value: "Done" },
  { label: "Rejected", value: "Rejected" },
];

const BASE_FILTER_GROUPS = [
  {
    key: "source",
    options: [
      { label: "All sources", value: "all" },
      { label: "Widget", value: "Widget" },
      { label: "Direct", value: "Direct" },
    ],
  },
  {
    key: "sentiment",
    options: [
      { label: "😊 Positive", value: "positive" },
      { label: "😞 Negative", value: "negative" },
    ],
  },
  {
    key: "tags",
    label: "Tags",
    multi: true,
    options: [] as { label: string; value: string }[],
  },
  {
    key: "category",
    label: "Category",
    multi: true,
    options: [] as { label: string; value: string }[],
  },
];

interface FeedbackFeedProps {
  projectId: string;
  currentUserId?: string;
}

export function FeedbackFeed({ projectId, currentUserId }: FeedbackFeedProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({
    source: ["all"],
    sentiment: [],
    tags: [],
    category: [],
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

  const { data: feedbacks = [], isLoading } = useQuery(
    feedbacksQuery(projectId),
  );
  const { data: lastSeen } = useQuery(lastSeenQuery(projectId));

  useEffect(() => {
    if (!projectId) return;
    api.post("/feedback/mark-seen", { projectId }).catch(() => {});
  }, [projectId]);

  const filterGroups = useMemo(() => {
    const tags = Array.from(
      new Set((feedbacks as IFeedback[]).flatMap((f) => f.tags ?? [])),
    ).map((t) => ({ label: t, value: t }));

    const categories = Array.from(
      new Set(
        (feedbacks as IFeedback[])
          .map((f) => f.category)
          .filter((c): c is string => Boolean(c)),
      ),
    ).map((c) => ({ label: c, value: c }));

    return BASE_FILTER_GROUPS.map((g) => {
      if (g.key === "tags") return { ...g, options: tags };
      if (g.key === "category") return { ...g, options: categories };
      return g;
    });
  }, [feedbacks]);

  const filtered = useMemo(() => {
    return (feedbacks as IFeedback[]).filter((f) => {
      if (activeTab !== "all" && f.status !== activeTab) return false;

      const src = filterValues.source ?? ["all"];
      if (
        !src.includes("all") &&
        src.length > 0 &&
        f.source &&
        !src.includes(f.source)
      )
        return false;

      const sent = filterValues.sentiment ?? [];
      if (sent.includes("positive") && (f.sentimentScore ?? 0.5) < 0.6)
        return false;
      if (sent.includes("negative") && (f.sentimentScore ?? 0.5) >= 0.4)
        return false;

      const tags = filterValues.tags ?? [];
      if (tags.length > 0 && !tags.some((t) => f.tags?.includes(t)))
        return false;

      const cats = filterValues.category ?? [];
      if (cats.length > 0 && !cats.includes(f.category ?? "")) return false;

      return true;
    });
  }, [feedbacks, activeTab, filterValues]);

  const tabs = STATUS_TABS.map((t) => ({
    ...t,
    count:
      t.value === "all"
        ? (feedbacks as IFeedback[]).length
        : (feedbacks as IFeedback[]).filter((f) => f.status === t.value).length,
  }));

  function handleFilterChange(key: string, values: string[]) {
    setFilterValues((prev) => ({ ...prev, [key]: values }));
  }

  function handleThemeFilter(theme: string) {
    setFilterValues((prev) => ({ ...prev, category: [theme] }));
  }

  async function handleStatusChange(id: string, status: string) {
    await api.patch(`/feedback/${id}/status`, { status });
    queryClient.invalidateQueries({ queryKey: ["feedbacks", projectId] });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/feedback/${id}`);
      queryClient.invalidateQueries({ queryKey: ["feedbacks", projectId] });
      if (expandedId === id) setExpandedId(null);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReanalyze(id: string) {
    setReanalyzingId(id);
    try {
      await api.post(`/feedback/${id}/reanalyze`);
      queryClient.invalidateQueries({ queryKey: ["feedbacks", projectId] });
    } finally {
      setReanalyzingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AITrendsBar projectId={projectId} onThemeFilter={handleThemeFilter} />

      <StatusTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <FilterChips
        groups={filterGroups}
        values={filterValues}
        onChange={handleFilterChange}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No feedback found"
          description="Try adjusting your filters"
          className="py-16"
        />
      ) : (
        <div>
          {filtered.map((feedback: IFeedback) => (
            <FeedbackFeedItem
              key={feedback.id}
              feedback={feedback}
              isNew={lastSeen ? new Date(feedback.createdAt) > lastSeen : false}
              isExpanded={expandedId === feedback.id}
              onToggleExpand={() =>
                setExpandedId((id) =>
                  id === feedback.id ? null : feedback.id,
                )
              }
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onReanalyze={handleReanalyze}
              isDeleting={deletingId === feedback.id}
              isReanalyzing={reanalyzingId === feedback.id}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

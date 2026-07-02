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
import { MessageSquare, Download, CheckCheck } from "lucide-react";
import type { IFeedback } from "@insightstream/shared-types";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "New" },
  { label: "In Review", value: "In Review" },
  { label: "In Progress", value: "In Progress" },
  { label: "Done", value: "Done" },
  { label: "Rejected", value: "Rejected" },
  { label: "Archived", value: "Archived" },
];

const SENTIMENT_GROUP = {
  key: "sentiment",
  options: [
    { label: "😊 Positive", value: "positive" },
    { label: "😞 Negative", value: "negative" },
  ],
};

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

  // Mark seen on LEAVE (unmount) so that seenAt captures when the user last viewed the feed.
  // This ensures the NEXT visit correctly highlights items posted since they left.
  useEffect(() => {
    if (!projectId) return;
    return () => {
      api.post("/feedback/mark-seen", { projectId }).catch(() => {});
    };
  }, [projectId]);

  const filterGroups = useMemo(() => {
    const sources = Array.from(
      new Set((feedbacks as IFeedback[]).map((f) => f.source).filter(Boolean)),
    ).map((s) => ({ label: s as string, value: s as string }));

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

    return [
      {
        key: "source",
        options: [{ label: "All sources", value: "all" }, ...sources],
      },
      SENTIMENT_GROUP,
      { key: "tags", label: "Tags", multi: true, options: tags },
      { key: "category", label: "Category", multi: true, options: categories },
    ];
  }, [feedbacks]);

  const filtered = useMemo(() => {
    return (feedbacks as IFeedback[]).filter((f) => {
      // Archived items only appear on the Archived tab
      if (f.status === "Archived" && activeTab !== "Archived") return false;

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
        ? (feedbacks as IFeedback[]).filter((f) => f.status !== "Archived").length
        : (feedbacks as IFeedback[]).filter((f) => f.status === t.value).length,
  }));

  function handleFilterChange(key: string, values: string[]) {
    setFilterValues((prev) => ({ ...prev, [key]: values }));
  }

  function handleThemeFilter(theme: string) {
    setFilterValues((prev) => ({ ...prev, category: [theme] }));
  }

  async function markAllRead() {
    const now = new Date();
    await api.post("/feedback/mark-seen", { projectId }).catch(() => {});
    // Update TQ cache immediately so dots clear without page reload
    queryClient.setQueryData(lastSeenQuery(projectId).queryKey, now);
  }

  function clearAllFilters() {
    setActiveTab("all");
    setFilterValues({ source: ["all"], sentiment: [], tags: [], category: [] });
  }

  function exportCSV() {
    const rows = [
      ["ID", "Content", "Source", "Category", "Status", "Sentiment", "Created"],
      ...(filtered as IFeedback[]).map((f) => [
        f.id,
        `"${f.content.replace(/"/g, '""')}"`,
        f.source ?? "",
        f.category ?? "",
        f.status,
        f.sentimentScore !== undefined ? String(Math.round(f.sentimentScore * 100)) + "%" : "",
        new Date(f.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      <StatusTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        rightSlot={
          <div className="flex items-center gap-2">
            {lastSeen !== undefined && (feedbacks as IFeedback[]).some(
              (f) => lastSeen === null || new Date(f.createdAt) > lastSeen,
            ) && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-xs text-brand-muted hover:text-brand-fg hover:border-brand-muted transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-accent/30 bg-brand-accent/8 text-xs text-brand-accent hover:bg-brand-accent/15 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        }
      />

      <FilterChips
        groups={filterGroups}
        values={filterValues}
        onChange={handleFilterChange}
        onClearAll={clearAllFilters}
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
              isNew={
                lastSeen === undefined
                  ? false
                  : lastSeen === null
                    ? true
                    : new Date(feedback.createdAt) > lastSeen
              }
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

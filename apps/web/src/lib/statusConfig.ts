import { FeedbackStatus } from "@insightstream/shared-types";

interface StatusConfigEntry {
  /** bg/text/border classes for a pill badge (Badge component) */
  badge: string;
  /** solid bg class for a dot/bar indicator */
  dot: string;
}

export const STATUS_CONFIG: Record<FeedbackStatus, StatusConfigEntry> = {
  [FeedbackStatus.NEW]: {
    badge: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
    dot: "bg-brand-accent",
  },
  [FeedbackStatus.IN_REVIEW]: {
    badge: "bg-status-warning/15 text-status-warning border-status-warning/30",
    dot: "bg-status-warning",
  },
  [FeedbackStatus.IN_PROGRESS]: {
    badge: "bg-status-info/15 text-status-info border-status-info/30",
    dot: "bg-status-info",
  },
  [FeedbackStatus.DONE]: {
    badge: "bg-status-success/15 text-status-success border-status-success/30",
    dot: "bg-status-success",
  },
  [FeedbackStatus.REJECTED]: {
    badge: "bg-status-danger/15 text-status-danger border-status-danger/30",
    dot: "bg-status-danger",
  },
  [FeedbackStatus.ARCHIVED]: {
    badge: "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30",
    dot: "bg-zinc-500",
  },
};

const FALLBACK: StatusConfigEntry = {
  badge: "bg-zinc-500/15 text-brand-fg-muted border-zinc-500/30",
  dot: "bg-zinc-500",
};

export function getStatusConfig(status: string): StatusConfigEntry {
  return STATUS_CONFIG[status as FeedbackStatus] ?? FALLBACK;
}

import { cn } from "@/lib/utils";

interface SentimentBarProps {
  score: number | null | undefined;
  showLabel?: boolean;
  className?: string;
}

export function SentimentBar({ score, showLabel = true, className }: SentimentBarProps) {
  // Sentiment honesty: feedback with no AI analysis yet must never render as "0%"
  // (which reads as a real, maximally-negative score). Show an honest pending state instead.
  if (score === null || score === undefined) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden" />
        {showLabel && (
          <span className="text-[10px] text-brand-fg-muted font-medium font-mono italic">
            Analyzing…
          </span>
        )}
      </div>
    );
  }

  const colorClass =
    score > 0.6
      ? "bg-status-success"
      : score < 0.4
        ? "bg-status-danger"
        : "bg-status-warning";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-brand-fg-muted font-medium font-mono">
          {Math.round(score * 100)}%
        </span>
      )}
    </div>
  );
}

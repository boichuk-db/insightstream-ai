import { cn } from "@/lib/utils";

interface SentimentBarProps {
  score: number | null | undefined;
  showLabel?: boolean;
  className?: string;
}

export function SentimentBar({
  score,
  showLabel = true,
  className,
}: SentimentBarProps) {
  // Sentiment honesty: feedback with no AI analysis yet must never render as "0%"
  // (which reads as a real, maximally-negative score). Show an honest pending state instead.
  if (score === null || score === undefined) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden" />
        {showLabel && (
          <span className="text-xs text-brand-fg-muted font-medium italic">
            Analyzing…
          </span>
        )}
      </div>
    );
  }

  const isPositive = score > 0.6;
  const isNegative = score < 0.4;

  const colorClass = isPositive
    ? "bg-status-success"
    : isNegative
      ? "bg-status-danger"
      : "bg-status-warning";

  // Word label instead of a bare percentage — a number with no context ("72%")
  // doesn't tell the reader whether that's good or bad without doing the math themselves.
  const textColorClass = isPositive
    ? "text-status-success"
    : isNegative
      ? "text-status-danger"
      : "text-status-warning";

  const label = isPositive ? "Positive" : isNegative ? "Negative" : "Neutral";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", textColorClass)}>
          {label}
        </span>
      )}
    </div>
  );
}

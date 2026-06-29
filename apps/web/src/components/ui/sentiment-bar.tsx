import { cn } from "@/lib/utils";

interface SentimentBarProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function SentimentBar({ score, showLabel = true, className }: SentimentBarProps) {
  const colorClass =
    score > 0.6 ? "bg-emerald-500" : score < 0.4 ? "bg-red-500" : "bg-amber-500";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="w-10 h-1 bg-brand-border rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorClass)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-brand-muted font-medium font-mono">
          {Math.round(score * 100)}%
        </span>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  current: number;
  max: number | null;
  className?: string;
}

export function UsageMeter({ label, current, max, className }: UsageMeterProps) {
  const pct = max ? Math.min((current / max) * 100, 100) : 0;
  const colorClass =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-brand-primary";

  return (
    <div className={cn("p-4 bg-brand-surface rounded-xl border border-brand-border", className)}>
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-brand-fg">
        {current}{" "}
        <span className="text-brand-muted text-sm font-normal">/ {max === null ? "∞" : max}</span>
      </p>
      {max !== null && (
        <div className="mt-2 h-1.5 bg-brand-border rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", colorClass)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

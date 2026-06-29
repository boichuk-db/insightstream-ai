import { cn } from "@/lib/utils";

interface SkeletonProps {
  count?: number;
  height?: string;
  layout?: "list" | "grid";
  cols?: number;
  className?: string;
}

export function Skeleton({
  count = 3,
  height = "h-10",
  layout = "list",
  cols = 2,
  className,
}: SkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (layout === "grid") {
    return (
      <div className={cn("grid gap-3", `grid-cols-${cols}`, className)}>
        {items.map((i) => (
          <div key={i} className={cn("bg-brand-border/40 rounded-xl animate-pulse", height)} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((i) => (
        <div key={i} className={cn("bg-brand-border/40 rounded-xl animate-pulse", height)} />
      ))}
    </div>
  );
}

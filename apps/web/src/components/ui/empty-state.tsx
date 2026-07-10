// apps/web/src/components/ui/empty-state.tsx
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "py-6 gap-2" : "py-10 gap-3",
        className,
      )}
    >
      <Icon
        className={cn(
          "text-brand-accent opacity-40",
          size === "sm" ? "h-8 w-8" : "h-12 w-12",
        )}
      />
      <p className={cn("font-medium text-brand-fg-muted", size === "sm" ? "text-xs" : "text-sm")}>
        {title}
      </p>
      {description && (
        <p className="text-xs text-brand-fg-muted max-w-[200px]">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

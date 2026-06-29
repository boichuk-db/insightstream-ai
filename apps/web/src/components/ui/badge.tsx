import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/colors";

type BadgeVariant = "role" | "plan" | "category" | "status";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  admin: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  member: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  pro: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  enterprise: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "In Review": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "In Progress": "bg-blue-500/15 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Done: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  archived: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  Rejected: "bg-red-500/15 text-red-300 border-red-500/30",
};

interface BadgeProps {
  variant: BadgeVariant;
  value: string;
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ variant, value, size = "md", className }: BadgeProps) {
  let colorClass: string;

  if (variant === "category") {
    const c = getCategoryColor(value);
    colorClass = cn(c.bg, c.text, c.border);
  } else if (variant === "role") {
    colorClass = ROLE_COLORS[value.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  } else if (variant === "plan") {
    colorClass = PLAN_COLORS[value.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  } else {
    colorClass = STATUS_COLORS[value] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wider",
        size === "sm"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2.5 py-1 text-[10px]",
        colorClass,
        className,
      )}
    >
      {value}
    </span>
  );
}

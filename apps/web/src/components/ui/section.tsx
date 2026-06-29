import { cn } from "@/lib/utils";

const PADDING = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const GLOW_CLASSES = {
  "top-right":
    "absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none",
  "bottom-left":
    "absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none",
};

interface SectionProps {
  children: React.ReactNode;
  glow?: "top-right" | "bottom-left" | "none";
  padding?: "sm" | "md" | "lg";
  className?: string;
  as?: React.ElementType;
}

export function Section({
  children,
  glow = "top-right",
  padding = "md",
  className,
  as: Tag = "section",
}: SectionProps) {
  return (
    <Tag
      className={cn(
        "bg-brand-surface/60 border border-brand-border/50 rounded-2xl shadow-xl relative overflow-hidden",
        PADDING[padding],
        className,
      )}
    >
      {glow !== "none" && <div className={GLOW_CLASSES[glow]} />}
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}

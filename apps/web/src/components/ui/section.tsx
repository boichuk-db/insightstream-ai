import { cn } from "@/lib/utils";

const PADDING = {
  none: "",
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
  padding?: "none" | "sm" | "md" | "lg";
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
        "bg-brand-surface/60 border border-brand-border/50 rounded-2xl shadow-xl relative",
        className,
      )}
    >
      {glow !== "none" && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className={GLOW_CLASSES[glow]} />
        </div>
      )}
      <div className={cn("relative", PADDING[padding] ?? PADDING.md)}>{children}</div>
    </Tag>
  );
}

import { cn } from "@/lib/utils";

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

interface SectionProps {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  as?: React.ElementType;
}

export function Section({
  children,
  padding = "md",
  className,
  as: Tag = "section",
}: SectionProps) {
  return (
    <Tag
      className={cn(
        "bg-brand-surface/60 border border-brand-border/50 rounded-xl shadow-xl relative",
        className,
      )}
    >
      <div className={cn("relative", PADDING[padding] ?? PADDING.md)}>{children}</div>
    </Tag>
  );
}

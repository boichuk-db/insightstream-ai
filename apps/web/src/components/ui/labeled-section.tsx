import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabeledSectionProps {
  icon: LucideIcon;
  label: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function LabeledSection({
  icon: Icon,
  label,
  iconColor = "text-indigo-400",
  children,
  className,
}: LabeledSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

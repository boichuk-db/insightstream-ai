import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";

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
  iconColor = "text-brand-accent",
  children,
  className,
}: LabeledSectionProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <Eyebrow>{label}</Eyebrow>
      </div>
      {children}
    </div>
  );
}

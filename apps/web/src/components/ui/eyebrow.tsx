import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-brand-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

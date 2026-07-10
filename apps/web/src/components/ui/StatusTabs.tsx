import { cn } from "@/lib/utils";

export interface StatusTab {
  label: string;
  value: string;
  count: number;
}

interface StatusTabsProps {
  tabs: StatusTab[];
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
  rightSlot?: React.ReactNode;
}

export function StatusTabs({
  tabs,
  activeTab,
  onChange,
  className,
  rightSlot,
}: StatusTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center border-b border-brand-border bg-brand-surface overflow-x-auto",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap border-b-2 -mb-px transition-colors",
            activeTab === tab.value
              ? "border-brand-accent text-brand-fg"
              : "border-transparent text-brand-fg-muted hover:text-brand-fg",
          )}
        >
          {tab.label}
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
              activeTab === tab.value
                ? "bg-brand-accent/15 text-brand-accent"
                : "bg-brand-surface-hover text-brand-fg-muted",
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
      {rightSlot && <div className="ml-auto pr-4">{rightSlot}</div>}
    </div>
  );
}

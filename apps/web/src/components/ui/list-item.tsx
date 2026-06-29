import { cn } from "@/lib/utils";

interface ListItemProps {
  icon?: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ListItem({ icon, primary, secondary, actions, className }: ListItemProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-200 truncate">{primary}</div>
          {secondary && (
            <div className="text-[10px] text-brand-muted mt-0.5">{secondary}</div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

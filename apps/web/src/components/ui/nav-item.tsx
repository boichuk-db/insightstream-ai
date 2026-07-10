import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Trailing content, e.g. an unread-count pill — real Sidebar consumers need this. */
  badge?: React.ReactNode;
}

export function NavItem({ href, icon: Icon, label, active, onClick, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-brand-accent/10 text-brand-accent"
          : "text-brand-fg-muted hover:text-brand-fg hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge}
    </Link>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  /**
   * Only pages actually reached by drilling into something (not top-level
   * sidebar destinations like Analytics/Activity/Settings) should show a
   * back button — it implies "go up one level," which is wrong on a page
   * that IS the top level. Defaults to false.
   */
  showBackButton?: boolean;
}

export function PageHeader({
  icon,
  title,
  subtitle,
  right,
  onBack,
  showBackButton = false,
}: PageHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push("/dashboard"));

  return (
    <header className="flex flex-col gap-2 mb-8 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2.5 bg-brand-surface border border-brand-border rounded-lg text-brand-accent hover:text-brand-accent/80 transition-all hover:scale-105 active:scale-95 shadow-lg group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <h1 className="text-3xl font-bold text-brand-fg tracking-tight flex items-center gap-3">
            {icon} {title}
          </h1>
        </div>
        {right}
      </div>
      {subtitle && (
        <p className="text-brand-fg-muted text-sm leading-relaxed max-w-2xl">{subtitle}</p>
      )}
    </header>
  );
}

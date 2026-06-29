"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ icon, title, subtitle, right, onBack }: PageHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.push("/dashboard"));

  return (
    <header className="flex flex-col gap-2 mb-8 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2.5 bg-brand-surface border border-brand-border rounded-xl text-brand-accent hover:text-brand-accent/80 transition-all hover:scale-105 active:scale-95 shadow-lg group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <h1 className="text-3xl font-bold text-brand-fg tracking-tight flex items-center gap-3">
            {icon} {title}
          </h1>
        </div>
        {right}
      </div>
      {subtitle && (
        <p className="text-brand-muted text-sm leading-relaxed max-w-2xl">{subtitle}</p>
      )}
    </header>
  );
}

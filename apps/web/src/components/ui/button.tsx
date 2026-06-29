"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      isLoading,
      disabled,
      variant = "primary",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20 border-transparent",
      secondary:
        "bg-brand-surface border border-brand-border text-zinc-300 hover:text-white hover:bg-brand-surface-hover hover:border-brand-border-hover shadow-sm",
      ghost:
        "bg-transparent text-brand-muted hover:text-zinc-200 hover:bg-white/5 border-transparent",
      danger:
        "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-sm shadow-red-950/20",
    };

    const sizes = {
      sm: "h-9 px-3.5 text-[11px] font-bold",
      md: "h-10 px-4 text-sm font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-brand-bg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

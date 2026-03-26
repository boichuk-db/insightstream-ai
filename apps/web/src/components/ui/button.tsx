'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'brand';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, isLoading, disabled, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-900/20 border-transparent',
      brand: 'bg-brand-surface border border-brand-border text-zinc-300 hover:text-white hover:bg-brand-surface-hover hover:border-brand-border-hover shadow-sm',
      secondary: 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700',
      ghost: 'bg-transparent text-brand-muted hover:text-zinc-200 hover:bg-white/5 border-transparent',
      danger: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 shadow-sm shadow-red-950/20',
      outline: 'bg-transparent border-brand-border text-zinc-400 hover:text-zinc-200 hover:bg-brand-surface shadow-sm'
    };

    const sizes = {
      xs: 'h-8 px-2.5 text-[10px] uppercase font-bold tracking-widest',
      sm: 'h-9 px-3.5 text-[11px] font-bold',
      md: 'h-10 px-4 text-sm font-semibold',
      lg: 'h-12 px-6 text-base font-bold'
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium ring-offset-brand-bg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

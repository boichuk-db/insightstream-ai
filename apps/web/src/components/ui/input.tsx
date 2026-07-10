"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils"; // wait I used ../lib/utils earlier but @ is configured

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-fg ring-offset-brand-bg file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-brand-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

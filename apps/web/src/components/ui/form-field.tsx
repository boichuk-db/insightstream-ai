import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  icon?: LucideIcon;
  /**
   * Pass the same id to your control (e.g. <Input id={htmlFor} />) so
   * clicking the label focuses it and screen readers announce it —
   * without this, the label has no programmatic association with the
   * control rendered in `children`. Scope the id per-form (e.g.
   * "login-email", not bare "email") — two FormFields with the same
   * generic id mounted on the same page collide on a duplicate DOM id.
   */
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, icon: Icon, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-sm font-medium text-brand-fg"
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-brand-fg-muted" />}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

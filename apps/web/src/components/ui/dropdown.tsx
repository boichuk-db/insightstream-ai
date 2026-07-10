"use client";

import { useState, cloneElement, Children } from "react";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";

interface DropdownItemProps {
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  onClose?: () => void;
}

function DropdownItem({
  onClick,
  icon,
  children,
  destructive,
  disabled,
  className,
  onClose,
}: DropdownItemProps) {
  return (
    <button
      onClick={() => {
        onClick?.();
        onClose?.();
      }}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
        destructive
          ? "text-red-400 hover:bg-red-500/10"
          : "text-brand-fg-muted hover:bg-white/5 hover:text-brand-fg",
        disabled && "opacity-40 pointer-events-none",
        className,
      )}
    >
      {icon && <span className="shrink-0 opacity-70">{icon}</span>}
      {children}
    </button>
  );
}

function DropdownSeparator() {
  return <div className="my-1 h-px bg-brand-border" />;
}

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

function Dropdown({ trigger, children, align = "left", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const injectClose = (node: React.ReactNode): React.ReactNode => {
    if (!node || typeof node !== "object") return node;
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.type === DropdownItem) {
      return cloneElement(element as React.ReactElement<DropdownItemProps>, { onClose: close });
    }
    if (element.props?.children) {
      return cloneElement(element, { children: Children.map(element.props.children, injectClose) });
    }
    return node;
  };

  return (
    <Popover
      trigger={trigger}
      align={align}
      open={open}
      onOpenChange={setOpen}
      className={cn("min-w-[160px]", className)}
    >
      {Children.map(children, injectClose)}
    </Popover>
  );
}

Dropdown.Item = DropdownItem;
Dropdown.Separator = DropdownSeparator;

export { Dropdown };

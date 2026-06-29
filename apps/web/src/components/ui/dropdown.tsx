"use client";

import { useState, useRef, useEffect, cloneElement, Children } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
          : "text-brand-muted hover:bg-white/5 hover:text-brand-fg",
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
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const injectClose = (node: React.ReactNode): React.ReactNode => {
    if (!node || typeof node !== "object") return node;
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.type === DropdownItem) {
      return cloneElement(
        element as React.ReactElement<DropdownItemProps>,
        { onClose: close },
      );
    }
    if (element.props?.children) {
      return cloneElement(element, {
        children: Children.map(element.props.children, injectClose),
      });
    }
    return node;
  };

  const childrenWithClose = Children.map(children, injectClose);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setIsOpen((v) => !v)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute top-full mt-2 z-50 min-w-[160px] rounded-xl border border-brand-border bg-brand-surface shadow-2xl p-1",
              align === "right" ? "right-0" : "left-0",
              className,
            )}
          >
            {childrenWithClose}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Dropdown.Item = DropdownItem;
Dropdown.Separator = DropdownSeparator;

export { Dropdown };

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OverlayProps {
  /**
   * Overlay is meant to own the dismiss-on-backdrop-click behavior by
   * itself — don't also attach an onClick={onClose} to a wrapping element
   * that contains this Overlay, or onClose fires twice per click.
   */
  onClick?: () => void;
  className?: string;
}

export function Overlay({ onClick, className }: OverlayProps) {
  return (
    <motion.div
      className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm", className)}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}

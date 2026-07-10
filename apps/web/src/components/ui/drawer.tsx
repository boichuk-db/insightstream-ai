"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Overlay } from "./overlay";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, side = "right", children, className }: DrawerProps) {
  const offscreen = side === "right" ? "100%" : "-100%";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <Overlay onClick={onClose} />
          <motion.div
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ type: "tween", duration: 0.25 }}
            className={cn(
              "fixed inset-y-0 z-50 w-full max-w-sm bg-brand-bg border-brand-border overflow-y-auto",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

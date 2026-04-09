"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";

export interface PlanLimitErrorData {
  message: string;
  currentPlan: string;
  limit: number;
  current: number;
}

interface PlanLimitModalProps {
  open: boolean;
  onClose: () => void;
  errorData: PlanLimitErrorData | null;
}

export function PlanLimitModal({ open, onClose, errorData }: PlanLimitModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !errorData) return null;

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Plan Limit Reached</h2>
          </div>

          <p className="text-zinc-300 text-sm leading-relaxed">
            {errorData.message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

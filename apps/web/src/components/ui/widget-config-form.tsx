"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_COLORS,
  WIDGET_SHAPES,
  WIDGET_POSITIONS,
  WIDGET_FRAMEWORKS,
} from "@/lib/widgetSnippet";

interface WidgetConfigFormProps {
  color: (typeof WIDGET_COLORS)[number]["value"];
  onColorChange: (value: (typeof WIDGET_COLORS)[number]["value"]) => void;
  shape: (typeof WIDGET_SHAPES)[number];
  onShapeChange: (value: (typeof WIDGET_SHAPES)[number]) => void;
  position: (typeof WIDGET_POSITIONS)[number];
  onPositionChange: (value: (typeof WIDGET_POSITIONS)[number]) => void;
  framework: (typeof WIDGET_FRAMEWORKS)[number];
  onFrameworkChange: (value: (typeof WIDGET_FRAMEWORKS)[number]) => void;
}

export function WidgetConfigForm({
  color,
  onColorChange,
  shape,
  onShapeChange,
  position,
  onPositionChange,
  framework,
  onFrameworkChange,
}: WidgetConfigFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-brand-fg mb-3">Brand Color</p>
        <div className="flex gap-2.5 flex-wrap">
          {WIDGET_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onColorChange(c.value)}
              className={cn(
                "w-10 h-10 rounded-full transition-all flex items-center justify-center",
                color === c.value
                  ? "ring-2 ring-brand-primary ring-offset-2 ring-offset-brand-surface scale-110"
                  : "hover:scale-105 opacity-60 hover:opacity-100",
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            >
              {color === c.value && <Check strokeWidth={3} className="text-white w-5 h-5" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-semibold text-brand-fg mb-2">Button Shape</p>
          <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
            {WIDGET_SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onShapeChange(s)}
                className={cn(
                  "min-w-[90px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                  shape === s
                    ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                    : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-fg mb-2">Screen Position</p>
          <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
            {WIDGET_POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPositionChange(p)}
                className={cn(
                  "min-w-[110px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                  position === p
                    ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                    : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
                )}
              >
                {p.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-brand-fg mb-2">Framework</p>
        <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
          {WIDGET_FRAMEWORKS.map((fw) => (
            <button
              key={fw}
              type="button"
              onClick={() => onFrameworkChange(fw)}
              className={cn(
                "min-w-[80px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                framework === fw
                  ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm"
                  : "text-brand-fg-muted hover:text-brand-fg border border-transparent",
              )}
            >
              {fw === "html" ? "HTML" : fw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

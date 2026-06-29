import { useState } from "react";
import {
  Code,
  Sparkles,
  Check,
  Type,
  Maximize,
  LayoutTemplate,
  Key,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CopyButton } from "@/components/ui/copy-button";

interface WidgetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

const COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Sky", value: "#0ea5e9" },
];

const SHAPES = ["circle", "square", "rounded"] as const;
const POSITIONS = ["bottom-right", "bottom-left"] as const;
const FRAMEWORKS = ["html", "react", "angular"] as const;

export function WidgetGeneratorModal({
  isOpen,
  onClose,
  apiKey,
}: WidgetGeneratorModalProps) {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedShape, setSelectedShape] =
    useState<(typeof SHAPES)[number]>("rounded");
  const [selectedPosition, setSelectedPosition] =
    useState<(typeof POSITIONS)[number]>("bottom-right");
  const [selectedFramework, setSelectedFramework] =
    useState<(typeof FRAMEWORKS)[number]>("html");

  const getSnippet = () => {
    const scriptUrl =
      process.env.NEXT_PUBLIC_WIDGET_URL ||
      "http://localhost:8080/dist/widget.iife.js";
    const keyPlaceholder = "YOUR_API_KEY";

    if (selectedFramework === "react") {
      return `import { useEffect } from 'react';

const INSIGHT_STREAM_API_KEY = '${keyPlaceholder}';

export default function InsightStreamWidget() {
  useEffect(() => {
    // 1. Set configuration
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    // 2. Load the widget script
    const script = document.createElement('script');
    script.src = "${scriptUrl}";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}`;
    }

    if (selectedFramework === "angular") {
      return `import { Component, OnInit, OnDestroy } from '@angular/core';

const INSIGHT_STREAM_API_KEY = '${keyPlaceholder}';

@Component({
  selector: 'app-insight-stream',
  template: '',
  standalone: true
})
export class InsightStreamComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement | null = null;

  ngOnInit() {
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: '${selectedColor.value}',
      shape: '${selectedShape}',
      position: '${selectedPosition}'
    };

    this.scriptElement = document.createElement('script');
    this.scriptElement.src = "${scriptUrl}";
    this.scriptElement.async = true;
    document.body.appendChild(this.scriptElement);
  }

  ngOnDestroy() {
    if (this.scriptElement && document.body.contains(this.scriptElement)) {
      document.body.removeChild(this.scriptElement);
    }
  }
}`;
    }

    // Default HTML format
    return `<!-- InsightStream AI Widget -->
<script id="insight-stream-config">
  window.InsightStreamConfig = {
    apiKey: '${keyPlaceholder}',
    color: '${selectedColor.value}',
    shape: '${selectedShape}',
    position: '${selectedPosition}'
  };
</script>
<script src="${scriptUrl}"></script>`;
  };

  const snippet = getSnippet();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Embed Widget"
      icon={<Code className="text-brand-accent" />}
      size="md"
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shape and Position (Left) */}
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-brand-fg mb-2 flex items-center gap-2">
                <Maximize size={14} className="text-brand-muted" /> Button
                Shape
              </h3>
              <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
                {SHAPES.map((shape) => (
                  <button
                    key={shape}
                    onClick={() => setSelectedShape(shape)}
                    className={`min-w-[90px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedShape === shape ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm" : "text-brand-muted hover:text-brand-fg border border-transparent"}`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-brand-fg mb-2 flex items-center gap-2">
                <Type size={14} className="text-brand-muted" /> Screen
                Position
              </h3>
              <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPosition(pos)}
                    className={`min-w-[110px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedPosition === pos ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm" : "text-brand-muted hover:text-brand-fg border border-transparent"}`}
                  >
                    {pos.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color Customization (Right) */}
          <div>
            <h3 className="text-sm font-semibold text-brand-fg mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-brand-muted" /> Brand
              Color
            </h3>
            <div className="flex gap-2.5 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${selectedColor.value === color.value ? "ring-2 ring-brand-primary ring-offset-2 ring-offset-brand-surface scale-110" : "hover:scale-105 opacity-60 hover:opacity-100"}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {selectedColor.value === color.value && (
                    <Check strokeWidth={3} className="text-white w-5 h-5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* API Key */}
        <div>
          <h3 className="text-sm font-semibold text-brand-fg mb-2 flex items-center gap-2">
            <Key size={14} className="text-brand-muted" /> Your API Key
          </h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-sm text-brand-accent font-mono truncate select-all">
              {apiKey}
            </code>
            <CopyButton text={apiKey} label="Copy" size="sm" />
          </div>
          <p className="mt-1.5 text-xs text-brand-muted">
            Replace{" "}
            <code className="text-brand-muted bg-brand-surface px-1 py-0.5 rounded">
              YOUR_API_KEY
            </code>{" "}
            in the snippet below with this key.
          </p>
        </div>

        {/* Code Snippet */}
        <div className="mt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3 gap-3">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-brand-fg flex items-center gap-2">
                <LayoutTemplate size={14} className="text-brand-muted" />{" "}
                Framework Snippet
              </h3>
              <div className="flex bg-brand-bg rounded-lg p-1 border border-brand-border w-fit">
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw}
                    onClick={() => setSelectedFramework(fw)}
                    className={`min-w-[80px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${selectedFramework === fw ? "bg-brand-accent/10 text-brand-accent border border-brand-accent/20 shadow-sm" : "text-brand-muted hover:text-brand-fg border border-transparent"}`}
                  >
                    {fw === "html" ? "HTML" : fw}
                  </button>
                ))}
              </div>
            </div>
            <CopyButton text={snippet} label="Copy to Clipboard" size="sm" />
          </div>

          <div className="relative group">
            <pre className="bg-brand-bg border border-brand-border p-4 rounded-xl overflow-x-auto text-sm text-brand-accent/80 font-mono leading-relaxed max-h-[250px] custom-scrollbar">
              <code>{snippet}</code>
            </pre>
          </div>
          <p className="mt-3 text-xs text-brand-muted">
            {selectedFramework === "html" && (
              <>
                Paste this script into the{" "}
                <code className="text-brand-muted bg-brand-surface px-1 py-0.5 rounded">
                  &lt;body&gt;
                </code>{" "}
                tag of your website.
              </>
            )}
            {selectedFramework === "react" && (
              <>
                Use this component in your React application (e.g., inside{" "}
                <code className="text-brand-muted bg-brand-surface px-1 py-0.5 rounded">
                  App.jsx
                </code>{" "}
                or a layout wrapper).
              </>
            )}
            {selectedFramework === "angular" && (
              <>
                Include this Standalone Component in your Angular
                application at the root level.
              </>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from "react";
import { Code, LayoutTemplate, Key } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CopyButton } from "@/components/ui/copy-button";
import { WidgetConfigForm } from "@/components/ui/widget-config-form";
import {
  WIDGET_COLORS,
  WIDGET_SHAPES,
  WIDGET_POSITIONS,
  WIDGET_FRAMEWORKS,
  buildWidgetSnippet,
} from "@/lib/widgetSnippet";

interface WidgetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
}

export function WidgetGeneratorModal({
  isOpen,
  onClose,
  apiKey,
}: WidgetGeneratorModalProps) {
  const [color, setColor] = useState<(typeof WIDGET_COLORS)[number]["value"]>(
    WIDGET_COLORS[0].value,
  );
  const [shape, setShape] = useState<(typeof WIDGET_SHAPES)[number]>("rounded");
  const [position, setPosition] =
    useState<(typeof WIDGET_POSITIONS)[number]>("bottom-right");
  const [framework, setFramework] =
    useState<(typeof WIDGET_FRAMEWORKS)[number]>("html");

  const snippet = buildWidgetSnippet({
    apiKey: "YOUR_API_KEY",
    color,
    shape,
    position,
    framework,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Embed Widget"
      icon={<Code className="text-brand-accent" />}
      size="md"
    >
      <div className="flex flex-col gap-6">
        <WidgetConfigForm
          color={color}
          onColorChange={setColor}
          shape={shape}
          onShapeChange={setShape}
          position={position}
          onPositionChange={setPosition}
          framework={framework}
          onFrameworkChange={setFramework}
        />

        {/* API Key */}
        <div>
          <h3 className="text-sm font-semibold text-brand-fg mb-2 flex items-center gap-2">
            <Key size={14} className="text-brand-fg-muted" /> Your API Key
          </h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-4 py-2.5 text-sm text-brand-accent font-mono truncate select-all">
              {apiKey}
            </code>
            <CopyButton text={apiKey} label="Copy" size="sm" />
          </div>
          <p className="mt-1.5 text-xs text-brand-fg-muted">
            Replace{" "}
            <code className="text-brand-fg-muted bg-brand-surface px-1 py-0.5 rounded">
              YOUR_API_KEY
            </code>{" "}
            in the snippet below with this key.
          </p>
        </div>

        {/* Code Snippet */}
        <div className="mt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-3 gap-3">
            <h3 className="text-sm font-semibold text-brand-fg flex items-center gap-2">
              <LayoutTemplate size={14} className="text-brand-fg-muted" />{" "}
              Framework Snippet
            </h3>
            <CopyButton text={snippet} label="Copy to Clipboard" size="sm" />
          </div>

          <div className="relative group">
            <pre className="bg-brand-bg border border-brand-border p-4 rounded-xl overflow-x-auto text-sm text-brand-accent/80 font-mono leading-relaxed max-h-[250px] custom-scrollbar">
              <code>{snippet}</code>
            </pre>
          </div>
          <p className="mt-3 text-xs text-brand-fg-muted">
            {framework === "html" && (
              <>
                Paste this script into the{" "}
                <code className="text-brand-fg-muted bg-brand-surface px-1 py-0.5 rounded">
                  &lt;body&gt;
                </code>{" "}
                tag of your website.
              </>
            )}
            {framework === "react" && (
              <>
                Use this component in your React application (e.g., inside{" "}
                <code className="text-brand-fg-muted bg-brand-surface px-1 py-0.5 rounded">
                  App.jsx
                </code>{" "}
                or a layout wrapper).
              </>
            )}
            {framework === "angular" && (
              <>
                Include this Standalone Component in your Angular application at
                the root level.
              </>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
}

export const WIDGET_COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Sky", value: "#0ea5e9" },
] as const;

export const WIDGET_SHAPES = ["circle", "square", "rounded"] as const;
export const WIDGET_POSITIONS = ["bottom-right", "bottom-left"] as const;
export const WIDGET_FRAMEWORKS = ["html", "react", "angular"] as const;

export interface WidgetSnippetConfig {
  /** the real API key, or a placeholder like "YOUR_API_KEY" */
  apiKey: string;
  color: (typeof WIDGET_COLORS)[number]["value"];
  shape: (typeof WIDGET_SHAPES)[number];
  position: (typeof WIDGET_POSITIONS)[number];
  framework: (typeof WIDGET_FRAMEWORKS)[number];
  scriptUrl?: string;
}

export function buildWidgetSnippet({
  apiKey,
  color,
  shape,
  position,
  framework,
  scriptUrl = process.env.NEXT_PUBLIC_WIDGET_URL || "http://localhost:8080/dist/widget.iife.js",
}: WidgetSnippetConfig): string {
  if (framework === "react") {
    return `import { useEffect } from 'react';

const INSIGHT_STREAM_API_KEY = ${JSON.stringify(apiKey)};

export default function InsightStreamWidget() {
  useEffect(() => {
    // 1. Set configuration
    (window as any).InsightStreamConfig = {
      apiKey: INSIGHT_STREAM_API_KEY,
      color: ${JSON.stringify(color)},
      shape: '${shape}',
      position: '${position}'
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

  if (framework === "angular") {
    return `import { Component, OnInit, OnDestroy } from '@angular/core';

const INSIGHT_STREAM_API_KEY = ${JSON.stringify(apiKey)};

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
      color: ${JSON.stringify(color)},
      shape: '${shape}',
      position: '${position}'
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

  return `<!-- InsightStream AI Widget -->
<script id="insight-stream-config">
  window.InsightStreamConfig = {
    apiKey: ${JSON.stringify(apiKey)},
    color: ${JSON.stringify(color)},
    shape: '${shape}',
    position: '${position}'
  };
</script>
<script src="${scriptUrl}"></script>`;
}

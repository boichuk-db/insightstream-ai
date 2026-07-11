import { describe, it, expect } from "vitest";
import { buildWidgetSnippet } from "./widgetSnippet";

describe("buildWidgetSnippet", () => {
  const baseConfig = {
    apiKey: "test-key",
    color: "#6366f1" as const,
    shape: "circle" as const,
    position: "bottom-right" as const,
    scriptUrl: "https://cdn.example.com/widget.iife.js",
  };

  it("embeds a safe apiKey directly in the html snippet", () => {
    const snippet = buildWidgetSnippet({ ...baseConfig, framework: "html" });
    expect(snippet).toContain('apiKey: "test-key"');
  });

  it("escapes a malicious apiKey so it cannot break out of the JS string (html)", () => {
    const malicious = `"; alert(1); //`;
    const snippet = buildWidgetSnippet({ ...baseConfig, apiKey: malicious, framework: "html" });
    expect(snippet).toContain(JSON.stringify(malicious));
    expect(snippet).not.toContain(`apiKey: "${malicious}"`);
  });

  it("escapes a malicious apiKey in the react snippet", () => {
    const malicious = `"; alert(1); //`;
    const snippet = buildWidgetSnippet({ ...baseConfig, apiKey: malicious, framework: "react" });
    expect(snippet).toContain(JSON.stringify(malicious));
    expect(snippet).not.toContain(`= "${malicious}";`);
  });

  it("escapes a malicious apiKey in the angular snippet", () => {
    const malicious = `"; alert(1); //`;
    const snippet = buildWidgetSnippet({ ...baseConfig, apiKey: malicious, framework: "angular" });
    expect(snippet).toContain(JSON.stringify(malicious));
    expect(snippet).not.toContain(`= "${malicious}";`);
  });

  it("uses the provided scriptUrl verbatim", () => {
    const snippet = buildWidgetSnippet({ ...baseConfig, framework: "html" });
    expect(snippet).toContain('src="https://cdn.example.com/widget.iife.js"');
  });
});

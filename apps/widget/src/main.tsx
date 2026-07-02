import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// ?inline returns the compiled CSS as a string instead of injecting it
// into the host document — required for Shadow DOM isolation.
import cssText from "./index.css?inline";
import App from "./App.tsx";

const initWidget = () => {
  const WIDGET_ID = "insight-stream-widget-root";
  if (document.getElementById(WIDGET_ID)) return;

  const host = document.createElement("div");
  host.id = WIDGET_ID;
  document.body.appendChild(host);

  // Open mode so customer devtools and our Playwright e2e can reach inside.
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = cssText;
  shadow.appendChild(style);

  const container = document.createElement("div");
  shadow.appendChild(container);

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// Handle late loading or direct execution
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  initWidget();
} else {
  window.addEventListener("DOMContentLoaded", initWidget);
}

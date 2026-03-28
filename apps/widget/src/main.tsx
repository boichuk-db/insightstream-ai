import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const initWidget = () => {
  const WIDGET_ID = "insight-stream-widget-root";
  let rootElement = document.getElementById(WIDGET_ID);

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = WIDGET_ID;
    document.body.appendChild(rootElement);
  }

  createRoot(rootElement).render(
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

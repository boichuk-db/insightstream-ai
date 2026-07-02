import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "InsightStream",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

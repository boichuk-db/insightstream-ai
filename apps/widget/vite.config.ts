import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
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

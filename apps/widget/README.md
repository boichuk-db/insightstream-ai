# InsightStream Widget

Embeddable feedback widget — Vite + TypeScript, outputs a single `widget.js` IIFE bundle served by the API.

## Stack

- **Vite** — IIFE bundle (`widget.js`)
- **Vanilla TypeScript** — no framework dependencies
- **PostCSS** — scoped styles injected into shadow DOM

## Local Development

```bash
pnpm dev    # from apps/widget — runs on http://localhost:8080
```

## Build

```bash
pnpm run build   # outputs dist/widget.js
```

The API serves `dist/widget.js` as a static file at `/widget.js` via `@nestjs/serve-static`.

## Integration

Add to any website:

```html
<script>
  window.InsightStreamConfig = {
    apiKey: "YOUR_PROJECT_API_KEY",
    serverUrl: "https://your-api.railway.app",
  };
</script>
<script src="https://your-api.railway.app/widget.js"></script>
```

## Features

- Floating feedback bubble (customizable position & color)
- Multi-step form (message → category → submit)
- API key validation + domain whitelisting enforcement
- Works on any website — no framework required

# IZAKAYA Lite UI

Vite + React based frontend for IZAKAYA verse. Built to deploy on Cloudflare Pages or GitHub Pages as a static site.

## Requirements

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5174/`.

## Build & Preview

```bash
npm run build
npm run preview
```

The build output is generated under `dist/`.

## Deployment

### Cloudflare Pages
1. `npm run build`
2. Deploy the `dist/` directory using `wrangler pages deploy dist` or the Pages dashboard.

### GitHub Pages
1. `npm run build`
2. Copy the `dist/` contents to `docs/` or your gh-pages branch and push.

## Environment Variables

UI settings are managed through `.env` files supported by Vite (`.env`, `.env.local`, etc). Example:

```
VITE_BFF_URL=https://bff.example.com
```

## Pre-push checklist

- `npm run build` completes without errors
- `dist/` renders the expected UI locally (`npm run preview`)
- No secrets committed (`.env*` ignored)

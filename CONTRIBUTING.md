# Contributing

## Prerequisites

- Node.js 22 or later
- npm 11 or later

## Local development

Install the project tools once:

```powershell
npm install
npx playwright install chromium
```

Start the static site locally:

```powershell
npm run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:5173`).

## Required checks

Run all checks before requesting review or deployment:

```powershell
npm run check
```

Individual commands are also available:

- `npm run format:check` — verify formatting
- `npm run lint` — lint test and automation code
- `npm run test:unit` — run unit tests
- `npm run test:links` — find broken local links and assets
- `npm run test:ui` — run browser smoke tests
- `npm run build` — create the clean static artifact used by GitHub Pages

## Safe-change rule

Preserve existing public routes and test them before changing their implementation. New public experiences should be introduced as preview routes until approved for the production home page.

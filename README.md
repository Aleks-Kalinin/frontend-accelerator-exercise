# frontend-accelerator-exercise

React 19 + TypeScript app scaffolded with Vite.

## Requirements

- Node.js 20.19+ / 22.12+ (developed on v26)

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

## Layout

```
index.html           # Vite entry HTML
public/              # Static assets served as-is
src/
  main.tsx           # React root (createRoot + StrictMode)
  App.tsx            # Root component
  index.css, App.css # Styles
  assets/            # Imported assets
vite.config.ts       # Vite config (@vitejs/plugin-react)
tsconfig*.json       # Project references: app + node
```

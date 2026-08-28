# accounting-web

Frontend for the Multi-Business Accounting Tool. A React + TypeScript single-page app that talks only to `accounting-api` over HTTPS — it never touches the database or Google Drive directly.

Visual direction is the "Ledger" theme — see `../Assest and doc/Accounting-Tool-Ledger-Theme-Style-Guide_1.html` for the full design tokens and `../Assest and doc/Accounting-Tool-Ledger.html` for the reference mockup.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4, theme tokens in `src/index.css` |
| Routing | React Router |
| Server state | TanStack Query |
| Fonts | Fraunces (display), IBM Plex Sans (body), IBM Plex Mono (figures) — loaded via Google Fonts in `index.html` |

## Setup

Requires `accounting-api` running locally (see its README) — this app has no backend of its own.

```bash
npm install
cp .env.example .env
# VITE_API_URL should point at your local accounting-api (default http://localhost:3000)
npm run dev
```

Opens at `http://localhost:5173`. The API must have `CORS_ORIGIN` set to this origin (already the default in `accounting-api/.env.example`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint source (`oxlint`) |

## Architecture

```
lib/            api-client.ts (typed fetch wrapper, JWT header injection),
                auth-context.tsx (auth state, token persistence)
types/          TypeScript types mirroring accounting-api's response shapes
components/     Shared UI primitives (Button, TextField, Seal, ProtectedRoute)
routes/         One file per page
```

Auth state lives in `AuthProvider` (wraps the whole app in `main.tsx`). The JWT is kept in `localStorage`; on load, if a token exists, the app calls `GET /auth/me` to hydrate the current user (or clears the token if it's no longer valid). `ProtectedRoute` redirects to `/login` when there's no authenticated user.

## Status

**Phase 1 (setup) + Phase 2 (auth) — done.** Login, registration, session persistence across reloads, and route protection are wired to the real API. The signed-in landing page is a placeholder — the dashboard (matching the Ledger mockup) is the next phase.

Not built yet: business management, bookkeeping, invoicing, dashboards, and sharing UI — see the phase list from planning.

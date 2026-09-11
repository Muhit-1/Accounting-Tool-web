# accounting-web

Frontend for the Multi-Business Accounting Tool. A React + TypeScript single-page app that talks only to `accounting-api` over HTTPS — it never touches the database or Google Drive directly.

Visual direction is the "Workspace" theme (dark sidebar app shell, Plus Jakarta Sans/Roboto Mono, blue accent) — see `THEME-STYLE-GUIDE.md` (local reference, not committed) for the full design tokens.

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
                auth-context.tsx (auth state, token persistence),
                one file per resource (businesses, accounts, transactions,
                invoices, reports, dashboard, access-grants) — each exports
                typed TanStack Query hooks that wrap api-client
types/          TypeScript types mirroring accounting-api's response shapes
components/     Shared UI primitives (Button, TextField, Seal, ProtectedRoute)
                and per-feature panels under dashboard/, account/
routes/         One file per page
```

Auth state lives in `AuthProvider` (wraps the whole app in `main.tsx`). The JWT is kept in `localStorage`; on load, if a token exists, the app calls `GET /auth/me` to hydrate the current user (or clears the token if it's no longer valid). `ProtectedRoute` redirects to `/login` when there's no authenticated user.

## Pages

| Route | Page |
|---|---|
| `/` , `/businesses/:businessId` | Dashboard — combined or single-venture KPIs, recent entries, open invoices, shared access |
| `/businesses/:businessId/accounts`, `/accounts/:accountId` | Accounts — a venture can hold multiple accounts; view/add/edit/delete entries, upload an invoice to prefill one |
| `/businesses/:businessId/invoices`, `/invoices/new`, `/invoices/:id`, `/invoices/:id/edit` | Invoices — create, edit, revisit, and download past invoices as PDF |
| `/businesses/:businessId/reports`, `/reports` | Reports — pick a date range (presets or custom) for one venture (optionally one account) or combined across every venture; view on-screen or export CSV/PDF |
| `/businesses/:businessId/sharing`, `/shared-with-me` | Sharing — grant/revoke time-limited access to a venture |
| `/businesses/:businessId/settings` | Settings — venture name, currency (BDT/EUR/USD/CNY), logo, and bank/payment details used on invoices |

## Status

Phases 1–3 from planning are done: auth, business/venture management with multi-currency and multi-account support, bookkeeping, invoicing (create/edit/reopen), invoice upload-to-prefill, date-range reporting, dashboards, and sharing UI are all wired to the real API.

Not built yet (tracked on the API side — see `accounting-api`'s README): table-scoped sharing enforcement, Google OAuth/Drive (Stage 2), and cross-currency conversion in the combined dashboard/report.

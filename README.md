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
| Fonts | Plus Jakarta Sans (display + body), Roboto Mono (figures) — loaded via Google Fonts in `index.html`, tokens in `src/index.css` |

## Setup

Requires `accounting-api` running locally (see its README) — this app has no backend of its own.

```bash
npm install
cp .env.example .env
# VITE_API_URL should point at your local accounting-api (default http://localhost:3000)
npm run dev
```

Opens at `http://localhost:5173`. The API must have `CORS_ORIGIN` set to this origin (already the default in `accounting-api/.env.example`).

## Deployment (Docker / Coolify)

The `Dockerfile` has two stages: a Node build (`node:24-bookworm-slim`, `npm ci` + `npm run build`), then `nginx:alpine` serving `dist/` on port `80` with `nginx.conf`.

- **`VITE_API_URL` is a build argument.** Vite inlines it into the bundle, so it must be provided at build time (in Coolify: a build variable) and **changing it needs a rebuild**. The build fails if it is missing or empty. Trailing slashes are stripped.
  ```bash
  docker build --build-arg VITE_API_URL=https://api.exin-finance.sam-trek.com -t accounting-web .
  docker run --rm -p 8080:80 accounting-web
  ```
- **Port:** `80`.
- **SPA fallback:** unknown paths (e.g. `/businesses/abc/invoices`) serve `index.html`; missing files under `/assets/` return `404` instead.
- **Caching:** hashed files under `/assets/` are cached for a year (`immutable`); `index.html` is `no-cache`. Responses are gzip-compressed.
- **Headers:** `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, all in `security-headers.conf` (included by every location in `nginx.conf`). The CSP allows scripts from `'self'` only, Google Fonts for styles/fonts, `data:`/`blob:` images and `blob:` frames (logos, receipts, the PDF preview), and `connect-src` to the API origin. The Dockerfile derives that origin from `VITE_API_URL` at build time and fails the build if it is not an `http(s)://` URL. If you add a new external host (analytics, another font CDN, images), add it to `security-headers.conf` or the browser will block it.
- The API must list this site's exact origin in its `CORS_ORIGIN`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint source (`oxlint`) |
| `npm test` | Unit tests (`vitest`, pure `lib/` logic only) |

## Architecture

```
lib/            api-client.ts (typed fetch wrapper, JWT header injection),
                auth-context.tsx (auth state, token persistence),
                google-login.ts (Google login URL, error-code messages, token-from-fragment parsing),
                one file per resource (businesses, accounts, transactions,
                invoices, reports, dashboard, access-grants) — each exports
                typed TanStack Query hooks that wrap api-client
types/          TypeScript types mirroring accounting-api's response shapes
components/     Shared UI primitives (Button, TextField, Seal, ProtectedRoute)
                and per-feature panels under dashboard/, account/, orders/, costs/,
                import/, settings/, workspace/ (tabs, Posts-to-Cash-book dialog)
components/grid/ The schema-driven sheet used by Cash book, Orders, Costs and Invoices
                (inline edit, add-row, footers, tick-rows bar, paste from Excel)
lib/*-grid.ts   Pure rules of each grid (what an edited cell turns into); *-import.ts,
                import-plan.ts, workbook.ts: paste and .xlsx/.csv import (tested, no UI)
lib/tables.ts   Hooks of the table engine: tables, columns, rows, saved views, rules, templates,
                sheet import, the move of older Orders/Costs, the older-data status
lib/table-grid.ts, table-filters.ts, connections.ts   What a typed cell becomes, filter sentences, the map of how tables connect
lib/xl/         Reading a workbook with its formulas (read.ts), the Excel formula parser and its
                translation into our formula language (xl-formula, xl-translate), the analyser that
                finds tables, column types, links, function rows and Cash book rules (xl-analyze,
                xl-rules, xl-pipeline) and the plan the server builds from (xl-plan). Formulas are
                read as text and never run; the server checks every converted formula against the
                value the file saved
lib/trust.ts, export-formulas.ts   Activity, Trash and the lock date; export with formulas
components/tables/   The editor of one table (sheet, columns, formula editor, filters, function rows, rules dialog)
components/import/   Upload my sheet (choose file, review what it becomes and what was checked, create, undo)
components/trust/    Activity list, a table's history, Trash, close the books
routes/         One file per page
```

Auth state lives in `AuthProvider` (wraps the whole app in `main.tsx`). The JWT is kept in `localStorage`; on load, if a token exists, the app calls `GET /auth/me` to hydrate the current user (or clears the token if it's no longer valid). `ProtectedRoute` redirects to `/login` when there's no authenticated user.

## Pages

| Route | Page |
|---|---|
| `/` , `/businesses/:businessId` | Dashboard — combined or single-venture KPIs, recent entries, open invoices, shared access |
| `/businesses/:businessId/workspace` (also `/accounts/:accountId`) | Workspace — **every table of the business as a tab on top** (`?tab=<tableId>`): the **Cash book** (locked Balance, gold locked rows posted by other tables) and the user's own tables. A new business starts with the Cash book and an empty `Sheet1`, plus a getting-started card. **＋** makes a blank table, a ready-made one (Orders, Costs and Partners, Clients, Members, Appointments, Tenants and rent) or **Upload a sheet**. In a table: edit in the cell, add a row at the bottom, add columns (text, number, money, date, choice, tick, auto number, link, lookup, rollup, **formula**), function rows under the table, filters and saved views, **Posts to Cash book** rules, History, Excel with formulas. The older Orders and Costs tabs show only while a business still has data in them, with **Move into a new table**. Someone who was given only one table sees just that table (read-only unless they can edit). Phones get cards |
| `/businesses/:businessId/connections` | Connections — how the tables link to each other, and which tables post to the Cash book |
| `/businesses/:businessId/invoices`, `/invoices/new`, `/invoices/:id`, `/invoices/:id/edit` | Invoices — a sheet (number and amount locked, status inline, a draft's date and client editable); the form and detail pages create, edit, revisit and download invoices as PDF |
| `/businesses/:businessId/partner-payments` | Partner payments — who paid which cost group, shares, still due (sidebar item shows only when there are costs and partners) |
| `/businesses/:businessId/statement`, `/monthly` | Statement (grouped by category group) and Monthly view |
| `/businesses/:businessId/reports`, `/reports` | Reports — pick a date range (presets or custom) for one venture (optionally one account) or combined across every venture; view on-screen or export CSV/PDF |
| `/businesses/:businessId/sharing`, `/shared-with-me` | Sharing — grant/revoke time-limited access to the whole business or to **one table** |
| `/privacy`, `/terms` | Privacy Policy and Terms of Service — **public** (outside the auth guard, needed for Google's OAuth review). Text comes from the API (`GET /legal/:slug`), rendered by `routes/LegalPage.tsx`; `LegalFooter` links them (plus the external legal notice) on the login screen |
| `/login`, `/auth/callback` | Sign in / sign up — one page with a single "Continue with Google" button that navigates to `${VITE_API_URL}/auth/google`. The API sends the browser back to `/auth/callback#token=<jwt>`; `AuthCallbackPage` reads the token from the URL fragment, erases it from the address bar, stores it and goes to the dashboard. Failures arrive as `/login?error=<code>` (`access_denied`, `drive_permission_required`, `invalid_state`, `google_failed`). `/register` redirects to `/login`. |
| `/businesses/:businessId/settings` | Settings in tabs — General (name, currency, country, order prefix, logo, bank details), Partners (only while the older Partners list has people), Data (close the books, import, export, export with formulas, delete), Activity (who did what), Trash (restore tables, columns and rows for 30 days) |

## Status

Phases 1–3 from planning are done: auth, business/venture management with multi-currency and multi-account support, bookkeeping, invoicing (create/edit/reopen), invoice upload-to-prefill, date-range reporting, dashboards, and sharing UI are all wired to the real API.

Google is the only way to sign in or sign up (Stage 2, step 1); Drive storage is not built yet.

The table engine (V3) is built: your own tables, formula columns and function rows, links, rules, templates, **Upload a sheet** (rebuilds tables, formulas, links and rules and checks them against the numbers the file saved), export with formulas, table-scoped sharing, history, Trash and the lock date. The design is functional first; a visual polish pass is next.

Not built yet (tracked on the API side — see `accounting-api`'s README): Google Drive file storage, and cross-currency conversion in the combined dashboard/report.

A few older screens (Orders, Costs, Partners, the posting dialog) are still in the code until a business has moved its data with **Move into a new table**; they are to be removed after that is checked on dev.

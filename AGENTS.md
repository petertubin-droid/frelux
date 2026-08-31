# FRELUX — Base44 Dev Environment

## What this is
A Vite + React 18 + TypeScript frontend (construction cost estimation platform).
Backend is **Supabase** (external) — Postgres, Auth, Storage, Edge Functions.
Payments via **Paystack**; AI via OpenAI (server-side in Supabase edge functions).

## Running here
```
docker compose -f docker-compose.base44.yml up -d
```
- `web` service: `node:20-alpine`, bind-mounts the repo, runs `npm install` then `npm run dev -- --host 0.0.0.0`.
- Host port **3000** → container **5173** (Vite dev server).
- `node_modules` is an anonymous volume (kept isolated from the host).
- Vite HMR reflects edits live; no image rebuild needed for code changes.

## Secrets
The app **boots without credentials** — `src/lib/supabase.ts` falls back to a
placeholder Supabase client and logs a warning, so calculators/UI render, but
auth, marketplace, credits, and edge-function features stay unavailable.
Real secrets are delivered via `/run/base44/app.env` (platform-managed) and
override the placeholders in `.env.base44-defaults`. See `.base44/environment.json`
for the full list. The important ones:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — enable the backend.
- `VITE_PAYSTACK_PUBLIC_KEY` — payments.

## Notes / quirks
- `npm install` prints `git command not found` from the `husky` prepare script — harmless (no git in the alpine image); install still succeeds.
- `vite.config.ts` sets `server.host: true` + `allowedHosts: true` so the preview's external hostname is accepted.
- Sentry Vite plugin is only loaded when `SENTRY_AUTH_TOKEN` is set, so builds work without it.
- `VITE_APP_VERSION` is injected via `define` in vite.config.ts.

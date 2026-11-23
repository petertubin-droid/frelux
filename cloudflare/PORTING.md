# Porting edge functions to Cloudflare Workers

**Owner decision (2026-11-23):** every edge function runs on Cloudflare **except
the AI functions**, and any new edge function is built here first. Supabase stays
for Postgres, auth and storage; Cloudflare becomes the edge runtime.

## How the switch works

`cloudflare/src/functions/registry.ts` is the on-switch. The Worker checks it
before proxying:

- **registered** → the handler runs on the Worker (`cloudflare/src/functions/<name>.ts`)
- **not registered** → `/api/fn/:name` keeps proxying to
  `${SUPABASE_URL}/functions/v1/:name`, exactly as today

That is what makes a bad wave a rollback rather than an outage: an unported or
misbehaving function falls back to the path that already works.

## Inventory (audited 2026-11-23)

| Set | Count | Where it runs |
| --- | --- | --- |
| Total functions | 96 | — |
| AI functions (excluded) | 18 | Supabase (permanent) |
| Ported to the Worker | 2 | Cloudflare: `health`, `turnstile-verify` |
| Non-AI still to port | 76 | Supabase today, proxied |

AI exclusion set: the 16 `ai-*` functions plus `count-vision`, `support-chat` and
`frelix-api` (all call a model). `health` and `seo-search-console` mention AI
keys but do not call a model, so they are in scope.

## Waves

1. **Done** — `health`, `turnstile-verify`: no DB writes, no secrets beyond the
   ones the Worker already has.
2. **Public reads** — `price-index-api`, `sitemap`, `ec3-epd-lookup`,
   `verify-copy-get`, `client-identity`, `verify-rewarded-ad`,
   `grant-rewarded-unlock`. Needs `SUPABASE_SERVICE_ROLE_KEY` as a Worker secret
   for the service-role reads.
3. **Authenticated CRUD** — the bulk of the 76. Reuses the Worker's existing JWT
   introspection (`authMode: introspection` in `/health`); no new auth code.
4. **Payment webhooks last** — `paystack-webhook`, `escrow-webhook`,
   `flutterwave-webhook`, `btcpay-webhook`, `offerwall` postback. Each provider
   dashboard URL must be updated by the owner **before** that function moves, or
   confirmations stop silently. `HOOKS` in `cloudflare/src/api.ts` is where a
   provider is switched from "proxy" to "local".

## Recipe for one function

1. `cloudflare/src/functions/<name>.ts` exporting `<name>Config`
   (`{ name, methods, requiredBindings, handler }`).
2. Read config from `env` only. A missing binding returns an explicit 503, never
   a fabricated success.
3. Register it in `registry.ts`.
4. Test it in `cloudflare/src/functions/ported.test.ts` style: fake `env`, fake
   `fetch`, assert the refusal paths too.
5. Run `npx vitest run --project cloudflare` and
   `cd cloudflare && npx tsc --noEmit -p tsconfig.json`.

## What the owner must do (cannot be automated here)

- **Secrets:** `npx wrangler secret put <NAME>` for each binding a wave needs
  (`SUPABASE_SERVICE_ROLE_KEY`, provider keys, `WEBHOOK_SECRET`, …). A missing
  one is a runtime 503, by design.
- **Provider webhook URLs:** change each dashboard only when its wave is ready.
- **CPU budget:** the free tier's 10 ms CPU is too small for heavy functions;
  Workers Paid is required before waves 3–4.
- **Deploy:** `cd cloudflare && CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npx wrangler deploy`.

## Honest limits

- The AI functions stay on Supabase, so Supabase's function quota is reduced but
  not eliminated.
- Rate limiting in `runtime.ts` is per isolate, not global. It is a spam brake,
  not a quota.
- Nothing in this folder is part of the Vite app build; the Worker has its own
  typecheck and test project.

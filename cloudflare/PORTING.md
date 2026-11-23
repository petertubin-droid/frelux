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
| AI functions (excluded) | 19 | Supabase (permanent) |
| CPU-heavy (excluded) | 8 | Supabase (10 ms budget) |
| Ported to the Worker | 6 | Cloudflare |
| Still to port | 63 | Supabase today, proxied |

**Wave size: 7 functions.** A wave is small enough to review, test and roll
back, and large enough to make visible progress.

Ported so far: `health`, `turnstile-verify` (wave 1); `verify-rewarded-ad`,
`grant-rewarded-unlock`, `ec3-epd-lookup`, `price-index-api` (wave 2).

### The 10 ms rule

The Worker's free tier gives 10 ms CPU per request. A function whose own work
does not fit stays on Supabase — moving it would convert a working function into
a 1101 "exceeded CPU" error, which is worse than leaving it where it runs.
`SUPABASE_ONLY` in `registry.ts` records each such decision with its reason:
`pdf-studio-export`, `roof-view-imagery`, `price-intel-scan`,
`broadcast-campaign`, `price-digest`, `iot-ingest`, `translate-content`,
`sitemap`.

A name leaves that list only with a CPU measurement from `wrangler tail` on a
real request, never by optimism. I/O (a PostgREST call, an upstream API) does
not consume CPU budget, so data-heavy but compute-light functions like
`price-index-api` still port cleanly.

AI exclusion set: the 16 `ai-*` functions plus `count-vision`, `support-chat` and
`frelix-api` (all call a model). `health` and `seo-search-console` mention AI
keys but do not call a model, so they are in scope.

## Waves

1. **Done** — `health`, `turnstile-verify`: no DB writes, no secrets beyond the
   ones the Worker already has.
2. **In progress (4 of 7)** — done: `verify-rewarded-ad`,
   `grant-rewarded-unlock`, `ec3-epd-lookup`, `price-index-api`. Next three:
   `client-identity` (needs the 231-line shared identity handler ported onto
   PostgREST), `seo-search-console` (needs Google service-account JWT signing
   with Web Crypto), `verify-copy-get` (public read of the hosted copy). Needs
   `SUPABASE_SERVICE_ROLE_KEY` and `EC3_API_KEY` as Worker secrets.
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
- **CPU budget:** the free tier's 10 ms CPU is the hard gate, and **no Workers
  Paid plan is part of the plan** (owner rule, 2026-11-23). A function whose own
  work cannot fit 10 ms, or whose traffic would exceed the free 100k
  requests/day, stays on Supabase instead of being ported. `SUPABASE_ONLY`
  records each one with its reason; nothing on that list waits for an upgrade.
- **Deploy:** `cd cloudflare && CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npx wrangler deploy`.

## Honest limits

- The AI functions stay on Supabase, so Supabase's function quota is reduced but
  not eliminated.
- Rate limiting in `runtime.ts` is per isolate, not global. It is a spam brake,
  not a quota.
- Nothing in this folder is part of the Vite app build; the Worker has its own
  typecheck and test project.


## Wave 2 - complete (7 of 7)

| Function | Notes |
| --- | --- |
| `verify-rewarded-ad` | Still refuses to grant credits: a client callback is not proof of a view. |
| `grant-rewarded-unlock` | Same refusal contract, ported verbatim in intent. |
| `ec3-epd-lookup` | Transparent EC3 proxy; precise 503 when the key is unset. |
| `price-index-api` | PostgREST reads, 3-sample gate, median/MAD rule, 60s cache. |
| `verify-copy-get` | QR token to signed copy URL, lazy 3-day purge, fingerprint survives. |
| `client-identity` | GoTrue session check, Paystack bank resolve, name match imported from `_shared/name-match.ts` (single source of truth). |
| `seo-search-console` | Google Search Console; service-account RS256 JWT via Web Crypto, then OAuth refresh, then static token; `connected:false` when uncredentialed. |

Next wave (3): the authenticated CRUD bulk, in sevens, admitting only what fits
the free tier. Before it goes live: `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.

**Demotion path.** A ported function that measures over 10 ms CPU in
`wrangler tail` moves into `SUPABASE_ONLY` with the measurement as its reason;
the Worker then proxies that name to Supabase again and no other change is
needed. `AWAITING_CPU_MEASUREMENT` lists the ports still waiting for that first
sample (`ec3-epd-lookup`, `price-index-api`, `client-identity`,
`seo-search-console`); they stay ported only until a measurement says otherwise.

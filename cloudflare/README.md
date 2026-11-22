# FRELUX file Worker

Presigned Cloudflare R2 URLs plus edge serving for the two public buckets.

## Routes

| Route                  | Method | Purpose                                                                          |
| ---------------------- | ------ | -------------------------------------------------------------------------------- |
| `/health`              | GET    | Reports the bucket list and whether credentials are wired                        |
| `/presign/upload`      | POST   | Verifies the Supabase token, picks the object key, returns a short-lived PUT URL |
| `/presign/download`    | POST   | Signed GET for a private object, only inside the caller's own prefix             |
| `/public/:bucket/:key` | GET    | Immutable cached read for `avatars` and `brand-assets`                           |

## Rules the Worker enforces

- Uploads need no R2 access keys: the object is written through the binding, so
  only `SUPABASE_JWT_SECRET` is required to run this.
- Bucket allowlist with a per-bucket size cap and content-type allowlist.
- Key prefix is the JWT subject, so one user cannot read or overwrite another
  user's objects.
- Private buckets refuse a download for any key outside the caller's prefix.
- CORS answers only origins listed in `ALLOWED_ORIGINS`.

## Commands

```bash
cd cloudflare
npm install
npx wrangler dev                    # local, with the R2 bindings
npx wrangler secret put SUPABASE_JWT_SECRET
# optional: only to enable /presign/* (direct browser uploads for big files)
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler deploy
```

`npm run typecheck` runs `tsc` against `WebWorker` types only; the Worker is not
part of the Vite app build.

## Tests

The signing logic is unit tested with the app suite:

```bash
npx vitest run --project cloudflare
```

`presignR2Url` is checked against a signature produced by mhart/aws4 for the same
request, which proves the canonical request, key derivation and encoding rather
than merely re-running its own output.

## Deploy

The Worker deploys with a token that has Workers Scripts: Edit, Account Settings:
Read, and Workers Routes: Edit scoped to freluxtools.com. Deploys are blocked
without the account id, because the membership lookup rejects account-scoped
tokens:

```bash
cd cloudflare
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=2c2be9df09ee40a053f73d13d7479c8a npx wrangler deploy
```

## Edge read cache

`/api/fn/:name` passes through to Supabase, which still costs one invocation per
request, so it only helps by giving the browser a single origin. Names listed in
`CACHEABLE_READS` (cloudflare/src/api.ts) are answered from the edge cache on a
GET with no Authorization header, which costs no Supabase invocation at all.
A response carries `x-frelux-cache: hit` or `miss` so an edge hit is visible in
devtools. Add a name only when its GET response is public and slow-changing;
per-user responses must never join that map.

## Edge function migration (Supabase → Worker)

The Worker is also the migration target for the Supabase edge functions. The
gateway `ANY /api/fn/:name` answers from `src/functions/registry.ts` first and
only proxies to `${SUPABASE_URL}/functions/v1/:name` for names not in that
registry, so both platforms run side by side during the cutover and a port can
be rolled back by deleting one line.

**Ported so far (wave 1, public reads):**
- `health` — same contract as the Supabase function, `uptime_seconds` is the
  isolate age.
- `verify-copy-get` — PostgREST + Storage over plain fetch, no supabase-js in
  the bundle; lazy purge of expired copies preserved.

Secrets the ported functions read (set with `wrangler secret put`):
`SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEYS` as the newer JSON map),
`GEMINI_API_KEY`, `PAYSTACK_SECRET_KEY`.

**Waves still to come:** remaining public reads, then provider webhooks one at
a time (each provider URL must be repointed before its function moves), then
the AI functions. Rate limiting for native functions lives in
`src/functions/rate-limit.ts` and is Cache-API based: per-colo best effort,
documented upgrade path is a Durable Object per key.

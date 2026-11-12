# Cloudflare R2 storage and the file Worker

How FRELUX stores files on R2, what runs at the edge, and the exact steps to
switch each bucket over. Supabase stays the source of truth for auth, Postgres
and RLS; R2 only holds objects.

## What is in the repo

| Path                           | What it does                                                                |
| ------------------------------ | --------------------------------------------------------------------------- |
| `cloudflare/src/sigv4.ts`      | SigV4 presigning in pure Web Crypto, no dependencies                        |
| `cloudflare/src/index.ts`      | The Worker: presign upload/download, public object serving, JWT check, CORS |
| `cloudflare/wrangler.toml`     | Worker config and the five R2 bucket bindings                               |
| `src/lib/storage/r2.ts`        | Browser side: driver switch, size guard, presign then PUT                   |
| `cloudflare/src/sigv4.test.ts` | Known-answer signature tests                                                |
| `src/lib/storage/r2.test.ts`   | Adapter behaviour tests with a stubbed `fetch`                              |

## Before you deploy

1. **Cloudflare account ID.** Dashboard, R2 overview, right hand column.
2. **R2 API token.** R2 > Manage R2 API Tokens > Create: _Object Read & Write_,
   scoped to the five buckets below. This yields the access key ID and secret.
   It is not the same as a Cloudflare API token.
3. **Supabase JWT secret.** Project Settings > API > JWT secret. The Worker
   verifies HS256 tokens with it. If the project ever moves to asymmetric signing
   keys, this check must switch to JWKS verification, otherwise every upload will
   return 401.

## Create the buckets

```bash
cd cloudflare
npx wrangler r2 bucket create frelux-avatars
npx wrangler r2 bucket create frelux-brand-assets
npx wrangler r2 bucket create frelux-marketplace
npx wrangler r2 bucket create frelux-plan-documents
npx wrangler r2 bucket create frelux-pro-verification
```

Bucket names match the existing Supabase buckets so object keys survive a
straight copy.

## CORS on each bucket

A browser PUT to a presigned URL is cross-origin, so R2 must allow it. Save this
as `cors.json` and apply it to every bucket:

```json
[
  {
    "AllowedOrigins": [
      "https://freluxtools.com",
      "https://www.freluxtools.com",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

```bash
npx wrangler r2 bucket cors set frelux-avatars --file cors.json
```

Repeat for the other four, or paste the same policy in the dashboard under each
bucket's Settings > CORS Policy.

## Secrets and variables

Uploads are written through the R2 binding, so no storage secret is required. The
Worker has two ways to confirm a caller, and it tries the local signature first,
then falls back to asking Supabase:

| Configured                           | Behaviour                                                   |
| ------------------------------------ | ----------------------------------------------------------- |
| `SUPABASE_JWT_SECRET`                | HS256 verified inside the Worker, no round trip             |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` | `GET /auth/v1/user` on Supabase, works with asymmetric keys |
| both                                 | Local first, then Supabase if the signature does not match  |
| neither                              | Every upload is refused with 500                            |

Both public values are already set in `wrangler.toml`. The signing secret is
optional:

```bash
npx wrangler secret put SUPABASE_JWT_SECRET
```

The three R2 S3 secrets are optional. Set them only if you want `/presign/*`, which
lets the browser PUT a large file straight to R2 instead of streaming it through a
Worker:

```bash
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Those last two come from R2 > Manage R2 API Tokens, which is a different thing from
a Cloudflare API token (the token used to deploy the Worker cannot sign S3
requests). Until they exist `/presign/*` answers 501 and the app uses the binding.

`ALLOWED_ORIGINS` and `PUBLIC_BASE_URL` are plain vars in `wrangler.toml`.

## Custom domain

`wrangler.toml` routes the Worker at `files.freluxtools.com`. The `custom_domain`
route requires the `freluxtools.com` zone to be active on Cloudflare. If DNS is
still elsewhere, deploy without the route, keep the `workers.dev` hostname, and
set `VITE_R2_WORKER_URL` to that hostname in the meantime. Neither R2 nor the
Worker requires moving DNS.

## Deploy

```bash
cd cloudflare
npm install
npx wrangler deploy
curl https://files.freluxtools.com/health
```

`/health` answers with the bucket list and `configured: true` once the two R2
credentials are present.

## Switch the app over

Add to the app environment, then rebuild:

```bash
VITE_R2_WORKER_URL=https://files.freluxtools.com
VITE_STORAGE_DRIVER=r2
```

`storageDriver()` returns `supabase` whenever either value is missing, so a
half-provisioned environment cannot break uploads. It falls back safely in a
preview deploy too.

Call sites currently on Supabase storage, in cutover order (smallest blast radius
first):

| Bucket             | Module                                    |
| ------------------ | ----------------------------------------- |
| `avatars`          | `src/lib/pro-connect.ts`                  |
| `brand-assets`     | `src/lib/brand-studio.ts`                 |
| `marketplace`      | `src/lib/marketplace.ts`                  |
| `plan-documents`   | `src/lib/plan-vision/persistence.ts`      |
| `pro-verification` | `src/lib/contractor.ts`, private receipts |

Each one moves from `supabase.storage.from(bucket).upload(...)` to
`uploadToR2({ bucket, file, accessToken })`, which POSTs the file to the Worker and
returns `{ bucket, key, publicUrl }`. Store `key` in the same column that holds the Supabase path today;
for public buckets the URL is `publicUrl`, for private ones call
`createR2DownloadUrl` at read time.

## Moving existing objects

`rclone` handles Supabase Storage (S3-compatible endpoint) to R2:

```bash
rclone copy supabase:frelux-avatars r2:frelux-avatars --progress
rclone check supabase:frelux-avatars r2:frelux-avatars
```

Object keys are preserved, so stored paths keep working after the switch.

## Limits worth knowing

- The Worker caps each bucket: avatars 5 MB, brand assets 10 MB, marketplace
  25 MB, plan documents 50 MB, pro verification 20 MB. Raise a cap in both
  `BUCKETS` (Worker) and `BUCKET_LIMITS` (browser) together.
- Presigned URLs last 15 minutes for uploads, 5 minutes for downloads, clamped
  to one hour.
- No rate limiting in the Worker. Add a Durable Object or a KV counter if abuse
  appears; the JWT check already stops anonymous use.
- R2 egress is free, which is the reason this is cheaper than serving plans and
  receipts from the database host.

## What this does not touch

- Supabase Auth, Postgres and RLS: unchanged.
- `pg_cron` jobs, including `archie-maintenance-hourly` calling across into the
  ARCHIE project: unchanged, because this Worker only handles files. If a
  function later moves to Workers, its cron target must be repointed or the job
  fails silently.
- ARCHIE's own storage decisions: this is a FRELUX change only.

## Rollback

Unset `VITE_STORAGE_DRIVER` (or set it to `supabase`) and rebuild. Objects already
written to R2 stay there; nothing else depends on the Worker.

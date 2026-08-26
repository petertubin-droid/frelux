# FRELUX API Documentation

## Supabase Backend

Frelux uses Supabase (PostgreSQL + Auth + Storage) as its backend.

### Base URL

All database operations go through the Supabase client configured in `src/lib/supabase.ts`.

### Authentication

- **Email/Password**: `supabase.auth.signInWithPassword({ email, password })`
- **Email OTP**: `supabase.auth.signInWithOtp({ email })`
- **Phone OTP**: `supabase.auth.signInWithOtp({ phone })` → `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
- **OAuth**: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **Session**: Persisted automatically by `@supabase/supabase-js`

### Database Tables

#### Core Tables

| Table                 | Description                          | RLS            |
| --------------------- | ------------------------------------ | -------------- |
| `profiles`            | User profiles (extends `auth.users`) | Yes            |
| `pro_profiles`        | ProConnect professional profiles     | Yes            |
| `pro_categories`      | Service categories                   | No (read-only) |
| `pro_services`        | Services offered                     | Yes            |
| `pro_locations`       | Service areas                        | Yes            |
| `projects`            | User construction projects           | Yes            |
| `measurements`        | Project measurements/takeoffs        | Yes            |
| `paint_colors`        | Paint color database                 | No (read-only) |
| `paint_families`      | Color families                       | No (read-only) |
| `credit_wallets`      | User credit wallets                  | Yes            |
| `credit_transactions` | Credit history                       | Yes            |
| `reward_items`        | Reward catalogue                     | No (read-only) |
| `reward_redemptions`  | Reward redemption history            | Yes            |
| `ad_events`           | Ad interaction tracking              | Yes            |

### Query Patterns

```typescript
// Read with filter
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

// Insert
const { data, error } = await supabase
  .from("projects")
  .insert({ name, building_type, user_id: userId })
  .select()
  .single();

// Update
const { data, error } = await supabase
  .from("projects")
  .update({ status: "completed" })
  .eq("id", projectId);

// Delete
const { error } = await supabase.from("projects").delete().eq("id", projectId);
```

### Storage

- **Material images**: `supabase.storage.from('materials')`
- **Project plans**: `supabase.storage.from('plans')`
- **User avatars**: `supabase.storage.from('avatars')`

### Realtime

```typescript
// Subscribe to project changes
supabase
  .channel("projects")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "projects" },
    callback,
  )
  .subscribe();
```

### Client SDK

The app uses a typed wrapper in `src/lib/api/` that provides:

- `EntityName.list()` — list all records
- `EntityName.get(id)` — get single record
- `EntityName.create(data)` — create record
- `EntityName.update(id, data)` — update record
- `EntityName.delete(id)` — delete record
- `EntityName.filter(params)` — filtered query

### Rate Limits

Supabase applies rate limits on:

- Auth endpoints: 120 requests/minute
- REST API: 200 requests/minute per connection
- Storage: 100 uploads/minute

### Error Handling

All API calls return `{ data, error }`. The app uses a centralized error boundary and Sentry for production error reporting.

---

## Edge Functions

Supabase Edge Functions (Deno) handle server-side logic that needs secrets or elevated privileges — AI calls, payments, and anything client code shouldn't hold keys for. All functions live in `supabase/functions/`, deploy via `supabase functions deploy <name>`, and are reachable at:

```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

### Authentication

By default, every Edge Function requires a valid Supabase JWT (`Authorization: Bearer <access_token>`), enforced by `verify_jwt` in `supabase/config.toml`. Three functions are explicitly public because they're called before a session exists or by an external webhook:

| Function | Why `verify_jwt = false` |
| --- | --- |
| `paystack-checkout` | Called at checkout, before/without an authenticated session in some flows |
| `paystack-verify` | Called on redirect back from Paystack |
| `paystack-webhook` | Called server-to-server by Paystack, authenticated via webhook signature instead |

### Rate Limiting

Public-facing functions use the shared in-memory limiter in `supabase/functions/_shared/rate-limit.ts` (`checkRateLimit(key, { maxRequests, windowMs })`, per Deno isolate). AI and credit-spending functions apply this to prevent abuse.

### Function Reference

| Function | Method(s) | Auth | Purpose |
| --- | --- | --- | --- |
| `health` | GET | Public via JWT default* | Health check — returns `healthy`/`degraded`/`down` plus DB, AI provider, and payment sub-checks |
| `report-error` | POST | JWT | Ingests client error reports with validation, rate limiting, and fingerprint-based deduplication |
| `cleanup-old-errors` | POST | JWT (cron/admin) | Deletes old resolved errors on a retention schedule; keeps unresolved critical errors indefinitely |
| `record-activity` | POST | JWT | Records user activity events (used for engagement/analytics) |
| `award-credits` | POST | JWT | Awards AI/feature credits to a user's wallet |
| `spend-ai-credits` | POST | JWT | Debits AI credits for a metered AI feature call |
| `redeem-reward` | POST | JWT | Redeems a reward-catalogue item using a user's credit balance |
| `verify-rewarded-ad` | POST | JWT | Verifies a rewarded-ad impression before granting a reward |
| `grant-rewarded-unlock` | POST | JWT | Grants a temporary feature unlock after a verified rewarded ad |
| `rewarded-postback` | GET, POST | Public (ad network postback) | Server-to-server postback endpoint for ad network reward confirmation |
| `ai-building-estimation` | POST | JWT | Analyzes a building photo via Google Gemini Vision, then runs the Build-to-Roof estimation engine |
| `ai-color-consult` | GET, POST, PUT, DELETE | JWT | AI color consultation assistant |
| `ai-color-preview` | GET, POST | JWT | Generates AI color preview renders |
| `ai-learn-assistant` | GET, POST, PUT, DELETE | JWT | AI assistant for the Learn Hub |
| `ai-livechat` | GET, POST, PUT, DELETE | JWT | AI-powered live chat support |
| `ai-project-assistant` | GET, POST | JWT | AI assistant for project planning/estimation |
| `ai-studio` | GET, POST, PUT, DELETE | JWT | AI Studio orchestration (color recommendations, monetized AI features) |
| `moderate-pro-message` | POST | JWT | OpenAI-based moderation of Pro Connect client↔professional messages (spam/scam/harassment) |
| `moderate-worker-message` | POST | JWT | AI moderation of worker-channel messages (spam, offensive content, misinformation) |
| `market-intelligence-crawl` | POST | JWT (admin) / cron | Runs price crawls (manual, scheduled via pg_cron, or test-mode with no publish) |
| `paystack-checkout` | POST | **Public** | Initializes a Paystack transaction; holds `PAYSTACK_SECRET_KEY` server-side |
| `paystack-verify` | POST | **Public** | Verifies a completed Paystack transaction and activates the subscription |
| `paystack-webhook` | POST | **Public** (signature-verified) | Receives Paystack payment events and auto-activates subscriptions |
| `send-push-notification` | POST | JWT | Sends a Web Push notification via VAPID keys to a user's subscriptions |
| `send-sms-otp` | POST | JWT | Sends an SMS OTP via the Termii gateway (backs the `send_mobile_otp` RPC) |
| `sitemap` | GET | Public | Serves the dynamically generated sitemap |

\* `health` defaults to requiring a JWT like other functions unless configured otherwise — treat it as internal/monitoring-only, not a public uptime endpoint, unless you've explicitly set `verify_jwt = false` for it.

### Request/Response Shape

Most functions follow a common Deno pattern — see any file under `supabase/functions/<name>/index.ts` for the exact request/response schema, since payloads are function-specific:

```typescript
Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  // ... validate method, parse body, run logic ...
  return jsonResponse({ ...result }, 200); // or an error status
});
```

Errors are returned as `{ error: string }` with a non-2xx status. CORS headers are applied via the shared helper in `supabase/functions/_shared/cors.ts`.

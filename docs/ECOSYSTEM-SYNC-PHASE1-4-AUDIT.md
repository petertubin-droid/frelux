# Ecosystem synchronisation: audit of Phases 1 to 4

Measured against the repository at `dcc89b4a` and the production database
`freluxproject` (`nfgaaohweygwydoelxnf`) on 2026-11-01. Every claim below was
produced by a query or a command run in that session; documentation was not
treated as evidence.

## Verdict

Phases 1 to 4 are **not complete**. Phase 1 is partly enforced, Phase 2 is
partly reconciled, Phase 3 is not implemented as a single gateway, and Phase 4
measures coverage honestly but has no coverage dashboard and no verified
market coverage at all.

| Phase                       | Claimed | Actual                                                                                                   |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| 1. Security and reliability | done    | **Partial.** Anonymous price writes were still open; one crawl route unauthenticated                     |
| 2. Canonical engines        | done    | **Partial.** Duplicate ids rejected and an alias manifest exists, but three registries still feed the UI |
| 3. Pricing gateway          | done    | **Not done.** No single resolver with the required evidence ladder and 16-field response                 |
| 4. Market coverage          | done    | **Partial.** Honest numbers exist, no dashboard, zero markets verified                                   |

---

## Phase 1: security and reliability

### 1.1 Price RPC protection: FAILED, now patched in code

Measured with `has_function_privilege('anon', ...)` against production. Ten
functions were still executable by anonymous visitors:

| Function                        | Writes                   | anon before |
| ------------------------------- | ------------------------ | ----------- |
| `apply_market_material_prices`  | `estimation_prices`      | true        |
| `refresh_market_material_price` | `market_material_prices` | true        |
| `mark_stale_market_prices`      | price staleness          | true        |
| `dispatch_market_scans`         | scan runs                | true        |
| `close_stale_scan_runs`         | scan runs                | true        |
| `log_estimation_price_change`   | audit log                | true        |
| `store_social_token`            | tokens                   | true        |
| `approve_verification`          | supplier verification    | true        |
| `market_scan_overview`          | read                     | true        |
| `get_price_update_summaries`    | read                     | true        |

The earlier hardening migration `20261031160000` covered five different
functions. Its `log_estimation_price_change` revoke did not survive: the
function was redefined afterwards and the grant was re-established, which is
exactly the drift the directive warns about.

`apply_market_material_prices` is `SECURITY DEFINER`, has an unpinned
`search_path`, contains no role check, and rewrites `estimation_prices` for
every market when called with no argument. Anonymous reachability meant any
visitor holding the public anon key could rewrite the price book.

Remediation written: `supabase/migrations/20261101030000_harden_price_writer_grants.sql`.
Eight functions are locked to `service_role`, three keep `authenticated`
because the admin UI calls them. Callers were checked before each revoke, so no
working path loses access. The migration was dry-run inside a transaction that
was rolled back; the grants are unchanged in production until it is applied.

`approve_verification` does carry a correct internal guard (`public.is_admin()`),
so its exposure was grant sloppiness rather than an open door.

### 1.2 Scheduled crawler protection: FAILED, now patched in code

`market-intelligence-crawl` accepted `?schedule=true` and ran a full crawl with
no credential of any kind. A public query parameter is not authorisation.

Remediation written: the scheduled branch now requires either the service-role
bearer or a token registered in `public.price_intel_tokens`, matching the
pattern `price-intel-scan` already uses. Verified that no `pg_cron` job calls
this route (the weekly job posts to `price-intel-scan`), so nothing breaks.

`market-index-scan` was already protected by an `x-intel-token` lookup and is
unchanged. `price_intel_tokens` has RLS enabled with zero policies, so the
token cannot be read through PostgREST even with the anon grant on the table.

### 1.3 Project Agent exactly-once: PASSED

`src/lib/project-agent/execute.ts` claims with a conditional write:

```ts
.update({ state: "executed" })
.eq("id", action.id)
.eq("state", "approved")
.select("id").maybeSingle();
```

The losing request affects zero rows and returns `already_claimed` before any
project write. Pre-flight cancellation runs first, freshness is revalidated
against recorded state, writes are re-read to verify, and the claim state is
terminal only to `verified` or `failed`. `src/lib/project-agent/security.test.ts`
covers duplicate execution. This satisfies the directive.

### 1.4 Global RBAC: PARTIAL

`rls_force_rls_all_tables` and `rbac_rpc_escalation_hardening` are applied.
`src/lib/rbac/security-posture.test.ts` asserts posture. Not audited here: every
storage policy and every cross-workspace boundary. That is a separate pass and
is listed as remaining work.

### 1.5 Security tests: PARTIAL

Present: `project-agent/security.test.ts`, `rbac/security-posture.test.ts`.
Missing as automated tests: unauthorized price publication, unauthorized
supplier verification, unauthorized campaign management, privileged RPC
access, service-role exposure. These are currently verified by query, not by
CI, which is why the anon grants above went unnoticed after a function was
redefined.

### Search path

170 `SECURITY DEFINER` functions in `public`, 43 without a pinned
`search_path` (the earlier review recorded 34). Blanket pinning would break
functions resolving `pgcrypto` or `pg_cron` symbols from `extensions`, so this
needs per-function verification rather than a sweep.

---

## Phase 2: canonical engine ecosystem

- Duplicate engine ids are now refused: `registerEngine` throws
  `DuplicateEngineIdError` for a different title under a taken id.
- `src/lib/ai-foundation/engine-canonical.ts` is an **alias manifest**, not the
  canonical manifest the directive asks for. It maps AI engine ids to
  international capability ids, with 7 verified links and 2 explicit
  unsolved ids (`painting_wall_area`, `timeline_estimator`).
- It does not carry version, input schema, output schema, units, markets,
  material catalogue, pricing dependency, or verification and test status.
- `src/components/admin/AdminEngineMatrix.tsx` still reads
  `src/lib/international/engine-inventory`, not the canonical manifest. Three
  descriptions of the same engines still exist, so the matrix can still show an
  engine the AI layer cannot execute.
- `docs/PHASE4-CALCULATOR-ENGINE-MATRIX.md` measures the real gap honestly:
  only 5 of 19 calculator pages reference a canonical engine id, and 14 compute
  through local estimation libraries. Those pages work; they are simply not
  routed through the registry.

Phase 2 is therefore reconciled at the identity level only.

---

## Phase 3: authoritative pricing gateway

- There is no single resolver. Price logic is spread across
  `src/lib/price-index/resolver.ts`, `src/lib/international/pricing-resolver.ts`,
  `src/lib/international/hybrid-pricing-engine.ts`,
  `src/lib/estimation/market-materials.ts`, `src/lib/price-index/calculator-prices.ts`
  and others.
- 10 non-test modules read `estimation_prices` directly and 3 read
  `market_material_prices` directly, bypassing any resolver.
- `price-index/resolver.ts` implements a two-tier ladder (selected city, then
  national, clearly labelled) and returns status, price, basis, sample size,
  confidence, observation date, unit, city and an indicative flag. That is a
  good foundation but it is not the required contract: no brand, specification,
  grade, package size, delivery basis, currency, source URL, fallback reason or
  warnings, and only two of the seven evidence tiers.
- No price cache invalidation was found on approved-price changes in
  `src/lib/price-index` or `src/lib/estimation`.

Phase 3 needs a gateway built on the existing resolver, not a new database.

---

## Phase 4: market and material coverage

Measured in production:

| Measure                                    | Value |
| ------------------------------------------ | ----- |
| Markets with active `estimation_prices`    | 40    |
| Markets with scan settings configured      | 32    |
| Markets with any `market_material_prices`  | 3     |
| Markets with a **verified** material price | **0** |
| Total `market_price_observations` rows     | 15    |
| `open_api` sources registered              | 5     |

So configured coverage is 32 markets and real verified coverage is zero
markets. Any surface that presents 32 markets as price-covered is wrong, and
the directive's honesty rule applies directly.

No coverage dashboard exists with the required columns (products discovered,
mapped, observations, approved prices, last successful scan, missing materials,
coverage percentage). `src/lib/pricing/catalogue-coverage.ts` computes staged
versus mapped catalogue coverage, which is one slice of it.
`AdminMarketIntelligence` and `AdminMarketPrices` exist but do not present the
per-market coverage table the directive specifies.

---

## What changed in this pass

1. `supabase/migrations/20261101030000_harden_price_writer_grants.sql`, locks
   eight privileged functions to `service_role` and removes anonymous access
   from three more. Dry-run and rolled back; **not applied to production**.
2. `supabase/functions/market-intelligence-crawl/index.ts`, the scheduled
   branch now requires a scheduler credential. Lint and typecheck clean;
   **not deployed**.

Both need the owner's explicit approval to reach production, per rule 18.

## Remaining, in priority order

1. Apply the grant migration, then re-run the post-condition query and confirm
   `anon_exec = false` across all eleven functions.
2. Deploy the crawl function change.
3. Add CI-visible tests for privileged RPC reachability so a redefined function
   cannot silently restore a PUBLIC grant again. This is the root cause of the
   regression above.
4. Add `public.is_admin()` guards to `market_scan_overview`,
   `get_price_update_summaries` and `refresh_market_material_price`.
5. Build the canonical manifest with schemas, units, markets and pricing
   dependency, and generate the inventory, capability matrix and admin matrix
   from it.
6. Build the pricing gateway on `price-index/resolver.ts` with the full
   evidence ladder and response contract, then migrate the 13 direct readers.
7. Build the market coverage dashboard on measured data, showing 0 verified
   markets until evidence exists.
8. Pin `search_path` on the 43 unpinned writers in dependency-grouped batches.

---

## Applied and verified, 2026-11-01 09:05 to 09:15 UTC

### Grant migration: applied

`20261101030000_harden_price_writer_grants.sql` was applied to production and
recorded in `supabase_migrations.schema_migrations`.

Post-condition re-queried, all eleven functions:

| Function                        | anon | authenticated        | service_role |
| ------------------------------- | ---- | -------------------- | ------------ |
| `apply_market_material_prices`  | no   | no                   | yes          |
| `apply_community_prices`        | no   | no                   | yes          |
| `mark_stale_market_prices`      | no   | no                   | yes          |
| `dispatch_market_scans`         | no   | no                   | yes          |
| `close_stale_scan_runs`         | no   | no                   | yes          |
| `refresh_market_material_price` | no   | no                   | yes          |
| `log_estimation_price_change`   | no   | no                   | yes          |
| `store_social_token`            | no   | no                   | yes          |
| `approve_verification`          | no   | yes (is_admin guard) | yes          |
| `market_scan_overview`          | no   | yes                  | yes          |
| `get_price_update_summaries`    | no   | yes                  | yes          |

Violations: 0. Cron still works: `postgres` owns both scan functions and
retains EXECUTE, and `close-stale-scan-runs` continued to report `succeeded`.
`price-intel-scan` calls `refresh_market_material_price` with the service client
and is unaffected.

### Crawl function: deployed and tested

`market-intelligence-crawl` deployed (version 19). `verify_jwt` was set to false
so the scheduler credential, not a gateway JWT, is the gate, matching the
pattern `price-intel-scan` already uses. Behaviour:

| Request                         | Result                                                      |
| ------------------------------- | ----------------------------------------------------------- |
| `?schedule=true`, no credential | 401 scheduler credential required                           |
| `?schedule=true`, bogus token   | 401 scheduler credential required                           |
| `?schedule=true`, valid token   | 200 `{"message":"No sources due for crawling","sources":0}` |
| admin POST, no session          | 401 (unchanged)                                             |

### New finding: the crawl pipeline has no sources

`public.mi_sources` contains **0 rows**. The scheduled crawl reports "no sources
due" because nothing is registered, so no market intelligence has ever been
collected through this path. Combined with the coverage numbers above (15
observations, 0 verified markets), the crawl engine is structurally complete
and operationally inert. Registering sources is a data task, not a code task,
and it has to be done before any market coverage claim is honest.

### Reachability sweep of every open function

73 functions run with `verify_jwt = false`. Each was inspected for its own
guard. Seven had no `Authorization` header check, and all seven use a different
correct mechanism: `paystack-webhook` (HMAC signature), `ayet-rewarded-callback`
(S2S signature), `newsletter-unsubscribe` (signed token), `iot-ingest` (api key
hash with constant-time compare plus consent gate), `price-index-submit`
(public submission behind rate limiting), `price-index-api` (public read), and
`project-evidence-link` (server-side membership check with 120 second signed
links). No unauthenticated write path was found beyond the crawl route fixed
above.

---

## The full anonymous-exposure sweep, 2026-11-01 09:40 to 10:30 UTC

The eleven-function fix above was chosen from a written list. Running the same
check against the whole catalog instead found the real extent: **85 SECURITY
DEFINER functions in `public` were executable by anon**, 27 of which write and
check no identity.

The worst of them, all reachable with the public anon key:

| Function                            | What an anonymous visitor could do               |
| ----------------------------------- | ------------------------------------------------ |
| `apply_subscription_purchase`       | grant a paid plan to any user id                 |
| `credit_token_purchase`             | mint tokens                                      |
| `award_ad_credits`                  | mint ad credits                                  |
| `award_offerwall_credits`           | mint offerwall credits                           |
| `spend_credits` / `redeem_reward`   | move or redeem any balance                       |
| `refresh_subscription_local_prices` | rewrite subscription prices from a jsonb payload |
| `unlock_ai_feature_via_ad`          | unlock paid features without an ad               |
| `api_wallet_for`                    | read any user's wallet                           |
| `ensure_user_default_workspace`     | create workspaces for any user id                |
| `diaspora_notify`                   | notify any project                               |

Four migrations were applied and recorded:

1. `20261101040000_privileged_grant_monitor.sql`, records reachable functions
   hourly into `public.security_grant_findings` (detection only, never mutates
   grants; an event trigger is impossible because `postgres` is not superuser).
2. `20261101050000_restrict_privileged_anon_exec.sql`, locks 35 functions to
   `service_role` and three to `authenticated`, each after confirming it has no
   client caller.
3. `20261101060000_refine_grant_monitor.sql`, stops the monitor flagging
   functions whose body already raises unless the caller is an admin.
4. `20261101070000_close_guest_credit_task.sql`, removes anon from
   `complete_credit_task`, which mints credits on a client-supplied user id.

Measured before and after, same query:

| Measure                                 | Before | After |
| --------------------------------------- | ------ | ----- |
| SECURITY DEFINER functions anon can run | 85     | 46    |
| ...that write tables                    | 27     | 3*    |
| ...that write and check no identity     | 27     | 1     |

\* the three are the public view counters, which are meant to be anonymous.

The remaining 46 are deliberate public surfaces (nearby search, marketplace
search, shared estimate links, published translations, community size, contact
form rate limiting) or functions whose body already refuses non-admins.

### CI guard

`scripts/check-privileged-grants.py` runs in CI before the unit tests. It fails
when a migration recreates a protected function after the migration that locked
it, which is precisely how `log_estimation_price_change` came back open. Proven
against a deliberate regression: adding a `create or replace function
public.spend_credits` after the lock fails the check with the function name and
both versions.

### Still open

`complete_credit_task` is authenticated-only now but still awards credits for a
client-supplied `p_user_id`, so a signed-in user can mint for another account.
The hourly monitor records it as a finding. Closing it means recreating the
body with an `auth.uid()` check, which changes a working rewards flow and is
the next security task.

---

## Closing the credit gap, 2026-11-01 10:00 to 10:25 UTC

`complete_credit_task` now credits only the caller. The guard compares
`p_user_id` with `auth.uid()` and returns `not_authorized` when they differ,
unless the caller is `service_role`. `search_path` is pinned on the function as
well.

Verified against production with JWT claims set inside a rolled-back
transaction, four cases:

| Caller                          | Result           |
| ------------------------------- | ---------------- |
| signed in, own user id          | `success: true`  |
| signed in, another user's id    | `not_authorized` |
| no session                      | `not_authorized` |
| service role, another user's id | `success: true`  |

Testing the guard exposed two older defects that made the rewards feature
unusable, both unrelated to the security work:

1. **Overload collision.** `complete_credit_task`, `award_offerwall_credits` and
   `redeem_reward` each existed twice with reordered parameters, so PostgREST
   answered the client call with `PGRST203` and HTTP 300. The rewards UI could
   never award anything. The duplicate older overloads were dropped after
   confirming no client, edge or SQL caller.
2. **Invalid credit type.** `credit_transactions.type` allows only `earn`,
   `spend` and `admin_adjust`, while `complete_credit_task` and
   `award_ad_credits` inserted `bonus`, so even a resolved call raised 23514 and
   rolled back. Both now insert `earn`.

All three functions now resolve cleanly and return `permission denied` to anon
instead of an ambiguity error.

The monitor marks the finding resolved rather than deleting it:
`security_grant_findings.resolved_at` is stamped when a later audit no longer
detects the condition, so the table stays a live list with history. After this
change the audit inserts 0 new findings and resolves `complete_credit_task`.

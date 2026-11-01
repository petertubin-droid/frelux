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

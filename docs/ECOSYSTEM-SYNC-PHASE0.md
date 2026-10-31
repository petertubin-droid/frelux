# FRELUX ecosystem synchronisation, Phase 0 findings

Measured on the repository at commit 9f5d32b5, 2026-10-31. Every number below
came from a command run against the working tree, not from documentation. Where
I could only measure part of a question, the limit is stated.

## What actually exists

| Surface                                                   | Measured   |
| --------------------------------------------------------- | ---------- |
| Routes declared in `src/App.tsx`                          | 327        |
| Calculator and estimator pages                            | 85         |
| AI engine registry (`src/lib/ai-foundation/engines-*.ts`) | 17 engines |
| Capability registry entries                               | 56         |
| Engine inventory entries                                  | 57         |
| Supabase edge functions                                   | 72         |
| Migrations                                                | 614        |
| Test files                                                | 1,087      |
| Modules touching price tables                             | 12         |

The platform is large, working, and not short of features. What it lacks is
reconciliation between the parts.

## Finding 1: three engine inventories disagree

The AI registry holds 17 engines. The capability registry holds 56 entries. The
engine inventory holds 57. These are three descriptions of the same thing and
none of them is generated from the others, so the admin matrix can show an
engine the AI layer cannot execute, and vice versa.

The directive asks for one canonical manifest. That is the correct fix, and the
first step is deciding which of the 17 registered engines, 56 capabilities and
57 inventory rows are the same engine under different names.

## Finding 2: duplicate engine IDs are silently accepted

`registerEngine` in `engines-registry.ts` is:

```ts
export function registerEngine(descriptor: EngineDescriptor): void {
  REGISTRY.set(descriptor.id, descriptor);
}
```

`Map.set` overwrites without complaint. Two modules registering `roof_geometry`
would leave whichever imported last as the authority, with no error and no
record. The directive explicitly requires rejecting duplicate IDs. There are no
duplicates today (17 defined, 17 unique), so this is a guard against a future
failure rather than a live bug, and it is a small, safe change.

## Finding 3: no single price gateway

Twelve non-test modules read or write price data: `estimation/queries.ts`,
`estimation/market-materials.ts`, `estimation/price-scanner.ts`,
`estimation/structural-market.ts`, `estimation/mineral-stone-engine.ts`,
`estimation/tyrolene-config.ts`, `price-index/queries.ts`,
`suppliers/index-bridge.ts`, `wallfinishing/prices.ts`,
`ai-foundation/engine-pricing.ts` and two engine modules.

Each resolves prices against its own table mix. Some read `estimation_prices`,
some `market_material_prices`, some `market_price_observations`. My own work
today shows the consequence: correcting one GB price meant writing to
`estimation_prices` and discovering that the scanner classified provenance from
`notes` while corrections wrote `price_source`. One resolver with one response
shape would have made that impossible.

## Finding 4: privileged functions need a grant audit

- 66 migration files define `SECURITY DEFINER` functions.
- 26 of those function names relate to price, scan, crawl, promote, publish or
  supplier.
- 7 migrations grant `EXECUTE` on a function to `anon` or `PUBLIC`.

Each of those 7 is a candidate for Phase 1 review. Some will be legitimately
public, such as a read-only index query. A price publication function reachable
by `anon` is a different matter, and I have not yet read all 7 to tell them
apart. This is the highest-priority open question in the audit.

## Finding 5: the scheduled crawlers do not share one authorization gate

Nine edge functions relate to crawling or price intelligence. Only one function
in the whole repository gates on an explicit cron secret
(`frelix-wallet-autotopup`, via `x-frelux-cron-secret`). The market and price
crawlers instead rely on `getUser` checks or on JWT configuration.

Configuration state, read from `supabase/config.toml`:

| Function             | `verify_jwt` | In-function authorization      |
| -------------------- | ------------ | ------------------------------ |
| `price-index-submit` | false        | not found                      |
| `price-index-api`    | false        | not found                      |
| `price-index-review` | true         | admin role checked in the body |

`price-index-review` is done correctly: it reads the caller's profile and
refuses anything that is not `admin`. The two `verify_jwt = false` functions
need reading line by line before I can say whether that is a deliberate public
surface (a submission endpoint should be public) or an unguarded write. I am
not going to characterise them as a vulnerability before reading them.

## Finding 6: what is genuinely solid

Not everything needs rebuilding, and the directive says not to replace working
engines.

- The engineering layer is real: 11 markets hardened, formulas pinned against
  published anchors, 2,361 green tests, precision enforced at execution.
- `src/lib/project-agent/` exists with `execute.ts` and dedicated
  `execute.test.ts`, `security.test.ts`, `e2e.test.ts`. Whether the execution
  claim is atomic is the Phase 1 question, and the tests are the place to find
  the answer.
- The price-honesty layer already refuses to claim verified coverage it cannot
  evidence, which is the cultural precondition for everything else in this
  directive.

## Sequencing I recommend

Phase 1 first, because it is the only phase where the current state can cost
someone money or data: read the 7 anon-granted functions, read the two
`verify_jwt = false` functions, audit the project-agent claim, and add the tests
the directive lists. No user-visible change.

Phase 2 second, and cheap: reject duplicate engine IDs, then build the canonical
manifest from the 17 registered engines and reconcile the 56 and 57 against it.
This unlocks the admin matrix and the engine inventory being trustworthy.

Phase 3 third, and the largest: one price resolver. The existing modules are not
wrong, they are uncoordinated. The work is to wrap them behind one function with
one response shape, which is additive rather than a rewrite.

Phases 4 to 13 follow, but their cost depends on Phase 3 landing first. A market
coverage dashboard built before the gateway would measure the wrong thing, and a
BOQ integration built before it would bake in whichever table it happened to
read.

## What I need from the owner before Phase 1

Nothing to start the read-only audit. Before any write to a privileged function
or a migration that changes grants, I will ask, per rule 18.

## Limits of this phase

I inspected structure, counts, registration behaviour, function authorization
patterns and price-module spread. I have not yet read all 327 routes, all 85
calculator pages or all 614 migrations, so the route-to-engine map and the full
RLS review are not in this document. The nine deliverables the directive lists
are started here as findings, not finished as maps, and I would rather say so
than pad them.

## Finding 7: a guest can mint its own AI credit

The seven `anon` EXECUTE grants are on `record_ad_event`,
`unlock_guest_daily_ai_allowance`, `respond_to_client_estimate`,
`get_translation_alternates`, `get_published_translations`,
`get_public_shared_project` and `fetch_shared_estimate`.

**No price, scan, promotion or publication function is reachable by `anon`.**
That is the finding I most wanted to be able to report, and it is clean.

One of the seven does not hold up. `unlock_guest_daily_ai_allowance`
(`20261014030000_unpaid_daily_ad_limit_and_guest_ad_unlock.sql`) is
`SECURITY DEFINER`, callable by `anon`, and its comment says it unlocks one guest
AI operation "AFTER watching a verified ad". It does not verify anything. The
caller supplies `p_client_hash`, `p_ad_provider` and `p_ad_event_id` as
parameters, the function checks only that `client_hash` is non-empty, writes
`has_ad_credit = true`, and returns `true`.

The guards that do exist are real but insufficient:

- One credit per `client_hash` per day, enforced by a unique index.
- Blocked once `operations_used >= 1` for that hash.

Both key on `client_hash`, which the caller chooses. An anonymous caller can
send unlimited distinct hashes and receive unlimited ad credits without an ad,
which converts to AI spend the platform pays for and nobody recovers.

I have not changed it, because the right fix is a product decision and rule 18
requires approval for privileged changes. The options:

1. Drop the grant to `anon` and route unlocking through an authenticated edge
   function that verifies the rewarded ad with the provider before writing.
   Strongest, and consistent with `verify-rewarded-ad` already existing.
2. Keep the RPC but require a server-signed ad token, minted by the verify
   function, in place of caller-supplied provider and event ids.
3. Derive `client_hash` server-side from something the caller cannot forge and
   keep the rest as is. Weakest, since it still trusts a client-asserted ad.

Option 1 matches the existing architecture. Until one is chosen, the exposure is
capped only by how the AI gateway rate-limits itself, which is not a control.

## Corrected Finding 5 note

The crawler concern stands for the market and price functions that rely on
`getUser` alone, but no crawler is anonymously writable. The honest statement is
that the scheduled crawlers have no shared authorization mechanism, not that they
are open.

## Finding 8: the public price endpoints, read properly

`price-index-submit` runs with `verify_jwt = false` and writes through a
service-role client, which looks alarming until you read what it writes. It
inserts into `price_submissions` with `status = "pending"`, behind a shared rate
limiter and a per-day duplicate check. It never touches `estimation_prices`.
That is a defensible public submission surface.

The question that matters is whether anonymous submissions can reach the price
book by agreement alone. They cannot, and the reason is worth writing down
because it is accidental rather than designed.

`apply_community_prices()` gates on `count(distinct s.submitted_by)`, and skips
the group entirely when that count is zero. The submit function never sets
`submitted_by`, so every anonymous submission has a null author, the distinct
count is zero, and the group is skipped before any median is computed. Anonymous
reports therefore land in the review queue and stop there.

That guard depends on a null staying null. If anyone later backfills
`submitted_by` with a shared service account to "improve" attribution, two
colluding submissions would satisfy the consensus rule and publish a price with
no human in the loop. This deserves a test that asserts anonymous submissions
never auto-apply, so the invariant is enforced rather than incidental.

## Finding 9: the submit endpoint can mix a market with the wrong currency

`price-index-submit` accepts `market` from the request body, uppercases it, and
defaults it to `"NG"`, but writes `currency: "NGN"` as a literal. A caller
posting `market: "GB"` therefore creates a Great British submission denominated
in naira, in the table that feeds the community price pipeline.

Nothing currently publishes it, because of the null-author skip in Finding 8. So
this is a latent inconsistency rather than a live wrong price. It is still a
breach of the rule that a market's prices are never denominated in another
market's currency, and it is cheap to close: validate the market against the
supported registry and derive the currency from it, or refuse anything that is
not NG until per-market submission is designed.

## Finding 10: the Project Agent, partially verified

`src/lib/project-agent/` contains `execute.ts` with dedicated `execute.test.ts`,
`security.test.ts` and `e2e.test.ts`. Its shape is right: a separate approval
state, a separate execution step, and tests that target both. I have not yet
read the claim itself, so I can confirm the module exists and is tested but not
that the approved-to-executing transition is atomic. Phase 1 must settle that
with a concurrent-request test before any of the other Project Agent work is
trusted.

## Finding 10, resolved: the execution claim was not atomic

The Phase 0 note said the claim was unverified. It was absent, not merely
untested.

`persistExecutionState` guarded its update with `.eq("id", action.id)` and
nothing else. The state machine validated `approved → executed → verified` in
memory, so two requests arriving at once both read `approved`, both passed every
check, and both wrote project data. `canTransition` was enforcing the rule in the
wrong place.

Fixed in the execution layer:

1. A claim step transitions `approved → executed` with the state in the filter,
   not just the id. The database decides the winner; the loser affects no row
   and refuses with `already_claimed` before touching project data.
2. The claim sits after every pre-flight cancellation, because a claimed action
   may only reach verified or failed, never cancelled. Placing it earlier would
   have made honest cancellation impossible.
3. `persistExecutionState` now accepts an action that already holds the claim,
   since that step is satisfied by construction.

The test harness could not have caught this: its fake client applied an update
at the first `.eq` and ignored the rest, so a two-condition claim looked like a
one-condition claim. It now honours every condition in `strictUpdates` mode,
which is what a compare-and-set test requires, and the existing tests keep the
first-eq contract they were written against.

Proof rather than assertion: with the claim reverted, the concurrency test fails
with two successful executions of one action. With the claim in place, exactly
one succeeds, the other refuses, and exactly one write reaches project data.
279 project-agent tests pass.

Still open on this item: recovery for an action left in `executed` by a process
that died mid-write. The state is honest, the action is not stuck, and the next
run refuses rather than double-writes, but there is no sweep that resolves such
a row to failed and no test covering that path.

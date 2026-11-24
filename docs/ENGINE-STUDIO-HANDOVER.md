# Engine Studio adapter work: handover

Written 22 November 2026 for whoever picks this up next. Everything here is on
`main` at the commit that added this file.

## What the job is

Engine Studio (`/admin/engine-studio`) runs an estimation engine only when that
engine has an adapter registered in `src/lib/ai-foundation/`. The repository has
110 engine modules. Before this work the console listed 10, because only
`engines-registry.ts` was active in the running app. It now lists 46.

An adapter is a small wrapper that imports the engine module, supplies the same
defaults the calculator page ships, calls the engine's own function, and maps
its output to `EngineQuantityLine[]`. The point is that a number produced in the
console is the number the site produces. An adapter that drifts from its
calculator is worse than no adapter.

## Three rules that cost real time to learn

1. **Ids are exclusive.** `registerEngine` throws `DuplicateEngineIdError` when a
   different engine claims a taken id. This already happened twice:
   `foundation` belongs to `engines-structural.ts`, so the below-DPC takeoff is
   `foundation_below_dpc`; `reinforcement` also belongs to
   `engines-structural.ts`, so that adapter was dropped rather than renamed.
   Before writing an adapter, grep for the id:
   `grep -rn 'id: "your_id"' src/lib/ai-foundation/`.
2. **Every registered engine needs two rows.** The pre-commit suite fails
   without a `src/config/engine-surfaces.ts` row and a
   `src/lib/ai-foundation/engine-canonical.ts` row. A no-UI engine gets
   `status: "none"` and `route: null`. An honest unresolved mapping gets
   `canonicalId: null`, an entry in `UNRESOLVED_ENGINE_IDS`, and a note
   explaining why no id fits. Never claim a mapping you cannot defend.
3. **A page may reach an engine through its barrel.** The surface test accepts
   `@/lib/wallfinishing` as evidence for `@/lib/wallfinishing/quantity-engine`,
   because that is how the wall finishing estimator imports it. Name the module
   that holds the arithmetic, not the barrel, in `evidence.module`.
4. **Compare by label, not by index, and expect rounding.** The steel engine
   rounds printed lines, so an index comparison failed on 0.1 against 0.0996
   while the arithmetic agreed. Every parity test in
   `src/lib/ai-foundation/__tests__/` matches lines by label with a 2 decimal
   tolerance.

## How to add one adapter

1. Read the engine module's input interface and its calculate function. Note
   which arguments it needs beyond the input (rules, prices).
2. If it needs rules, import the module's own `DEFAULT_*_RULES`. If it needs
   prices, pass `{}` and say why in a comment: quantities are the job, and a
   price without a rate is invented.
3. Add the `registerEngine({...})` block in `engines-registry.ts`, before
   `listEngines`. Copy an existing block: defaults, `as never` cast, result
   mapping, `ok`/`error` handling.
4. Add the surface row and the canonical row.
5. Add a parity test that calls the adapter through `executeEngine` and the
   engine directly, then compares.
6. Run `npx tsc --noEmit -p tsconfig.app.json` and
   `npx vitest run src/lib/ai-foundation src/config`.
7. Commit. The pre-commit hook runs the related tests, the pre-push hook runs
   the fast gate, and CI runs the full suite plus a build.

## State of the eight batches

`docs/engine-adapter-batches.md` holds the per-module table. Summary:

| Batch | Family                         | State                                                                                                                                               |
| ----- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Concrete and substructure      | closed: `concrete_takeoff`, `icf_wall`, `concrete_volume` done. `reinforcement` declined (id taken), `increte` declined (needs a product catalogue) |
| 2     | Masonry and blockwork          | closed: `masonry` done. `createFenceDimension` deferred to batch 7 (it returns a dimension record)                                                  |
| 3     | Roofing and envelope           | closed: `waterproofing`, `soffit_gutter` done. Roof geometry and roof material spec declined (geometry and spec records, not quantities)            |
| 4     | Structural and temporary works | closed: retaining_wall, temporary_works done. Tall building and mathematical elevation declined (design checks, not quantities)                      |
| 5     | Finishing trades               | closed 23 November 2026: drywall, insulation, flooring, plaster_render, paint, exterior_finish, wall_areas done. mineral_stone and the wall-finishing cost engine declined (catalogue and price records) |
| 6     | Building services              | closed 23 November 2026: drainage, septic_sizing, plumbing_drainage, nec_cable done. Six declined (rule parsers, lookups, sequences); solar_pv and heat_comfort left open with reasons |
| 7     | Siteworks and external         | closed 23 November 2026: paving, demolition, site_safety done. circular-reuse declined (needs a factor table and rules); fence dimension declined (dimension record) |
| 8     | Commercial, cost and carbon    | closed 23 November 2026: all ten declined. Each needs a database table (calc rules, carbon factors, labour rates, price book) or contract money values that a pure adapter cannot supply |

All eight batches are now decided. Batches 1 to 7 are closed with adapters where
the engine's output is a quantity and a decline where it is not; batch 8 is
closed with ten declines because every module in it needs a database table or
contract money values that a pure adapter cannot supply. The console runs 46
engines: 33 registered in `engines-registry.ts` and 13 from the three modules
`register-all.ts` activates (4, 5 and 4). Every adapter added across these
batches ships with a parity test.

Adapters added in this run, each with a parity test: `plastering_wall`,
`steel_beam`, `foundation_below_dpc`, `concrete_takeoff`, `icf_wall`,
`masonry`, `concrete_volume`, `waterproofing`, `soffit_gutter`,
`retaining_wall`, `temporary_works`, `drywall`, `insulation`, `paint`,
`plaster_render`, `flooring`, `exterior_finish`, `wall_areas`, `drainage`,
`septic_sizing`, `plumbing_drainage`, `nec_cable`, `paving`, `demolition`,
`site_safety`.

Also in this run: `register-all.ts` activates `engines-expanded`,
`engines-phase2` and `engines-structural`, which were written but never called
outside tests. That single change took the console from 10 engines to 26. Before
writing any new adapter, check whether the engine is already registered by one
of those three modules; the answer is yes more often than not.

## Identity hardening (24 November 2026)

The b82d2f3b review left three gaps in the registration identity work. All three
are closed except the last, which is a decision rather than a task.

**1. NIN was validated in the browser only.** The form checked eleven digits;
an admin invitation, an admin edit and a direct call to the auth API never
touched the form. The rule now lives in three places, each doing a different
job: `supabase/functions/_shared/identity-validation.ts` for the admin edge
function (a 400 naming the field), `handle_new_user` for every signup path
including the API (an exception), and the form for immediate feedback.
`identity-validation.test.ts` covers the shared module; the trigger rules were
proven against production with rolled-back inserts: a short NIN and an unknown
government ID type both raise, a spaced NIN is normalised and accepted.

**2. The country list was duplicated and would drift.** It was a literal inside
the trigger, so adding a market to `countries.ts` and forgetting the SQL gave a
form that offers a country the trigger rejects. The list is now
`public.registration_countries`, seeded by
`20261124160000_identity_rules_and_country_source.sql`, and the trigger asks it.
`auth-signup-trigger.test.ts` compares that seed with `APPROVED_MARKET_CODES`,
so a country added on one side fails the suite until the other follows. Adding a
market is now one row plus one entry in `countries.ts`.

**3. NIN and government ID numbers are still stored in plaintext.** Not done,
deliberately. Masking shipped instead: the admin table shows the last four
digits (`src/lib/identity/mask.ts`) and the full value is only in the editor.
That stops a number being read off a shared screen, but it changes nothing at
rest: anyone with database or backup access still reads the value.

Encrypting at rest is a decision, not a patch, because it needs a key that no
browser holds and a read path that decrypts for the owner and for admins only.
The shape it would take: `pgcrypto` over a key in Supabase Vault, the trigger
and the admin edge function encrypting on write, a `SECURITY DEFINER` function
returning plaintext to `is_admin()` or the owner, the admin editor reading
through it, and a backfill that re-encrypts existing rows in one transaction.
The open questions are where the key lives, who may rotate it, and whether the
product should keep the full number at all rather than a hash plus last four.
Those are the owner's calls, and half-building this would break the editor
without protecting anything.

## Things that are not engine work but are open

These are tracked in conversation memory and are unrelated to the batches:

- **Netlify build dies mid-prerender**: closed on 23 November 2026. A deploy
  did publish, verified from outside: the live CSP now carries
  `challenges.cloudflare.com` in `script-src` and `connect-src`, and the served
  `Messages` chunk contains the "This conversation could not be opened"
  fallback while the `InquiryThread` chunk carries the "Send reply" copy. Treat
  literal UI strings, not minified function names, as the evidence a build is
  live: imported identifiers are renamed in production bundles.
- **Admin ledger RLS: applied, verified 23 November 2026.** The earlier note said
  this migration was unapplied because the sandbox tokens returned 401; a working
  token shows it is live. `pg_policies` carries `Admins can read all <table>` on
  contractor_projects, project_invoices, project_payments, project_expenses and
  supplier_bills, each `cmd = SELECT` with `qual = is_admin()`, and every one of
  those tables has `relrowsecurity = true`. Writes remain owner-only, as the
  migration intends.
- **Market page decision pending, and now only a decision.** 1,472 of 3,351
  prerendered pages are `/market/<country>/<material>`. They are indexable, not
  duplicates. Prerender no longer fails, so the pressure that made this urgent is
  gone; the open question is whether a thinner country set serves search better
  than the full one. That is an SEO call for the owner, not a build fix.

## Verification commands

```
cd <repo>
git log --oneline -1
npx tsc --noEmit -p tsconfig.app.json
npx vitest run src/lib/ai-foundation src/config
node scripts/generate-project-map.mjs   # refreshes public/studio/project-map.json
```

The engine count is reported live by the coverage card on `/admin/engine-studio`,
and by `listEngines().length` after `registerAllEngines()`. It is 46 as of
23 November 2026: 33 engine ids in `engines-registry.ts` plus 4, 5 and 4 from the
three adapter modules `register-all.ts` activates. Count the ids, not the
`registerEngine` calls: a module can re-register an engine it already declared.

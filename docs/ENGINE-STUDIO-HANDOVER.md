# Engine Studio adapter work: handover

Written 22 November 2026 for whoever picks this up next. Everything here is on
`main` at the commit that added this file.

## What the job is

Engine Studio (`/admin/engine-studio`) runs an estimation engine only when that
engine has an adapter registered in `src/lib/ai-foundation/`. The repository has
110 engine modules. Before this work the console listed 10, because only
`engines-registry.ts` was active in the running app. It now lists 43.

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
| 7     | Siteworks and external         | **next**: 4 modules plus the deferred fence dimension                                                                                               |
| 8     | Commercial, cost and carbon    | not started, 10 modules                                                                                                                             |

Adapters added in this run, each with a parity test: `plastering_wall`,
`steel_beam`, `foundation_below_dpc`, `concrete_takeoff`, `icf_wall`,
`masonry`, `concrete_volume`, `waterproofing`, `soffit_gutter`,
`retaining_wall`, `temporary_works`, `drywall`, `insulation`, `paint`.

Also in this run: `register-all.ts` activates `engines-expanded`,
`engines-phase2` and `engines-structural`, which were written but never called
outside tests. That single change took the console from 10 engines to 26. Before
writing any new adapter, check whether the engine is already registered by one
of those three modules; the answer is yes more often than not.

## Things that are not engine work but are open

These are tracked in conversation memory and are unrelated to the batches:

- **Netlify build dies mid-prerender** with a bare exit code 2 at roughly route
  1,500 of 3,351 and no error text. Green locally on Node 20 and Node 24 against
  live data, and in CI. Needs a Netlify access token to read the real deploy log.
- **Admin ledger RLS migration unapplied.** `20261121170000_admin_ledger_read_access.sql`
  is committed but not applied, because every sandbox Supabase management token
  returns 401. Until it runs, the admin money ledgers show only the owner's rows.
- **Market page decision pending.** 1,472 of 3,351 prerendered pages are
  `/market/<country>/<material>`. They are indexable, not duplicates. Either trim
  to about 8 countries or shard prerender across processes.

## Verification commands

```
cd <repo>
git log --oneline -1
npx tsc --noEmit -p tsconfig.app.json
npx vitest run src/lib/ai-foundation src/config
node scripts/generate-project-map.mjs   # refreshes public/studio/project-map.json
```

The engine count is reported live by the coverage card on `/admin/engine-studio`,
and by `listEngines().length` after `registerAllEngines()`. It is 43 as of
23 November 2026: 29 in `engines-registry.ts` plus 4, 5 and 5 from the three
adapter modules `register-all.ts` activates.

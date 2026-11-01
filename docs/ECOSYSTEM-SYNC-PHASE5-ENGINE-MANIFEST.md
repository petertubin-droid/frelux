# Phase 5: the canonical engine manifest, composed

Phase 2 reconciled engine _identity_. It could not answer "what does this
engine accept, in which markets, priced how", because no source declared it.
This phase composes one manifest from the three existing descriptions instead
of writing a fourth one by hand.

`src/lib/ai-foundation/engine-manifest.ts` builds one record per engine from:

- `listEngines()` (AI foundation registry)
- `ENGINE_CAPABILITIES` (international capability registry)
- `FULL_ENGINE_INVENTORY` (engine inventory)
- linked by `CANONICAL_ENGINE_MANIFEST`, the verified alias map

## What it reports, measured on this commit

| Measure                                              | Value |
| ---------------------------------------------------- | ----- |
| Engines in the manifest                              | 58    |
| Described by all three vocabularies                  | 16    |
| AI registry only (both unresolved)                   | 2     |
| Capability registry only (deterministic calculators) | 38    |
| Inventory only                                       | 2     |
| Entries claiming verified markets                    | 54    |
| Deliberately unresolved ids                          | 2     |

Read that table plainly: 16 of 58 engines are described consistently by all
three vocabularies. The other 42 are real engines that at least one surface
cannot see. That is the reconciliation gap, now counted rather than described.

## The honesty rule inside the manifest

A field no source declares is `null` and appears in `gaps`. Nothing is
defaulted. Today every entry carries at least:

- `version not declared`
- `input/output schema not declared`

Those gaps are the honest answer to the directive's request for version, input
schema, output schema, units and verification status. They are not "unknown
because nobody looked": every source was read. They are "not declared
anywhere", which is a property of the platform, not of this module.

The many-to-one case is kept as a list. `painting_project` and
`painting_wall_area` both concern painting, and the second has no verified
capability link, so it stays a separate entry carrying its unresolved reason
instead of being folded into painting and disappearing.

## Tests

8 tests in `engine-manifest.test.ts`:

- no duplicate ids
- every AI registry engine appears
- every capability registry entry appears
- unresolved ids stay unresolved and say why
- undeclared fields are null and listed in `gaps`
- linked entries take markets and determinism from the capability, not from a guess
- the build is deterministic
- the summary never over-counts the three-way agreement

## Wired into the admin matrix

`AdminEngineMatrix` now opens with a reconciliation band fed by
`summariseManifest(buildEngineManifest())`. It states how many engines all three
vocabularies describe, how many only one of them can see, and names the AI
register's unlinked engines with the note that each carries a written reason
instead of a guessed mapping. The inventory table below it is unchanged, so the
screen gained an honest summary without losing the per-market matrix.

Verified by rendering the real component against the real sources, with no
mocked engine data: the band's numbers are asserted to equal what
`summariseManifest` returns, so a hard-coded figure would fail.

## Not done

- No version or schema has been declared for any engine. Declaring them is real
  work per engine, not a manifest change.
- The capability-only list (38 engines with no AI engine behind them) is counted
  but not yet displayed. Showing 38 rows would swamp the band; it belongs on a
  dedicated reconciliation screen.

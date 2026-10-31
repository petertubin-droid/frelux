# Engine inventory reconciliation

Measured against the tree at `a35cdc92`. Three lists describe FRELUX engines and
they do not agree.

| List                | Where                                          | Entries |
| ------------------- | ---------------------------------------------- | ------- |
| AI engine registry  | `src/lib/ai-foundation/engines-*.ts`           | 17      |
| Capability registry | `src/lib/international/capability-registry.ts` | 54      |
| Engine inventory    | `src/lib/international/engine-inventory.ts`    | 56      |

## The good news: capability is a subset of inventory

Every one of the 54 capability ids appears in the inventory. The inventory holds
exactly two more:

- `governance_audit`
- `rfq_punchout`

Those two are not capabilities in the capability registry's sense, which is
defensible. There is no contradiction between these two lists; one is a
projection of the other.

## The problem: the AI registry speaks a different language

Only seven ids appear in all three lists:

`build_to_roof`, `electrical`, `margin_calculator`, `plumbing`, `pop_ceiling`,
`regional_cost`, `roof_geometry`

The other ten registry engines exist under names that appear nowhere in either
international list:

`foundation_calculator`, `painting_project`, `painting_wall_area`,
`screeding_system`, `sequence_planner`, `structural_calculator`,
`tile_estimate`, `timeline_estimator`, `tyrolene_partition_area`,
`tyrolene_system`

Meanwhile the international lists describe capabilities the AI layer cannot
execute at all, such as `boq_generator`, `price_forecast`,
`conversational_estimator` and `roof_plan_scanner`.

### The consequence, stated plainly

An admin matrix built on international ids will report no engine behind
`painting`, `tile`, `structural` and `foundation`, even though each has a real,
tested, authoritative implementation registered in the AI layer. The reverse is
also true: asking the AI layer for a BOQ or a price forecast finds nothing.

That is not a cosmetic mismatch. It is the difference between the platform
knowing what it can calculate and not knowing.

## Proposed mapping, pending the owner's decision

These are proposals by name and purpose, not verified identities. I have not
changed any id, and nothing below should be treated as settled.

| AI registry id            | Likely canonical id            | Confidence                         |
| ------------------------- | ------------------------------ | ---------------------------------- |
| `painting_project`        | `painting`                     | high                               |
| `tile_estimate`           | `tile`                         | high                               |
| `structural_calculator`   | `structural`                   | high                               |
| `foundation_calculator`   | `foundation`                   | high                               |
| `screeding_system`        | `screeding`                    | high                               |
| `tyrolene_system`         | `tyrolene`                     | high                               |
| `tyrolene_partition_area` | `tyrolene`                     | medium, two engines one capability |
| `painting_wall_area`      | `painting` or `wall_finishing` | medium, ambiguous                  |
| `sequence_planner`        | `sequence`                     | medium                             |
| `timeline_estimator`      | none found                     | unknown                            |

`timeline_estimator` has no counterpart I can find. It may be a capability the
international lists never modelled, which is itself worth knowing.

## The decision I need

Two engines mapping to one capability (`painting_project` and
`painting_wall_area` both plausibly to `painting`) means the mapping is
many-to-one, so the canonical direction matters:

1. **Alias map, additive.** Keep every id, add an explicit
   registry-to-canonical table with a test that fails when a registry engine has
   no mapping. Nothing breaks, nothing is renamed, and the gap becomes visible
   instead of silent. This is what I recommend.
2. **Rename the registry ids** to the international vocabulary. Cleaner end
   state, but it changes ids the AI layer and any saved action references use.
3. **Rename the international ids** to the registry vocabulary. Worst of the
   three: the inventory is the wider list and is consumer-facing.

Until the owner picks one, the AI registry keeps its own names and the
mismatch stays. I have not guessed.

## Also worth recording

The registry previously accepted a duplicate id silently, resolving to whichever
module imported last. A second engine claiming a taken id is now refused with
`DuplicateEngineIdError`, tested in `engines-registry.test.ts` along with the
case that a refused claim leaves the original engine intact.

One nuance the first attempt got wrong and the test suite caught: FRELUX modules
re-register their engines, sometimes on every call, with a freshly built
descriptor. Identity comparison therefore broke startup outright. The guard now
treats a matching id, title and domain as that engine registering again, and
only refuses a different title under a taken id. No duplicates exist today, so
this prevents a future failure rather than fixing a live one.

p = 'docs/CALCULATOR_AUDIT.md'
s = open(p).read()
n = 0


def set_status(row_num: str, status: str):
    """Replace only the status cell, keeping the number and name cells intact."""
    global s, n
    import re

    pattern = re.compile(
        r"^(\| " + re.escape(row_num) + r" \| [^|]+\| [^|]+\| )[^|]*\|$", re.M
    )
    new_s, count = pattern.subn(lambda m: m.group(1) + status.ljust(91) + "|", s)
    assert count == 1, f"row {row_num}: matched {count}"
    s = new_s
    n += 1


set_status(
    "21",
    "**Audited 2026-11-22**, 8 tests, no defect (SI conversion verified)",
)
set_status(
    "22",
    "**Audited 2026-11-22**, 7 tests, no defect; unpriced and incomplete honesty verified",
)
set_status(
    "33",
    "**Audited 2026-11-22**, 10 tests, DEFECT FIXED: getFamily returned undefined for an unknown id",
)

sections = '''
## Audit 21: Mathematical Plan Elevation (`plan-scale.ts`)

Suite: `src/lib/estimation/__tests__/plan-elevation-conformance.test.ts`, 8 tests.

**No defect.** The four calibration units convert at their SI definitions
(1 mm = 0.001 m, 1 ft = 0.3048 m, 1 in = 0.0254 m), a typed string reads the same
as a number, and impossible lengths are refused rather than coerced. Pixels per
metre divides the clicked span by the known length and refuses a null, zero,
negative or non-finite side instead of returning Infinity. The round trip
`scale x metres` returns the clicked span, and the same wall entered in
millimetres and in metres yields the same scale.

The engine is deliberately small: it stores metres and nothing else, so the
conversion happens once. That is the right shape, and the tests pin it.

## Audit 22: Foundation Cost Estimate (money layer of `foundation-engine.ts`)

Suite: `src/lib/estimation/__tests__/foundation-cost-conformance.test.ts`,
7 tests.

Audit 1 covered the mix and block arithmetic. This covers the money the page
shows.

**No defect.** Every sized and priced line is `quantity x unit_price` rounded to
2 dp, and the priced subtotal is exactly the sum of the line totals. With no
prices configured the priced subtotal is 0, `material_subtotal` is null rather
than a partial sum that would read as a complete material cost, and `incomplete`
is true. Quantities stay visible while prices are absent, so the user can see
what is missing. `grand_total` is null unless the estimate is complete, and with
labour mode "none" the grand total is the material subtotal, not a figure with
labour quietly folded in.

The suite also documents a behaviour worth keeping: the engine refuses to guess
blocks without a per-m2 rule or a published market module, and says so in
`missing` instead of producing a number.

## Audit 33: International Code Reference (`src/lib/codes/`)

Suite: `src/lib/codes/__tests__/code-reference-conformance.test.ts`, 10 tests.

**Defect fixed.** `getFamily(id)` was `return CODE_FAMILIES[id]` under a
signature promising a `CodeFamily`. An unknown id returned `undefined`, so the
type said the value could not be undefined and the crash landed later, further
from the cause. It now throws with the offending id and the list of known
families, which is what a mistyped id needs.

Verified correct:

- every family's `defaultEditionId` exists in its own `editions`, so the page
  cannot show a blank edition;
- every edition has a non-empty label and, where a year is stated, it is a year
  that could be a real edition;
- every family declares at least one jurisdiction, and every offered
  jurisdiction maps to a family that exists;
- `FAMILY_ORDER` covers every family exactly once, so no family is unreachable
  in the UI;
- no family claims municipal approval; each states who adopts it and how local
  adoption varies;
- the Eurocode family states that the project country's National Annex governs
  and that design values do not transfer between member states, which is the
  claim the whole reference set rests on.

**Recorded, not patched:** the registry is a document list, so its accuracy
depends on the edition years and titles being checked against the publishers at
each registry revision. The suite pins structure and self-consistency, not the
currency of every document.
'''

anchor = '## Open questions carried forward'
assert anchor in s
s = s.replace(anchor, sections.strip() + '\n\n' + anchor, 1)
n += 1

open(p, 'w').write(s)
print("ledger updated, edits:", n)

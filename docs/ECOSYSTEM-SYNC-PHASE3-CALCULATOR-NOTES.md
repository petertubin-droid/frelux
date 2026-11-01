# Phase 3: calculator price notes state the evidence, 2026-11-01 23:40

## The claim that was not true

`TyroleneEstimator` told the user a resolved material was priced "market book,
verified provenance" whether or not anything had been verified. The role
fallback can land on an FX reference or a seeded baseline, and the sentence was
hardcoded, so the strongest wording was attached to whichever row happened to
exist.

`PaintingEstimator` was honest but incomplete: it said which market book the
price came from and nothing about what kind of number it was.

## What changed

`ResolvedMaterialPrice` now carries `evidence: EvidenceClass`, set from the
row itself in both resolution paths (bundled book and database). A new
`evidenceSentence(evidence)` turns that into one plain sentence, and the three
calculators that report a resolved price now use it:

- Tyrolene: "… (NG market book). Verified supplier price." or, when it applies,
  "FX reference band, not a supplier quotation."
- Painting: same sentence appended to its existing market disclosure.
- Conversational: same, in its retail-pack note.

`ConversationalEstimator` resolves through the city-aware helper, which extends
the same type, so the class flows through with no extra plumbing.

No price, quantity, fallback order or calculation changed. Only the sentence
that describes the price.

## Tests

Five new tests for the sentence function, including one that asserts no em dash
reaches user-facing text. The existing ConversationalEstimator test needed its
module mock to expose the new export; it now asserts the retail pack sentence
alongside the market context. 1551 estimation and price index tests pass, 15
across the three calculator suites, typecheck and build clean.

## Phase 3 status

Every price read that feeds a calculation carries an evidence class, and the
calculators that report a resolved price now say what it is. What remains is
the wider wiring work, which belongs to a later phase: `price-gateway.ts`
already returns tiers and warnings but no page consumes it yet, so most other
calculators still use their own local price lookups.

# Phase 3: the gateway stops calling a baseline verified, 2026-11-01 20:40

## What was wrong

`price-gateway.ts` decided how much to trust a number from market coverage
alone. Coverage answers "does this market have a book". It does not answer "what
is this number". So a market with a complete book could return an FX reference
band or a seeded baseline with `status: "local"` and the sentence "priced from
NG verified prices", which is the exact claim the phase has been removing
everywhere else.

The gateway is the surface most calculators are meant to move onto, so leaving
the strongest wording there would have re-introduced the problem at a larger
scale than the three calculators fixed earlier today.

## What changed

`PriceProvenance` now carries `evidence: EvidenceClass | null`, filled from the
row on both axes: the role axis through the resolver, the material axis by
classifying the row it reads directly.

`status` is unchanged in meaning: it still describes where the amount came from
(local, inherited, unverified, not priced). Trust wording is now separate from
it:

- `supplier_verified` is the only class that produces "verified supplier
  prices", and only when the market's own coverage is local.
- `supplier_reported` adds "Reported price, not independently verified."
- `macro_reference` adds "FX reference band, not a supplier quotation" and a
  line telling the reader to treat it as an order of magnitude.
- `baseline` adds "Seeded baseline with no live source" and a line telling them
  to ask a supplier before quoting work from it.
- No class means no claim: the message says the figure is not a verified
  supplier price, and `evidence` stays null rather than being guessed.

Provenance also gained `packSizeId`, because the first consumer needs the retail
pack the price is quoted for.

## First consumer

`ConversationalEstimator` was resolving interior paint through the city-aware
helper directly and assembling its own note, including the sentence added this
morning. It now calls `resolvePrice`, reads the pack id from provenance, and
renders the gateway's sentence and warnings. One resolution, one wording, and
the page no longer maintains its own copy of the honesty rules.

Every other calculator still reads prices its own way. That is the remaining
wiring work, and it is now one call per page rather than a rewrite.

## Tests

Five new gateway tests pin the rule: a baseline never reaches the verified
wording and carries the supplier advice, an FX band says it is not a quote,
verified appears only for a supplier-verified row, a row with no evidence
reports null instead of guessing, and the material axis carries the class too.
77 pricing tests and the estimator suite pass; typecheck clean.

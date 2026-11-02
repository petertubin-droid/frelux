# Phase 3: the market price book carries evidence per material, 2026-11-01 23:10

## The last raw read on a calculation path

`fetchMarketPriceBook` is what non-Nigerian estimators price from. It built
`byRef` from `fetchAllPrices` and kept the number, discarding everything that
said what the number was. A US engine and an NG engine could therefore both
receive an FX reference band and neither could tell it apart from a quotation.

`fetchAllPrices` itself is now confirmed to serve only two things: this book
builder, and `AdminPriceUpdater`. It is not a public consumer, so the earlier
"nine modules read the table directly" concern reduces to one real path, which
is this one.

## The change

The book carries `evidence: Map<string, EvidenceClass>`, populated in all three
price branches: the market's own rows, the disclosed NG fallback, and the NG
book itself. Classification uses the shared classifier, so the same rule that
labels the index and the structural engines labels the book.

Nothing about a price, a currency, a fallback or a verification flag changed.
The book simply stops throwing away the part that says whether a figure is a
quotation or a reference.

## Tests

Six tests in `queries.market-price-book.test.ts`. Two are new: one asserts every
entry is classified, one asserts a verified quotation and an FX reference in the
same book come back as `supplier_verified` and `macro_reference`. The
classification of a row with nothing recorded about its source is
`supplier_reported`, which is the honest reading: unverified, not a quotation
and not a baseline.

1555 tests pass across estimation, price index and the price book page.
Typecheck and build clean.

## Phase 3 status

Every read of `estimation_prices` that feeds a calculation now carries evidence,
directly or through the shared classifier. What remains is presentation: most
calculator UIs still print the older price note wording instead of the tier and
warnings the resolver returns.

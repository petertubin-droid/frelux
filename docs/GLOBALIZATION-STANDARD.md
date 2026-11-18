# Globalization standard (mandatory for every feature)

FRELUX is a global product, not a Nigeria-only calculator with translations
bolted on. **Every new feature and every upgrade must ship meeting this
standard.** A feature that fails it is not done.

This is a standing rule from the product owner (2026-11-18) and applies to
UI, engines, exports (PDF/receipts/CSV), admin screens, emails and any future
surface.

## The checklist

Every feature must satisfy all of these before it merges:

1. **Money is market money.** Amounts render through the display-currency layer
   (`formatCurrency`, `formatByCode`, `useDisplayCurrency`) in the visitor's
   market currency. No hardcoded `₦`, `NGN`, `en-NG` or Nigerian price in a
   user-facing string, default parameter, document or export.
2. **Units follow the reader.** Areas, lengths and volumes are entered and shown
   in the market's unit (metric or imperial) through the shared conversion
   layer. Never assume metres.
3. **Copy is translatable.** All user-facing strings go through the i18n layer
   (`t()`, `tx()`) or Google Translate's in-page translation. No string is
   hardcoded into a component that a translation cannot reach.
4. **The market dimension is respected.** Anything stored or priced carries its
   market (ISO 3166-1 alpha-2, default `NG`) and country columns where the data
   is regional. Price books, indices and settings are read for the active
   market, never globally mixed.
5. **No region-locked assumptions.** Phone inputs, tax labels, date formats,
   address fields, payment gateways and legal copy adapt to the market. A
   fallback (e.g. Paystack when Stripe is not configured) must be explicit and
   safe, never silent.
6. **Missing data is stated, never invented.** When a market has no price,
   rate, index or rule, the feature says so plainly instead of showing a
   default, a zero, or a converted guess.
7. **Exports carry the standard too.** PDFs, receipts, quotations and CSV use
   the same currency, unit and locale rules as the screen, and the FRELUX
   receipt house style.
8. **Admin can configure it.** Anything market-specific (rates, price books,
   indices, gateways, markets) is editable in the admin rather than hardcoded
   in the codebase.

## How to verify

- Search the diff for `₦`, `NGN`, `en-NG`, `"Nigeria"`, `metric`, `metre`:
  every hit must be justified by an explicit fallback with a comment.
- Run the affected engine's tests for at least two markets (e.g. NG and US) —
  the existing `all-markets-e2e` suites are the pattern.
- Check the export/document output, not just the screen.

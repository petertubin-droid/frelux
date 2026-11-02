/** DE tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for DE; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const DE: MarketTaxFixture = {
  market: "DE",
  currency: "EUR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "cf0f2d32-bfd4-45ee-8958-2be4ee893657",
        market_code: "DE",
        tax_kind: "consumption",
        tax_name: "Umsatzsteuer (MwSt)",
        rate_pct: 19.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate (7% reduced for certain categories)",
        citation_title: "Global VAT Rates by Country (July 2026)",
        citation_url:
          "https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/",
        citation_publisher: "VATupdate",
        effective_date: "2026-01-01",
        notes: null,
        is_active: true,
      },
    ],
  },
  scenarios: [
    {
      name: "standard quote (both)",
      appliesTo: "both",
      preTax: 1_000_000,
      // Captured from the deterministic engine on 2026-10-24.
      expected: {
        kind: "verified_rule",
        source: "market_catalog",
        taxPercent: 19,
        taxAmount: 190000,
        grandTotal: 1190000,
        components: [
          {
            name: "Umsatzsteuer (MwSt)",
            ratePct: 19,
            base: 1000000,
            amount: 190000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "VATupdate",
        effectiveFrom: "2026-01-01",
      },
    },
  ],
};

/** AU tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for AU; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const AU: MarketTaxFixture = {
  market: "AU",
  currency: "AUD",
  rows: {
    rules: [],
    catalog: [
      {
        id: "a1b14551-008b-4584-b188-96aafd87fc88",
        market_code: "AU",
        tax_kind: "consumption",
        tax_name: "Goods and Services Tax (GST)",
        rate_pct: 10.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "GST on most goods and services",
        citation_title: "GST \u2014 Australian Taxation Office",
        citation_url: "https://www.ato.gov.au/",
        citation_publisher: "Australian Taxation Office",
        effective_date: "2024-01-01",
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
        taxPercent: 10,
        taxAmount: 100000,
        grandTotal: 1100000,
        components: [
          {
            name: "Goods and Services Tax (GST)",
            ratePct: 10,
            base: 1000000,
            amount: 100000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "Australian Taxation Office",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

/** ZA tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for ZA; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const ZA: MarketTaxFixture = {
  market: "ZA",
  currency: "ZAR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "c68fb0ee-3990-4b3e-9f97-7e77bf48e9e4",
        market_code: "ZA",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT)",
        rate_pct: 15.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate on taxable supplies",
        citation_title: "VAT rates \u2014 SARS",
        citation_url: "https://www.sars.gov.za/",
        citation_publisher: "South African Revenue Service",
        effective_date: "2024-04-01",
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
        taxPercent: 15,
        taxAmount: 150000,
        grandTotal: 1150000,
        components: [
          {
            name: "Value Added Tax (VAT)",
            ratePct: 15,
            base: 1000000,
            amount: 150000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "South African Revenue Service",
        effectiveFrom: "2024-04-01",
      },
    },
  ],
};

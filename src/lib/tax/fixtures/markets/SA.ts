/** SA tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for SA; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const SA: MarketTaxFixture = {
  market: "SA",
  currency: "SAR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "2fd9d643-d0b8-418d-b41e-3e6fc6bc366f",
        market_code: "SA",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT)",
        rate_pct: 15.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate on taxable supplies",
        citation_title: "VAT \u2014 ZATCA",
        citation_url: "https://zatca.gov.sa/en/vat",
        citation_publisher: "Zakat, Tax and Customs Authority",
        effective_date: "2020-07-01",
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
        citationPublisher: "Zakat, Tax and Customs Authority",
        effectiveFrom: "2020-07-01",
      },
    },
  ],
};

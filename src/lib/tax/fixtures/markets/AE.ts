/** AE tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for AE; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const AE: MarketTaxFixture = {
  market: "AE",
  currency: "AED",
  rows: {
    rules: [],
    catalog: [
      {
        id: "04fc9537-31ed-4f28-b318-e51074085150",
        market_code: "AE",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT)",
        rate_pct: 5.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate on taxable supplies in the UAE",
        citation_title: "VAT \u2014 Federal Tax Authority",
        citation_url: "https://tax.gov.ae/en/vat.aspx",
        citation_publisher: "UAE Federal Tax Authority",
        effective_date: "2018-01-01",
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
        taxPercent: 5,
        taxAmount: 50000,
        grandTotal: 1050000,
        components: [
          {
            name: "Value Added Tax (VAT)",
            ratePct: 5,
            base: 1000000,
            amount: 50000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "UAE Federal Tax Authority",
        effectiveFrom: "2018-01-01",
      },
    },
  ],
};

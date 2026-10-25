/** GH tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for GH; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const GH: MarketTaxFixture = {
  market: "GH",
  currency: "GHS",
  rows: {
    rules: [],
    catalog: [
      {
        id: "85c00b06-8e1f-4a56-a7eb-37db63c57f44",
        market_code: "GH",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT) + NHIL + GETFund",
        rate_pct: 15.0,
        additional_levies_pct: 5.0,
        applies_to: "both",
        basis:
          "VAT unified at 15% from 1 Jan 2026, plus NHIL 2.5% and GETFund levy 2.5% on the base (effective 20%)",
        citation_title: "Ghana VAT \u2014 GRA",
        citation_url: "https://gra.gov.gh/domestic-tax/tax-types/vat/",
        citation_publisher: "Ghana Revenue Authority",
        effective_date: "2026-01-01",
        notes:
          "EY: VAT unified at 15% effective 1 Jan 2026; combined burden approximately 20%.",
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
        taxPercent: 20,
        taxAmount: 200000,
        grandTotal: 1200000,
        components: [
          {
            name: "Value Added Tax (VAT) + NHIL + GETFund",
            ratePct: 15,
            base: 1000000,
            amount: 150000,
            compoundedOn: null,
          },
          {
            name: "Additional verified levies",
            ratePct: 5,
            base: 1000000,
            amount: 50000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "Ghana Revenue Authority",
        effectiveFrom: "2026-01-01",
      },
    },
  ],
};

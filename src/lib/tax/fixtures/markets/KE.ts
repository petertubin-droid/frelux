/** KE tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for KE; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const KE: MarketTaxFixture = {
  market: "KE",
  currency: "KES",
  rows: {
    rules: [],
    catalog: [
      {
        id: "2e67c9b8-fe20-4469-9fd2-6f67586f02ca",
        market_code: "KE",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT)",
        rate_pct: 16.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "General rate on taxable goods and services (8% on petroleum)",
        citation_title: "Value Added Tax \u2014 KRA",
        citation_url:
          "https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax",
        citation_publisher: "Kenya Revenue Authority",
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
        taxPercent: 16,
        taxAmount: 160000,
        grandTotal: 1160000,
        components: [
          {
            name: "Value Added Tax (VAT)",
            ratePct: 16,
            base: 1000000,
            amount: 160000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "Kenya Revenue Authority",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

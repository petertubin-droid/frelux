/** US tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for US; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const US: MarketTaxFixture = {
  market: "US",
  currency: "USD",
  rows: {
    rules: [],
    catalog: [
      {
        id: "723b4298-3d11-42ad-8aaf-3b4a0a5798b7",
        market_code: "US",
        tax_kind: "consumption",
        tax_name: "Sales and Use Tax (state/local)",
        rate_pct: null,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis:
          "No federal sales tax; rates vary by state and local jurisdiction (0% to about 10%)",
        citation_title: "State Sales Tax Rates",
        citation_url: "https://www.taxadmin.org/state-tax-rates",
        citation_publisher: "Federation of Tax Administrators",
        effective_date: "2026-01-01",
        notes:
          "No single national rate exists; the calculator reports this honestly instead of inventing one.",
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
        kind: "not_determined",
        source: null,
        taxPercent: null,
        taxAmount: 0,
        grandTotal: 1000000,
        components: [],
        citationPublisher: null,
        effectiveFrom: null,
      },
    },
  ],
};

/** CA tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for CA; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const CA: MarketTaxFixture = {
  market: "CA",
  currency: "CAD",
  rows: {
    rules: [],
    catalog: [
      {
        id: "22fccdcf-a3f1-4326-859d-69a18e00ad0a",
        market_code: "CA",
        tax_kind: "consumption",
        tax_name: "Goods and Services Tax (GST)",
        rate_pct: 5.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis:
          "Federal GST; harmonized provinces (HST) add a provincial component (combined 13-15% in most HST provinces)",
        citation_title: "GST/HST rates \u2014 Canada.ca",
        citation_url:
          "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html",
        citation_publisher: "Canada Revenue Agency",
        effective_date: "2024-01-01",
        notes:
          "Provincial component depends on province of supply; the federal 5% is the verified national baseline.",
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
            name: "Goods and Services Tax (GST)",
            ratePct: 5,
            base: 1000000,
            amount: 50000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "Canada Revenue Agency",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

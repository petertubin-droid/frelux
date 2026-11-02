/** IN tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for IN; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const IN: MarketTaxFixture = {
  market: "IN",
  currency: "INR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "9c70f7ff-2fcd-4c49-b76d-6945810ae3e0",
        market_code: "IN",
        tax_kind: "consumption",
        tax_name: "Goods and Services Tax (GST)",
        rate_pct: 18.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis:
          "Standard rate for works contract / construction services (SAC 9954)",
        citation_title: "GST on Construction \u2014 rates",
        citation_url: "https://www.indiafilings.com/learn/gst-on-construction",
        citation_publisher: "IndiaFilings (GST Council rates)",
        effective_date: "2022-07-18",
        notes:
          "Reduced slabs (5%, 12%) exist for specific schemes; 18% is the verified works-contract standard.",
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
        taxPercent: 18,
        taxAmount: 180000,
        grandTotal: 1180000,
        components: [
          {
            name: "Goods and Services Tax (GST)",
            ratePct: 18,
            base: 1000000,
            amount: 180000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "IndiaFilings (GST Council rates)",
        effectiveFrom: "2022-07-18",
      },
    },
  ],
};

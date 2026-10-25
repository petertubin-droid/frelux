/** ID tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for ID; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const ID: MarketTaxFixture = {
  market: "ID",
  currency: "IDR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "aec45f31-ed61-4815-b8ca-8f1eb43f3015",
        market_code: "ID",
        tax_kind: "consumption",
        tax_name: "Pajak Pertambahan Nilai (PPN)",
        rate_pct: 11.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis:
          "Standard VAT rate (12% applies only to luxury goods per the December 2024 scaled-back hike)",
        citation_title: "Indonesia waters down planned VAT hike",
        citation_url:
          "https://www.businesstimes.com.sg/international/indonesia-waters-down-planned-vat-hike-last-minute-move",
        citation_publisher: "Business Times / Bloomberg",
        effective_date: "2025-01-01",
        notes:
          "12% applies only to goods already subject to luxury tax; the general rate remains 11%.",
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
        taxPercent: 11,
        taxAmount: 110000,
        grandTotal: 1110000,
        components: [
          {
            name: "Pajak Pertambahan Nilai (PPN)",
            ratePct: 11,
            base: 1000000,
            amount: 110000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "Business Times / Bloomberg",
        effectiveFrom: "2025-01-01",
      },
    },
  ],
};

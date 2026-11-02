/** JP tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for JP; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const JP: MarketTaxFixture = {
  market: "JP",
  currency: "JPY",
  rows: {
    rules: [],
    catalog: [
      {
        id: "ff391706-82c7-41d0-9382-320369dc23f7",
        market_code: "JP",
        tax_kind: "consumption",
        tax_name: "\u6d88\u8cbb\u7a0e (Consumption Tax)",
        rate_pct: 10.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis:
          "Standard rate (8% reduced for food and non-alcoholic beverages)",
        citation_title: "Global VAT Rates by Country (July 2026)",
        citation_url:
          "https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/",
        citation_publisher: "VATupdate / National Tax Agency",
        effective_date: "2019-10-01",
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
            name: "\u6d88\u8cbb\u7a0e (Consumption Tax)",
            ratePct: 10,
            base: 1000000,
            amount: 100000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "VATupdate / National Tax Agency",
        effectiveFrom: "2019-10-01",
      },
    },
  ],
};

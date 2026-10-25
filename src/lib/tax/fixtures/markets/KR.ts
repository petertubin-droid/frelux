/** KR tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for KR; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const KR: MarketTaxFixture = {
  market: "KR",
  currency: "KRW",
  rows: {
    rules: [],
    catalog: [
      {
        id: "c01c8d98-5fdd-465a-8c72-e1a275b49757",
        market_code: "KR",
        tax_kind: "consumption",
        tax_name: "\ubd80\uac00\uac00\uce58\uc138 (Value Added Tax)",
        rate_pct: 10.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate on taxable supplies",
        citation_title: "Global VAT Rates by Country (July 2026)",
        citation_url:
          "https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/",
        citation_publisher: "VATupdate / NTS",
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
        taxPercent: 10,
        taxAmount: 100000,
        grandTotal: 1100000,
        components: [
          {
            name: "\ubd80\uac00\uac00\uce58\uc138 (Value Added Tax)",
            ratePct: 10,
            base: 1000000,
            amount: 100000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "VATupdate / NTS",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

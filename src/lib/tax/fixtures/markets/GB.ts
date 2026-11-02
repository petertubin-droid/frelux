/** GB tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for GB; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const GB: MarketTaxFixture = {
  market: "GB",
  currency: "GBP",
  rows: {
    rules: [],
    catalog: [
      {
        id: "8852aa81-ad50-419e-8777-38405566ec4e",
        market_code: "GB",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT)",
        rate_pct: 20.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis:
          "Standard rate on most goods and services incl. construction materials and services",
        citation_title: "VAT rates \u2014 GOV.UK",
        citation_url:
          "https://www.gov.uk/government/publications/vat-rates-notice-701/vat-rates-notice-701",
        citation_publisher: "HM Revenue & Customs",
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
        taxPercent: 20,
        taxAmount: 200000,
        grandTotal: 1200000,
        components: [
          {
            name: "Value Added Tax (VAT)",
            ratePct: 20,
            base: 1000000,
            amount: 200000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "HM Revenue & Customs",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

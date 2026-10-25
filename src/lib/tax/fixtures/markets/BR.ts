/** BR tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for BR; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const BR: MarketTaxFixture = {
  market: "BR",
  currency: "BRL",
  rows: {
    rules: [],
    catalog: [
      {
        id: "8fb8a077-7671-4501-aa77-4ca0f5371a61",
        market_code: "BR",
        tax_kind: "consumption",
        tax_name: "ISS (municipal service tax)",
        rate_pct: null,
        additional_levies_pct: 0.0,
        applies_to: "services",
        basis:
          "Construction services are taxed via municipal ISS at 2-5% depending on municipality and service type; IBS/CBS dual VAT transition began 2026",
        citation_title: "Brazil \u2014 Other taxes (ISS)",
        citation_url:
          "https://taxsummaries.pwc.com/brazil/corporate/other-taxes",
        citation_publisher: "PwC Worldwide Tax Summaries",
        effective_date: "2026-01-01",
        notes:
          "No single national rate; municipal rate must be confirmed per city. Materials are taxed via ICMS/IPI under the transitioning IBS/CBS regime.",
        is_active: true,
      },
    ],
  },
  scenarios: [
    {
      name: "services quote",
      appliesTo: "services",
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

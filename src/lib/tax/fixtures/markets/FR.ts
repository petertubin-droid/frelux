/** FR tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for FR; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const FR: MarketTaxFixture = {
  market: "FR",
  currency: "EUR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "4a099b3a-eb90-4a04-b9ad-e65451b87737",
        market_code: "FR",
        tax_kind: "consumption",
        tax_name: "Taxe sur la Valeur Ajout\u00e9e (TVA)",
        rate_pct: 20.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate (10%, 5.5%, 2.1% reduced)",
        citation_title: "Global VAT Rates by Country (July 2026)",
        citation_url:
          "https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/",
        citation_publisher:
          "VATupdate / Direction g\u00e9n\u00e9rale des Finances publiques",
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
            name: "Taxe sur la Valeur Ajout\u00e9e (TVA)",
            ratePct: 20,
            base: 1000000,
            amount: 200000,
            compoundedOn: null,
          },
        ],
        citationPublisher:
          "VATupdate / Direction g\u00e9n\u00e9rale des Finances publiques",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

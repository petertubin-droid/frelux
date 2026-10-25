/** IT tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for IT; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const IT: MarketTaxFixture = {
  market: "IT",
  currency: "EUR",
  rows: {
    rules: [],
    catalog: [
      {
        id: "d8d8406e-1fbb-4109-be4e-b55f58d794ac",
        market_code: "IT",
        tax_kind: "consumption",
        tax_name: "Imposta sul Valore Aggiunto (IVA)",
        rate_pct: 22.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate (10%, 5%, 4% reduced)",
        citation_title: "Global VAT Rates by Country (July 2026)",
        citation_url:
          "https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/",
        citation_publisher: "VATupdate / Agenzia delle Entrate",
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
        taxPercent: 22,
        taxAmount: 220000,
        grandTotal: 1220000,
        components: [
          {
            name: "Imposta sul Valore Aggiunto (IVA)",
            ratePct: 22,
            base: 1000000,
            amount: 220000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "VATupdate / Agenzia delle Entrate",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

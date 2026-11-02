/** MX tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for MX; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const MX: MarketTaxFixture = {
  market: "MX",
  currency: "MXN",
  rows: {
    rules: [],
    catalog: [
      {
        id: "c343593c-3503-4e6d-945f-7ea6c48aa340",
        market_code: "MX",
        tax_kind: "consumption",
        tax_name: "Impuesto al Valor Agregado (IVA)",
        rate_pct: 16.0,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "Standard rate (0% on food and medicine)",
        citation_title: "Global VAT Rates by Country (July 2026)",
        citation_url:
          "https://www.vatupdate.com/2026/07/25/global-vat-rates-by-country-2026-standard-and-reduced-rates/",
        citation_publisher: "VATupdate / SAT",
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
        taxPercent: 16,
        taxAmount: 160000,
        grandTotal: 1160000,
        components: [
          {
            name: "Impuesto al Valor Agregado (IVA)",
            ratePct: 16,
            base: 1000000,
            amount: 160000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "VATupdate / SAT",
        effectiveFrom: "2024-01-01",
      },
    },
  ],
};

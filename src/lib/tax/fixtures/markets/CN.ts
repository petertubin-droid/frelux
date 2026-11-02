/** CN tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for CN; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const CN: MarketTaxFixture = {
  market: "CN",
  currency: "CNY",
  rows: {
    rules: [],
    catalog: [
      {
        id: "95a30341-70eb-46a2-b974-27d94b89fb0a",
        market_code: "CN",
        tax_kind: "consumption",
        tax_name: "\u589e\u503c\u7a0e (VAT)",
        rate_pct: 13.0,
        additional_levies_pct: 0.0,
        applies_to: "materials",
        basis:
          "Standard VAT rate for sale of most goods including building materials",
        citation_title: "China VAT implementation regulations",
        citation_url:
          "https://www.dlapiper.com/en-us/insights/publications/2026/01/key-changes-in-the-new-implementation-regulations-of-the-china-value-added-tax-law",
        citation_publisher: "DLA Piper",
        effective_date: "2026-01-01",
        notes: null,
        is_active: true,
      },
      {
        id: "cb329610-6026-4c25-8dc7-b3c019570876",
        market_code: "CN",
        tax_kind: "consumption",
        tax_name: "\u589e\u503c\u7a0e (VAT)",
        rate_pct: 9.0,
        additional_levies_pct: 0.0,
        applies_to: "services",
        basis:
          "VAT rate for construction services (transportation, construction, real estate)",
        citation_title: "China VAT implementation regulations",
        citation_url:
          "https://www.dlapiper.com/en-us/insights/publications/2026/01/key-changes-in-the-new-implementation-regulations-of-the-china-value-added-tax-law",
        citation_publisher: "DLA Piper",
        effective_date: "2026-01-01",
        notes: null,
        is_active: true,
      },
    ],
  },
  scenarios: [
    {
      name: "materials quote",
      appliesTo: "materials",
      preTax: 1_000_000,
      // Captured from the deterministic engine on 2026-10-24.
      expected: {
        kind: "verified_rule",
        source: "market_catalog",
        taxPercent: 13,
        taxAmount: 130000,
        grandTotal: 1130000,
        components: [
          {
            name: "\u589e\u503c\u7a0e (VAT)",
            ratePct: 13,
            base: 1000000,
            amount: 130000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "DLA Piper",
        effectiveFrom: "2026-01-01",
      },
    },
    {
      name: "services quote",
      appliesTo: "services",
      preTax: 1_000_000,
      // Captured from the deterministic engine on 2026-10-24.
      expected: {
        kind: "verified_rule",
        source: "market_catalog",
        taxPercent: 9,
        taxAmount: 90000,
        grandTotal: 1090000,
        components: [
          {
            name: "\u589e\u503c\u7a0e (VAT)",
            ratePct: 9,
            base: 1000000,
            amount: 90000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "DLA Piper",
        effectiveFrom: "2026-01-01",
      },
    },
  ],
};

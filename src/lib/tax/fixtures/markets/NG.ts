/** NG tax fixture - authoritative rows as seeded in production.
 *
 * LOCAL VALIDATION: pending. Hand this fixture to an accountable
 * local reviewer for NG; see docs/TAX_FIXTURE_VALIDATION.md.
 * A verdict is recorded in tax_rule_validations, not here.
 */
import type { MarketTaxFixture } from "../types";

export const NG: MarketTaxFixture = {
  market: "NG",
  currency: "NGN",
  rows: {
    rules: [
      {
        id: "cfad156e-f759-4a2f-8a77-4ebbb8d377a4",
        rule_code: "NG-VAT-FED",
        version: 1,
        market_code: "NG",
        jurisdiction_level: "national",
        jurisdiction_code: "NG",
        tax_category: "consumption",
        tax_name: "Value Added Tax (VAT)",
        components: [
          {
            name: "VAT",
            rate_pct: 7.5,
            compound_on: null,
          },
        ],
        basis_inclusive: false,
        taxable_base_definition:
          "Taxable supplies of goods and services in Nigeria (VAT Act); zero-rated and exempt supplies excluded from the base.",
        rounding_method: "half_up",
        exemption_handling: "excluded_from_base",
        unknown_handling: "not_determined",
        applies_to: "both",
        effective_from: "2019-02-01",
        effective_to: null,
        source_title:
          "Value Added Tax Act 1993 (as amended by Finance Act 2019) \u2014 7.5% VAT",
        source_url: "https://firs.gov.ng/",
        source_publisher: "Federal Inland Revenue Service (FIRS)",
        reviewer_name:
          "FRELUX Tax Review (catalog backfill, web-verified 2026-10-15)",
        next_review_date: "2027-02-01",
        is_active: true,
      },
    ],
    catalog: [
      {
        id: "638a35ef-a73e-4868-85be-55a53d64fec9",
        market_code: "NG",
        tax_kind: "consumption",
        tax_name: "Value Added Tax (VAT)",
        rate_pct: 7.5,
        additional_levies_pct: 0.0,
        applies_to: "both",
        basis: "VAT on taxable supplies of goods and services",
        citation_title: "FIRS Value Added Tax",
        citation_url: "https://www.firs.gov.ng/",
        citation_publisher: "Federal Inland Revenue Service",
        effective_date: "2019-02-01",
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
        source: "jurisdiction_rule",
        taxPercent: 7.5,
        taxAmount: 75000,
        grandTotal: 1075000,
        components: [
          {
            name: "VAT",
            ratePct: 7.5,
            base: 1000000,
            amount: 75000,
            compoundedOn: null,
          },
        ],
        citationPublisher: "Federal Inland Revenue Service (FIRS)",
        effectiveFrom: "2019-02-01",
      },
    },
  ],
};

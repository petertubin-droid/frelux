/**
 * Margin Engine tests (Future Engine 8)
 *
 * Every expected value below is hand-verified.
 */

import { describe, it, expect } from "vitest";
import { calculateMargin, type MarginInput } from "./margin-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rule = (
  key: string,
  value: unknown,
  isActive = true,
): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "margin",
    rule_value: { value },
    rule_status: "verified_frelux",
    description: null,
    is_active: isActive,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const defaultRules = () => [
  rule("rounding_decimals", 2),
  rule("vat_rate", 7.5),
];

const input = (over: Partial<MarginInput> = {}): MarginInput => ({
  base_cost: 1_000_000,
  margin_percent: 25,
  basis: "markup_on_cost",
  rules: defaultRules(),
  ...over,
});

describe("calculateMargin", () => {
  it("marks up on cost deterministically (hand-verified)", () => {
    // profit = 1,000,000 × 25% = 250,000 → subtotal 1,250,000
    // VAT 7.5% = 93,750 → quote total 1,343,750
    const r = calculateMargin(input());
    expect(r.ok).toBe(true);
    expect(r.profit).toBe(250000);
    expect(r.priced_subtotal).toBe(1250000);
    expect(r.vat_rate).toBe(7.5);
    expect(r.vat_amount).toBe(93750);
    expect(r.quote_total).toBe(1343750);
    expect(r.equivalent_other_basis_percent).toBe(20); // 250,000 / 1,250,000
    expect(r.warnings).toHaveLength(0);
    expect(r.steps[0].detail).toMatch(/percent applies to the COST/);
  });

  it("prices a margin-on-price preset differently from markup (hand-verified)", () => {
    // price = 1,000,000 ÷ (1 − 25%) = 1,333,333.33; profit = 333,333.33
    // VAT 7.5% × 1,333,333.33 = 100,000.00 (rounded) → total 1,433,333.33
    const r = calculateMargin(input({ basis: "margin_on_price" }));
    expect(r.ok).toBe(true);
    expect(r.priced_subtotal).toBe(1333333.33);
    expect(r.profit).toBe(333333.33);
    expect(r.vat_amount).toBe(100000);
    expect(r.quote_total).toBe(1433333.33);
    expect(r.equivalent_other_basis_percent).toBe(33.33); // 333,333.33 / 1,000,000 ≈ 33.33
    expect(r.steps[0].detail).toMatch(/percent applies to the PRICE/);
  });

  it("the same percent yields the same money only when the basis matches (hand-verified)", () => {
    const markup = calculateMargin(input());
    const onPrice = calculateMargin(input({ basis: "margin_on_price" }));
    expect(markup.priced_subtotal).toBe(1250000);
    expect(onPrice.priced_subtotal).toBe(1333333.33);
    // and the cross-check closes the loop:
    expect(onPrice.equivalent_other_basis_percent).toBe(33.33);
  });

  it("applies zero VAT cleanly when the rule is configured as 0", () => {
    const r = calculateMargin(
      input({ rules: [rule("rounding_decimals", 2), rule("vat_rate", 0)] }),
    );
    expect(r.ok).toBe(true);
    expect(r.vat_amount).toBe(0);
    expect(r.quote_total).toBe(1250000);
    expect(r.warnings).toHaveLength(0);
  });

  it("omits the VAT line with a warning when the rule is absent — never guesses", () => {
    const r = calculateMargin(input({ rules: [rule("rounding_decimals", 2)] }));
    expect(r.ok).toBe(true);
    expect(r.vat_rate).toBeNull();
    expect(r.vat_amount).toBeNull();
    expect(r.quote_total).toBe(1250000);
    expect(r.warnings.join(" ")).toMatch(
      /without a VAT line rather than guessing one/,
    );
  });

  it("ignores an out-of-range VAT rule and warns (no silent application)", () => {
    const r = calculateMargin(
      input({ rules: [rule("rounding_decimals", 2), rule("vat_rate", 120)] }),
    );
    expect(r.ok).toBe(true);
    expect(r.vat_rate).toBeNull();
    expect(r.quote_total).toBe(1250000);
    expect(r.warnings.join(" ")).toMatch(
      /was ignored — invalid configuration is never silently applied/,
    );
  });

  it("honours an inactive VAT rule by warning instead of applying", () => {
    const r = calculateMargin(
      input({
        rules: [rule("rounding_decimals", 2), rule("vat_rate", 7.5, false)],
      }),
    );
    expect(r.vat_rate).toBeNull();
    expect(r.quote_total).toBe(1250000);
  });

  it("refuses a margin-on-price percent of 100 or more (mathematically impossible)", () => {
    const r = calculateMargin(
      input({ basis: "margin_on_price", margin_percent: 100 }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/mathematically impossible/);
    expect(
      calculateMargin(input({ basis: "margin_on_price", margin_percent: 150 }))
        .ok,
    ).toBe(false);
  });

  it("refuses invalid inputs instead of guessing", () => {
    expect(calculateMargin(input({ base_cost: 0 })).ok).toBe(false);
    expect(calculateMargin(input({ base_cost: -5 })).ok).toBe(false);
    expect(calculateMargin(input({ base_cost: NaN })).ok).toBe(false);
    expect(calculateMargin(input({ margin_percent: 0 })).ok).toBe(false);
    expect(calculateMargin(input({ margin_percent: -10 })).ok).toBe(false);
    const bad = calculateMargin(input({ basis: "guess" as never }));
    expect(bad.ok).toBe(false);
    expect(bad.warnings.join(" ")).toMatch(/never guesses which one you meant/);
  });

  it("rounds fractional money per the decimals rule (hand-verified)", () => {
    // cost 100,000 × 33.33% markup = 33,330 → 133,330; VAT 7.5% = 9,999.75 → 143,329.75
    const r = calculateMargin(
      input({ base_cost: 100000, margin_percent: 33.33 }),
    );
    expect(r.profit).toBe(33330);
    expect(r.priced_subtotal).toBe(133330);
    expect(r.vat_amount).toBe(9999.75);
    expect(r.quote_total).toBe(143329.75);
  });
});

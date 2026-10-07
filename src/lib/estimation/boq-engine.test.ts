/**
 * BOQ / Quote Generator Engine tests (Future Engine 2)
 *
 * Every expected value below is hand-verified. The engine is
 * deterministic: DB-configured rates in → identical quote out.
 */

import { describe, it, expect } from "vitest";
import { generateBoq, type BoqInput, type BoqLineItem } from "./boq-engine";
import type { EstimationCalcRule } from "@/types/estimation";

const rule = (key: string, rate: number, active = true): EstimationCalcRule =>
  ({
    id: `r-${key}`,
    rule_key: key,
    calculator_type: "boq",
    rule_value: { rate },
    rule_status: "verified_frelux",
    description: null,
    is_active: active,
    sort_order: 0,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }) as unknown as EstimationCalcRule;

const item = (over: Partial<BoqLineItem> = {}): BoqLineItem => ({
  description: "Emulsion paint: living room",
  quantity: 2,
  unit: "coats",
  unit_cost: 50000,
  source_estimate_ref: "PNT-ABC123",
  source_calculator_type: "paint",
  ...over,
});

const input = (over: Partial<BoqInput> = {}): BoqInput => ({
  title: "3-bedroom repaint",
  client_name: "Mrs Ada Obi",
  currency: "NGN",
  items: [
    item(), // 2 × 50,000 = 100,000
    item({
      description: "POP ceiling",
      quantity: 1,
      unit_cost: 150000,
      source_estimate_ref: "POP-XY1",
    }), // 150,000
  ],
  rules: [rule("vat_rate", 7.5), rule("contingency_rate", 5)],
  ...over,
});

describe("generateBoq", () => {
  it("computes the hand-verified quote with configured rates", () => {
    // Subtotal: 100,000 + 150,000 = 250,000
    // Contingency 5%: 12,500 → base 262,500
    // VAT 7.5% of 262,500: 19,687.5 → grand total 282,187.5
    const r = generateBoq(input());
    expect(r.ok).toBe(true);
    expect(r.totals).toEqual({
      subtotal: 250000,
      contingency_rate: 5,
      contingency_amount: 12500,
      vat_rate: 7.5,
      vat_amount: 19687.5,
      grand_total: 282187.5,
    });
    expect(r.warnings).toHaveLength(0);
  });

  it("refuses an empty quote", () => {
    const r = generateBoq(input({ items: [] }));
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/at least one line item/i);
  });

  it("refuses without a client name or title", () => {
    expect(generateBoq(input({ client_name: " " })).ok).toBe(false);
    expect(generateBoq(input({ title: "" })).ok).toBe(false);
  });

  it("refuses a line without a source reference (quotes must be replayable)", () => {
    const r = generateBoq(
      input({ items: [item({ source_estimate_ref: " " })] }),
    );
    expect(r.ok).toBe(false);
    expect(r.warnings[0]).toMatch(/no source reference/i);
  });

  it("refuses bad quantities and unit costs with a specific message", () => {
    const q = generateBoq(input({ items: [item({ quantity: 0 })] }));
    expect(q.ok).toBe(false);
    expect(q.warnings[0]).toMatch(/positive number/i);
    const uc = generateBoq(input({ items: [item({ unit_cost: -1 })] }));
    expect(uc.ok).toBe(false);
  });

  it("produces the quote WITHOUT unconfigured rate lines instead of guessing them", () => {
    const r = generateBoq(input({ rules: [] }));
    expect(r.ok).toBe(true);
    expect(r.totals?.subtotal).toBe(250000);
    expect(r.totals?.contingency_rate).toBeNull();
    expect(r.totals?.vat_rate).toBeNull();
    expect(r.totals?.grand_total).toBe(250000);
    expect(r.warnings.join(" ")).toMatch(/No contingency rate is configured/);
    expect(r.warnings.join(" ")).toMatch(/No VAT rate is configured/);
  });

  it("honours explicit overrides over DB defaults and records the source", () => {
    const r = generateBoq(input({ contingency_override: 10, vat_override: 0 }));
    // Contingency 10% = 25,000 → base 275,000; VAT 0% → 0 → grand 275,000
    expect(r.totals?.contingency_amount).toBe(25000);
    expect(r.totals?.vat_amount).toBe(0);
    expect(r.totals?.grand_total).toBe(275000);
    expect(r.rates_snapshot).toMatchObject({
      contingency_rate: 10,
      contingency_source: "override",
      vat_rate: 0,
      vat_source: "override",
    });
  });

  it("ignores inactive rules", () => {
    const r = generateBoq(
      input({
        rules: [
          rule("vat_rate", 7.5, false),
          rule("contingency_rate", 5, false),
        ],
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.totals?.vat_rate).toBeNull();
    expect(r.totals?.contingency_rate).toBeNull();
  });

  it("rejects out-of-range rates", () => {
    expect(generateBoq(input({ vat_override: 100 })).ok).toBe(false);
    expect(generateBoq(input({ contingency_override: -1 })).ok).toBe(false);
  });

  it("rounds every money value to 2 decimals", () => {
    const r = generateBoq(
      input({
        items: [item({ quantity: 3, unit_cost: 3333.333 })], // 9999.999 → 10,000
        vat_override: 7.5,
        contingency_override: 0,
      }),
    );
    expect(r.totals?.subtotal).toBe(10000);
    expect(r.totals?.vat_amount).toBe(750);
    expect(r.totals?.grand_total).toBe(10750);
  });
});

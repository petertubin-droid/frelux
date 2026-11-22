// =========================================================
// FOUNDATION COST ESTIMATE CONFORMANCE (audit #22)
//
// Audit #1 covered the engine's mix and block arithmetic. This covers the money
// layer the page actually shows: line totals, the priced subtotal, and the rule
// that an incomplete estimate reports no material total rather than a partial
// one that reads as complete.
// =========================================================
import { describe, expect, it } from "vitest";
import {
  calculateFoundation,
  type FoundationInput,
  type FoundationPriceMap,
} from "../foundation-engine";

const PRICES: FoundationPriceMap = {
  "cement-per-bag": 9000,
  "sand-per-m3": 25000,
  "granite-per-m3": 45000,
  "hardcore-per-m3": 18000,
  "block-per-piece": 450,
  "formwork-per-m2": 3500,
};

function input(over: Partial<FoundationInput> = {}): FoundationInput {
  return {
    concrete_volume_m3: null,
    block_wall_area_m2: null,
    hardcore_volume_m3: null,
    formwork_area_m2: null,
    labour: { mode: "none" },
    ...over,
  } as FoundationInput;
}

// 9.25 blocks/m2 is the 450 x 225 mm sandcrete module with a 10 mm joint. The
// engine refuses to guess this, so a "complete" estimate has to supply it.
const RULES = {
  mix_ratio: { cement: 1, sand: 2, granite: 4 },
  concrete_waste_pct: 0,
  blocks_per_m2: 9.25,
} as never;

const round2 = (n: number) => Math.round(n * 100) / 100;

describe("foundation cost: line totals", () => {
  it("prices every sized line as quantity times unit price", () => {
    const r = calculateFoundation(
      input({ concrete_volume_m3: 5, block_wall_area_m2: 40 }),
      RULES,
      PRICES,
    );
    expect(r.ok).toBe(true);
    for (const line of r.lines) {
      if (line.quantity !== null && line.unit_price !== null) {
        expect(line.line_total, line.key).toBeCloseTo(
          round2(line.quantity * line.unit_price),
          2,
        );
      }
    }
  });

  it("makes the priced subtotal the sum of the line totals", () => {
    const r = calculateFoundation(
      input({ concrete_volume_m3: 5, block_wall_area_m2: 40 }),
      RULES,
      PRICES,
    );
    const summed = round2(r.lines.reduce((s, l) => s + (l.line_total ?? 0), 0));
    expect(r.priced_subtotal).toBeCloseTo(summed, 2);
  });
});

describe("foundation cost: honesty when prices are missing", () => {
  it("reports no material subtotal rather than a partial one", () => {
    const r = calculateFoundation(
      input({ concrete_volume_m3: 5, block_wall_area_m2: 40 }),
      RULES,
      {},
    );
    expect(r.priced_subtotal).toBe(0);
    expect(r.material_subtotal).toBeNull();
    expect(r.incomplete).toBe(true);
  });

  it("names every sized line it could not price", () => {
    const r = calculateFoundation(input({ concrete_volume_m3: 5 }), RULES, {});
    const sized = r.lines.filter((l) => l.quantity !== null);
    const named = r.warnings.filter((w) => w.includes("PRICE NOT CONFIGURED"));
    expect(sized.length).toBeGreaterThan(0);
    expect(named.length).toBeGreaterThan(0);
  });

  it("keeps the quantity visible when the price is absent", () => {
    const r = calculateFoundation(input({ concrete_volume_m3: 5 }), RULES, {});
    const cement = r.lines.find((l) => l.key.includes("cement"));
    expect(cement?.quantity).not.toBeNull();
    expect(cement?.unit_price).toBeNull();
    expect(cement?.line_total).toBeNull();
  });

  it("reports a grand total only when the estimate is complete", () => {
    const partial = calculateFoundation(
      input({ concrete_volume_m3: 5 }),
      RULES,
      {},
    );
    expect(partial.incomplete).toBe(true);
    expect(partial.grand_total).toBeNull();

    const complete = calculateFoundation(
      input({
        concrete_volume_m3: 5,
        block_wall_area_m2: 40,
        hardcore_volume_m3: 6,
        formwork_area_m2: 12,
      }),
      RULES,
      PRICES,
    );
    expect(complete.incomplete).toBe(false);
    expect(complete.grand_total).not.toBeNull();
  });

  it("does not add labour to the material total", () => {
    const r = calculateFoundation(
      input({
        concrete_volume_m3: 5,
        block_wall_area_m2: 40,
        hardcore_volume_m3: 6,
        formwork_area_m2: 12,
      }),
      RULES,
      PRICES,
    );
    // Labour mode "none" contributes nothing, so the grand total is materials.
    expect(r.labour_total).toBe(0);
    expect(r.grand_total).toBeCloseTo(r.material_subtotal as number, 2);
  });
});

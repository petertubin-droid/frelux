/**
 * Conduit & wiring conformance (services audit 2, ledger #30).
 *
 * The engine is an empirical material takeoff, not circuit design, and says so.
 * The audit therefore checks the arithmetic, the purchase rounding and the
 * guards that keep a bad admin rule from producing an Infinity or a credit.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONDUIT_WIRING_RULES,
  calculateConduitWiring,
  type ConduitWiringRules,
} from "./conduit-wiring-engine";

const input = (
  over: Partial<{
    floor_area_m2: number;
    lighting_points: number;
    socket_points: number;
  }> = {},
) => ({
  floor_area_m2: 100,
  lighting_points: 20,
  socket_points: 10,
  ...over,
});

const rules = (over: Partial<ConduitWiringRules> = {}): ConduitWiringRules => ({
  ...DEFAULT_CONDUIT_WIRING_RULES,
  ...over,
});

const PRICES = {
  "elec-conduit": 3500,
  "elec-cable-lighting": 42000,
  "elec-cable-socket": 65000,
  "elec-junction-box": 900,
  "elec-switch-plate": 2500,
  "elec-socket-outlet": 4000,
};

describe("conduit run and purchase rounding", () => {
  it("sizes conduit from floor area and rounds up to whole lengths", () => {
    const r = calculateConduitWiring(input(), rules(), PRICES);
    // 100 m2 x 1.8 = 180 m of run; 180 / 2.9 = 62.07 -> 63 lengths.
    const conduit = r.lines.find((l) => l.key === "conduit");
    expect(conduit?.quantity).toBe(63);
    expect(conduit?.unit).toBe("lengths");
  });

  it("never rounds a part length down", () => {
    const r = calculateConduitWiring(
      input({ floor_area_m2: 1 }),
      rules({ conduit_per_m2: 1, conduit_length_m: 3 }),
      PRICES,
    );
    // 1 m of run in 3 m lengths is one length, not zero.
    expect(r.lines.find((l) => l.key === "conduit")?.quantity).toBe(1);
  });
});

describe("cable coils and accessories", () => {
  it("buys whole 100 m coils for each cable size", () => {
    const r = calculateConduitWiring(input(), rules(), PRICES);
    // 20 points x 12 m = 240 m -> 3 coils; 10 points x 18 m = 180 m -> 2 coils.
    expect(r.lines.find((l) => l.key === "lighting_cable")?.quantity).toBe(3);
    expect(r.lines.find((l) => l.key === "socket_cable")?.quantity).toBe(2);
  });

  it("prices one switch plate per lighting point and one outlet per socket point", () => {
    const r = calculateConduitWiring(input(), rules(), PRICES);
    expect(r.lines.find((l) => l.key === "switch_plates")?.quantity).toBe(20);
    expect(r.lines.find((l) => l.key === "socket_outlets")?.quantity).toBe(10);
    expect(
      r.lines.find((l) => l.key === "switch_plates")?.quantity_source,
    ).toBe("user_provided");
  });

  it("rounds junction boxes up from the configured allowance", () => {
    const r = calculateConduitWiring(input(), rules(), PRICES);
    // 30 points x 1.15 = 34.5 -> 35 boxes.
    expect(r.lines.find((l) => l.key === "junction_boxes")?.quantity).toBe(35);
  });
});

describe("guards against bad admin rules", () => {
  it("refuses a zero conduit piece length instead of emitting Infinity", () => {
    const r = calculateConduitWiring(
      input(),
      rules({ conduit_length_m: 0 }),
      PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/conduit_length_m/);
  });

  it("refuses a negative or NaN cable allowance instead of pricing a credit", () => {
    for (const bad of [
      rules({ lighting_cable_per_point_m: -1 }),
      rules({ socket_cable_per_point_m: Number.NaN }),
      rules({ junction_per_point: -0.5 }),
    ]) {
      const r = calculateConduitWiring(input(), bad, PRICES);
      expect(r.ok).toBe(false);
    }
  });

  it("refuses non-integer or negative point counts", () => {
    expect(
      calculateConduitWiring(input({ lighting_points: 2.5 }), rules(), PRICES)
        .ok,
    ).toBe(false);
    expect(
      calculateConduitWiring(input({ socket_points: -1 }), rules(), PRICES).ok,
    ).toBe(false);
    expect(
      calculateConduitWiring(input({ floor_area_m2: 0 }), rules(), PRICES).ok,
    ).toBe(false);
  });
});

describe("honesty of the totals", () => {
  it("prices every line when the price book is complete", () => {
    const r = calculateConduitWiring(input(), rules(), PRICES);
    expect(r.material_subtotal).not.toBeNull();
    expect(r.incomplete).toBe(false);
    // 63x3500 + 3x42000 + 2x65000 + 35x900 + 20x2500 + 10x4000
    expect(r.material_subtotal).toBe(
      220500 + 126000 + 130000 + 31500 + 50000 + 40000,
    );
  });

  it("withholds the subtotal when a price is missing rather than inventing one", () => {
    const r = calculateConduitWiring(input(), rules(), {
      "elec-conduit": 3500,
    });
    expect(r.material_subtotal).toBeNull();
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("says out loud that it is not circuit design", () => {
    const r = calculateConduitWiring(input(), rules(), PRICES);
    expect(r.warnings.join(" ")).toMatch(
      /not measured routes|planning allowances/i,
    );
    expect(r.warnings.join(" ")).toMatch(/licensed electrician/i);
  });

  it("warns when no points are entered so only conduit is sized", () => {
    const r = calculateConduitWiring(
      input({ lighting_points: 0, socket_points: 0 }),
      rules(),
      PRICES,
    );
    expect(r.warnings.join(" ")).toMatch(/No points were entered/);
  });
});

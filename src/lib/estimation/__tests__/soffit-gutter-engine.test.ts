import { describe, expect, it } from "vitest";
import {
  BUNGALOW_TEMPLATE,
  calculateSoffitGutter,
  DEFAULT_SOFFIT_GUTTER_RULES,
  resolveEavesPerimeter,
  type SoffitGutterInput,
} from "../soffit-gutter-engine";

const base: SoffitGutterInput = {
  mode: "perimeter",
  perimeter_m: 65,
  overhang_m: 0.6,
  material: "aluminium",
};

describe("eaves perimeter", () => {
  it("uses a measured perimeter as given", () => {
    expect(resolveEavesPerimeter(base)).toBe(65);
  });

  it("derives the same perimeter the roof engine uses from a footprint", () => {
    expect(
      resolveEavesPerimeter({
        mode: "footprint",
        building_length_m: 10,
        building_width_m: 8,
        overhang_m: 0.6,
        material: "aluminium",
      }),
    ).toBe(40.8);
  });

  it("reports a missing measurement instead of assuming a building size", () => {
    expect(resolveEavesPerimeter({ ...base, perimeter_m: null })).toBeNull();
    expect(
      resolveEavesPerimeter({
        mode: "footprint",
        building_length_m: 10,
        building_width_m: null,
        overhang_m: 0.6,
        material: "aluminium",
      }),
    ).toBeNull();
  });
});

describe("soffit and gutter takeoff", () => {
  const prices = {
    "fascia-per-meter": 3000,
    "gutter-per-meter": 4500,
    "soffit-panel-aluminium-per-m2": 9000,
    "downpipe-per-piece": 7000,
    "gutter-bracket-per-piece": 900,
  };

  it("applies the 5% waste and rounds discrete items up", () => {
    const r = calculateSoffitGutter(base, DEFAULT_SOFFIT_GUTTER_RULES, prices);
    const qty = Object.fromEntries(r.lines.map((l) => [l.key, l.quantity]));
    expect(qty.fascia).toBe(68.25);
    expect(qty.gutter).toBe(68.25);
    expect(qty.soffit).toBe(40.95);
    expect(qty.downpipes).toBe(6);
    expect(qty.brackets).toBe(114);
  });

  it("switches the soffit material without changing the quantity", () => {
    const alu = calculateSoffitGutter(
      base,
      DEFAULT_SOFFIT_GUTTER_RULES,
      prices,
    );
    const pvc = calculateSoffitGutter(
      { ...base, material: "pvc" },
      DEFAULT_SOFFIT_GUTTER_RULES,
      prices,
    );
    const aluLine = alu.lines.find((l) => l.key === "soffit");
    const pvcLine = pvc.lines.find((l) => l.key === "soffit");
    expect(aluLine?.material_slug).toBe("soffit-panel-aluminium-per-m2");
    expect(pvcLine?.material_slug).toBe("soffit-panel-pvc-per-m2");
    expect(pvcLine?.quantity).toBe(aluLine?.quantity);
  });

  it("matches the saved bungalow template figures", () => {
    const r = calculateSoffitGutter(
      {
        mode: "perimeter",
        perimeter_m: BUNGALOW_TEMPLATE.perimeter_m,
        overhang_m: BUNGALOW_TEMPLATE.overhang_m,
        material: "aluminium",
      },
      DEFAULT_SOFFIT_GUTTER_RULES,
      prices,
    );
    expect(r.ok).toBe(true);
    expect(r.lines.find((l) => l.key === "soffit")?.quantity).toBe(40.95);
  });

  it("leaves money out when a material has no price", () => {
    const r = calculateSoffitGutter(base, DEFAULT_SOFFIT_GUTTER_RULES, {
      "fascia-per-meter": 3000,
    });
    expect(r.material_subtotal).toBeNull();
    expect(r.missing).toContain("Rainwater gutter");
    expect(r.priced_subtotal).toBe(Math.round(68.25 * 3000 * 100) / 100);
  });

  it("flags that a wall measurement is not an eaves measurement", () => {
    const r = calculateSoffitGutter(base, DEFAULT_SOFFIT_GUTTER_RULES, prices);
    expect(r.warnings.join(" ")).toContain(
      "Measure the perimeter at the eaves line",
    );
    expect(r.tax_status).toBe("tax_not_determined");
  });

  it("refuses to guess a perimeter", () => {
    const r = calculateSoffitGutter(
      { ...base, perimeter_m: null },
      DEFAULT_SOFFIT_GUTTER_RULES,
      prices,
    );
    expect(r.ok).toBe(false);
    expect(r.lines).toHaveLength(0);
  });
});

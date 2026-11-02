import { describe, expect, it } from "vitest";
import {
  calculateRetainingWall,
  DEFAULT_RETAINING_WALL_RULES,
  parseRetainingWallRules,
  retainingWallGeometry,
  type RetainingWallInput,
} from "../retaining-wall-engine";

const base: RetainingWallInput = {
  length_m: 10,
  height_m: 1.8,
  soil_type: "stable",
  stem_type: "block",
};

const prices = {
  "cement-per-bag": 12500,
  "sand-per-m3": 22000,
  "granite-per-m3": 28000,
  "block-per-piece": 800,
  "rebar-12mm-per-length": 9500,
  "weep-hole-pipe-per-piece": 1500,
};

describe("retaining wall geometry", () => {
  it("uses the base footing width on stable soil", () => {
    const geo = retainingWallGeometry(base, DEFAULT_RETAINING_WALL_RULES);
    expect(geo.footing_width_m).toBe(0.6);
    expect(geo.recommended_footing_width_m).toBe(0.6);
    expect(geo.footing_overridden).toBe(false);
    expect(geo.footing_concrete_m3).toBe(1.2);
  });

  it("widens the recommended footing by 30% on wet clay", () => {
    const geo = retainingWallGeometry(
      { ...base, soil_type: "wet_clay" },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.footing_factor).toBe(1.3);
    expect(geo.recommended_footing_width_m).toBe(0.78);
    expect(geo.footing_concrete_m3).toBe(1.56);
  });

  it("keeps a contractor override and says it was overridden", () => {
    const geo = retainingWallGeometry(
      { ...base, soil_type: "wet_clay", footing_width_override_m: 0.5 },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.footing_width_m).toBe(0.5);
    expect(geo.recommended_footing_width_m).toBe(0.78);
    expect(geo.footing_overridden).toBe(true);
  });

  it("adds the poured stem volume only for a concrete stem", () => {
    const block = retainingWallGeometry(base, DEFAULT_RETAINING_WALL_RULES);
    const concrete = retainingWallGeometry(
      { ...base, stem_type: "concrete" },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(block.stem_concrete_m3).toBe(0);
    expect(concrete.stem_concrete_m3).toBe(2.7);
    expect(concrete.concrete_m3).toBe(3.9);
  });
});

describe("retaining wall takeoff", () => {
  it("sizes concrete, blocks, rebar and weep holes from the visible rules", () => {
    const r = calculateRetainingWall(
      base,
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    const qty = Object.fromEntries(r.lines.map((l) => [l.key, l.quantity]));
    expect(r.ok).toBe(true);
    expect(qty.cement).toBe(8); // 1.2 m3 x 6.34 bags
    expect(qty.sand).toBe(0.53);
    expect(qty.granite).toBe(1.06);
    expect(qty.blocks).toBe(198); // 18 m2 x 10 x 1.1
    expect(qty.rebar).toBe(5); // 26 bars x 2.1 m = 54.6 m -> 5 lengths of 12 m
    expect(qty.weep_holes).toBe(7);
  });

  it("prices the lines and totals them", () => {
    const r = calculateRetainingWall(
      base,
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    const cement = r.lines.find((l) => l.key === "cement");
    expect(cement?.unit_price).toBe(12500);
    expect(cement?.line_total).toBe(100000);
    expect(r.material_subtotal).not.toBeNull();
    expect(r.grand_total).toBe(r.material_subtotal);
  });

  it("never invents a price it was not given", () => {
    const r = calculateRetainingWall(base, DEFAULT_RETAINING_WALL_RULES, {});
    expect(r.material_subtotal).toBeNull();
    expect(r.grand_total).toBeNull();
    expect(r.incomplete).toBe(true);
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.warnings.join(" ")).toContain("no configured price");
  });

  it("always reports tax as not determined", () => {
    const r = calculateRetainingWall(
      base,
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    expect(r.tax_status).toBe("tax_not_determined");
  });

  it("warns on tall walls and on wet clay", () => {
    const r = calculateRetainingWall(
      { ...base, height_m: 3, soil_type: "wet_clay" },
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    const text = r.warnings.join(" ");
    expect(text).toContain("structural engineer");
    expect(text).toContain("Wet clay");
  });

  it("refuses to calculate without a length, height or soil type", () => {
    const r = calculateRetainingWall(
      { ...base, length_m: 0 },
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("Wall length");
  });

  it("takes rule overrides from the admin table", () => {
    const rules = parseRetainingWallRules([
      { rule_key: "footing_width_m", rule_value: { value: 0.9 } },
      { rule_key: "blocks_per_m2", rule_value: { value: 10 } },
    ]);
    expect(rules.footing_width_m).toBe(0.9);
    expect(rules.weep_spacing_m).toBe(
      DEFAULT_RETAINING_WALL_RULES.weep_spacing_m,
    );
  });
});

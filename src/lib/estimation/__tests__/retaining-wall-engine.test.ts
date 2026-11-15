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
  it("lets the retained height set the base width on stable soil", () => {
    // stable ratio 0.55 x 1.8 m retained height = 0.99 m, which is wider than
    // the 0.60 m rule, so the geotechnical term governs.
    const geo = retainingWallGeometry(base, DEFAULT_RETAINING_WALL_RULES);
    expect(geo.rule_based_width_m).toBe(0.6);
    expect(geo.height_based_width_m).toBe(0.99);
    expect(geo.recommended_footing_width_m).toBe(0.99);
    expect(geo.footing_width_m).toBe(0.99);
    expect(geo.footing_overridden).toBe(false);
    // 10 x 0.99 x 0.20 = 1.98 m3
    expect(geo.footing_concrete_m3).toBe(1.98);
  });

  it("keeps the configured rule for a wall too low for the height term", () => {
    // 1.0 m wall: 0.55 x 1.0 = 0.55 m is below the 0.60 m rule.
    const geo = retainingWallGeometry(
      { ...base, height_m: 1 },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.height_based_width_m).toBe(0.55);
    expect(geo.recommended_footing_width_m).toBe(0.6);
  });

  it("widens a tall wall with the retained height, not the soil factor alone", () => {
    // 3.0 m wall on stable soil: 0.55 x 3.0 = 1.65 m, against 0.60 m from the rule.
    const geo = retainingWallGeometry(
      { ...base, height_m: 3 },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.recommended_footing_width_m).toBe(1.65);
    // 10 x 1.65 x 0.20 = 3.30 m3
    expect(geo.footing_concrete_m3).toBe(3.3);
  });

  it("widens the recommended footing on wet clay", () => {
    const geo = retainingWallGeometry(
      { ...base, soil_type: "wet_clay" },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.footing_factor).toBe(1.3);
    // rule 0.60 x 1.3 = 0.78 m; wet clay ratio 0.75 x 1.8 m = 1.35 m governs.
    expect(geo.rule_based_width_m).toBe(0.78);
    expect(geo.height_based_width_m).toBe(1.35);
    expect(geo.recommended_footing_width_m).toBe(1.35);
    // 10 x 1.35 x 0.20 = 2.70 m3
    expect(geo.footing_concrete_m3).toBe(2.7);
  });

  it("keeps a contractor override and says it was overridden", () => {
    const geo = retainingWallGeometry(
      { ...base, soil_type: "wet_clay", footing_width_override_m: 0.5 },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.footing_width_m).toBe(0.5);
    expect(geo.recommended_footing_width_m).toBe(1.35);
    expect(geo.footing_overridden).toBe(true);
  });

  it("does not report the recommended width typed back in as an override", () => {
    const geo = retainingWallGeometry(
      { ...base, footing_width_override_m: 0.99 },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(geo.footing_overridden).toBe(false);
  });

  it("adds the poured stem volume only for a concrete stem", () => {
    const block = retainingWallGeometry(base, DEFAULT_RETAINING_WALL_RULES);
    const concrete = retainingWallGeometry(
      { ...base, stem_type: "concrete" },
      DEFAULT_RETAINING_WALL_RULES,
    );
    expect(block.stem_concrete_m3).toBe(0);
    // 10 x 0.15 x 1.8 = 2.70 m3 stem
    expect(concrete.stem_concrete_m3).toBe(2.7);
    // footing 1.98 + stem 2.70 = 4.68 m3
    expect(concrete.concrete_m3).toBe(4.68);
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
    // 1.98 m3 x 6.34 bags = 12.55, rounded up to 13 bags
    expect(qty.cement).toBe(13);
    expect(qty.sand).toBe(0.87); // 1.98 x 0.44
    expect(qty.granite).toBe(1.74); // 1.98 x 0.88
    expect(qty.blocks).toBe(198); // 18 m2 x 10 x 1.1
    expect(qty.rebar).toBe(5); // 26 bars x 2.1 m = 54.6 m -> 5 lengths of 12 m
    expect(qty.weep_holes).toBe(7);
  });

  it("counts two layers of vertical bars in a poured stem", () => {
    const r = calculateRetainingWall(
      { ...base, stem_type: "concrete" },
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    const rebar = r.lines.find((l) => l.key === "rebar");
    // 26 positions x 2 faces x (1.8 + 0.3) m = 109.2 m -> 10 lengths of 12 m.
    expect(rebar?.quantity).toBe(10);
    expect(rebar?.detail).toContain("2 layers");
  });

  it("prices the lines and totals them", () => {
    const r = calculateRetainingWall(
      base,
      DEFAULT_RETAINING_WALL_RULES,
      prices,
    );
    const cement = r.lines.find((l) => l.key === "cement");
    expect(cement?.unit_price).toBe(12500);
    expect(cement?.line_total).toBe(162500); // 13 bags x 12,500
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

import { describe, expect, it } from "vitest";
import {
  calculateSteelBeam,
  OPEN_SPAN_LIMIT_M,
  STEEL_PROFILE_BY_KEY,
  STEEL_USE_PRESETS,
  steelMassKg,
  type SteelBeamInput,
} from "../steel-beam-engine";

const base: SteelBeamInput = {
  profile: "ipe_200",
  span_m: 6,
  beam_count: 2,
  price_per_tonne: 1_500_000,
  columns_included: true,
};

describe("steel mass", () => {
  it("uses the published nominal mass per metre", () => {
    expect(STEEL_PROFILE_BY_KEY.ipe_150.kg_per_m).toBe(14);
    expect(STEEL_PROFILE_BY_KEY.ipe_200.kg_per_m).toBe(22.4);
    expect(STEEL_PROFILE_BY_KEY.ub_203_133_30.kg_per_m).toBe(30);
    expect(steelMassKg(base)).toBe(268.8);
  });

  it("returns null for a profile it does not carry", () => {
    expect(steelMassKg({ ...base, profile: "he_999" })).toBeNull();
  });

  it("maps every saved use preset to a real profile", () => {
    for (const preset of STEEL_USE_PRESETS) {
      expect(STEEL_PROFILE_BY_KEY[preset.profile]).toBeDefined();
    }
  });
});

describe("steel cost", () => {
  it("converts mass to tonnes and prices them at the buyer's rate", () => {
    const r = calculateSteelBeam(base, {});
    expect(r.lines[0].quantity).toBe(0.2688);
    expect(r.lines[0].unit_price).toBe(1_500_000);
    expect(r.lines[0].line_total).toBe(403200);
    expect(r.grand_total).toBe(403200);
  });

  it("shows the mass and no money when the rate is missing", () => {
    const r = calculateSteelBeam({ ...base, price_per_tonne: null }, {});
    expect(r.lines[0].quantity).toBe(0.2688);
    expect(r.lines[0].line_total).toBeNull();
    expect(r.grand_total).toBeNull();
    expect(r.incomplete).toBe(true);
    expect(r.warnings.join(" ")).toContain("rate your steel merchant quotes");
  });

  it("falls back to a configured catalog rate when one exists", () => {
    const r = calculateSteelBeam(
      { ...base, price_per_tonne: null },
      { "steel-section-per-tonne": 1_200_000 },
    );
    expect(r.grand_total).toBe(Math.round(0.2688 * 1_200_000 * 100) / 100);
  });

  it("raises the deflection warning past the open span limit", () => {
    const long = calculateSteelBeam(
      { ...base, span_m: OPEN_SPAN_LIMIT_M + 1, columns_included: false },
      {},
    );
    expect(long.warnings.join(" ")).toContain("deflection check");
    const short = calculateSteelBeam({ ...base, span_m: 5 }, {});
    expect(short.warnings.join(" ")).not.toContain("deflection check");
  });

  it("never adds tax of its own", () => {
    expect(calculateSteelBeam(base, {}).tax_status).toBe("tax_not_determined");
  });

  it("rejects an unknown profile, an empty span or zero beams", () => {
    expect(calculateSteelBeam({ ...base, profile: "none" }, {}).ok).toBe(false);
    expect(calculateSteelBeam({ ...base, span_m: 0 }, {}).ok).toBe(false);
    expect(calculateSteelBeam({ ...base, beam_count: 0 }, {}).ok).toBe(false);
  });
});

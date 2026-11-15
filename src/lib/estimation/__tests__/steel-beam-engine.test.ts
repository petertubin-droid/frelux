import { describe, expect, it } from "vitest";
import {
  BEARING_ALLOWANCE_M,
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
  it("adds a bearing allowance to the clear span", () => {
    const oneBeam = steelMassKg({
      ...base,
      span_m: 10,
      beam_count: 1,
      profile: "ipe_200",
    }) as number;
    expect(oneBeam).toBeCloseTo((10 + BEARING_ALLOWANCE_M) * 22.4, 2);
  });

  it("uses the published nominal mass per metre", () => {
    expect(STEEL_PROFILE_BY_KEY.ipe_150.kg_per_m).toBe(14);
    expect(STEEL_PROFILE_BY_KEY.ipe_200.kg_per_m).toBe(22.4);
    expect(STEEL_PROFILE_BY_KEY.ub_203_133_30.kg_per_m).toBe(30);
    // 6 m clear span plus 300 mm of bearings, two beams, 22.4 kg/m.
    expect(steelMassKg(base)).toBe(282.24);
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
    expect(r.lines[0].quantity).toBe(0.2822);
    expect(r.lines[0].unit_price).toBe(1_500_000);
    expect(r.lines[0].line_total).toBe(423300);
    expect(r.grand_total).toBe(423300);
  });

  it("shows the mass and no money when the rate is missing", () => {
    const r = calculateSteelBeam({ ...base, price_per_tonne: null }, {});
    expect(r.lines[0].quantity).toBe(0.2822);
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
    expect(r.grand_total).toBe(Math.round(0.2822 * 1_200_000 * 100) / 100);
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

  it("shows the cut length the mass is derived from, not the clear span", () => {
    const r = calculateSteelBeam(
      { ...base, span_m: 5, beam_count: 1, profile: "ipe_150" },
      {},
    );
    const cut = 5 + BEARING_ALLOWANCE_M;
    // 5.3 m at 14 kg/m is 74.2 kg, and the per-beam step must say so: it
    // showed 70 kg, the clear-span figure, under a total of 74.2.
    expect(r.steps[0].detail).toContain("5.3 m cut");
    expect(r.steps[0].detail).toContain("74.2 kg");
    expect(r.steps[1].detail).toContain("5.3 m cut");
    expect(r.lines[0].detail).toContain("5.3 m cut");
    expect(r.lines[0].quantity).toBe(0.0742);
  });

  it("refuses a rate that is not a usable number instead of showing NaN", () => {
    const nan = calculateSteelBeam({ ...base, price_per_tonne: Number.NaN }, {});
    expect(nan.ok).toBe(false);
    expect(nan.errors.join(" ")).toContain("steel rate");
    const negative = calculateSteelBeam({ ...base, price_per_tonne: -5000 }, {});
    expect(negative.ok).toBe(false);
    expect(negative.errors.join(" ")).toContain("steel rate");
  });
});

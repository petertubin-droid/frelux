import { describe, expect, it } from "vitest";
import {
  BEARING_ALLOWANCE_M,
  OPEN_SPAN_LIMIT_M,
  STEEL_PROFILES,
  STEEL_PROFILE_BY_KEY,
  STEEL_USE_PRESETS,
  calculateSteelBeam,
  steelMassKg,
} from "../steel-beam-engine";

/**
 * Conformance suite for the steel I-beam weight engine.
 *
 * Every mass below is the published nominal mass per metre for that section,
 * taken from the Euronorm IPE series and the British universal beam series.
 * The point of the suite is that these figures do not come from the engine: if
 * the engine disagrees with the table, the engine is wrong.
 *
 * Two consequences are checked explicitly, because both are ordering errors:
 * a section that does not exist cannot be bought, and a beam cut to the clear
 * span does not sit on its bearings.
 */
const PUBLISHED_IPE: Record<string, number> = {
  "IPE 100": 8.1,
  "IPE 120": 10.4,
  "IPE 140": 12.9,
  "IPE 160": 15.8,
  "IPE 180": 18.8,
  "IPE 200": 22.4,
  "IPE 220": 26.2,
  "IPE 240": 30.7,
  "IPE 270": 36.1,
  "IPE 300": 42.2,
};

const PUBLISHED_UB: Record<string, number> = {
  "Universal beam 203 × 133 × 25": 25.1,
  "Universal beam 203 × 133 × 30": 30,
  "Universal beam 203 × 133 × 37": 37,
  "Universal beam 254 × 146 × 31": 31.1,
  "Universal beam 254 × 146 × 37": 37,
  "Universal beam 254 × 146 × 43": 43,
  "Universal beam 305 × 165 × 40": 40.3,
  "Universal beam 305 × 165 × 46": 46.1,
  "Universal beam 305 × 165 × 54": 54,
};

const PUBLISHED_W: Record<string, number> = {
  "AISC W8 × 10": 14.9,
  "AISC W8 × 15": 22.3,
  "AISC W8 × 24": 35.7,
  "AISC W10 × 15": 22.3,
  "AISC W10 × 22": 32.7,
  "AISC W10 × 30": 44.6,
  "AISC W12 × 16": 23.8,
  "AISC W12 × 26": 38.7,
  "AISC W14 × 22": 32.7,
  "AISC W14 × 30": 44.6,
};

const PUBLISHED_HEA: Record<string, number> = {
  "HEA 100": 16.7,
  "HEA 120": 19.9,
  "HEA 140": 24.7,
  "HEA 160": 30.4,
};

const PUBLISHED_HEB: Record<string, number> = {
  "HEB 100": 20.4,
  "HEB 120": 26.7,
  "HEB 140": 33.7,
  "HEB 160": 42.6,
};

const NO_RATE = null;

describe("steel: the published section table", () => {
  it("carries only sections that exist, at their published mass", () => {
    const wrong: string[] = [];
    for (const profile of STEEL_PROFILES) {
      const published =
        PUBLISHED_IPE[profile.label] ??
        PUBLISHED_UB[profile.label] ??
        PUBLISHED_W[profile.label] ??
        PUBLISHED_HEA[profile.label] ??
        PUBLISHED_HEB[profile.label];
      if (published === undefined) {
        wrong.push(`${profile.label}: not a published section`);
      } else if (profile.kg_per_m !== published) {
        wrong.push(
          `${profile.label}: engine ${profile.kg_per_m} kg/m, table ${published} kg/m`,
        );
      }
    }
    expect(wrong).toEqual([]);
  });

  it("does not offer an IPE 150, which the Euronorm series does not contain", () => {
    // The series runs 140 -> 160. A 150 section cannot be ordered.
    expect(STEEL_PROFILES.map((p) => p.label)).not.toContain("IPE 150");
    expect(STEEL_PROFILE_BY_KEY.ipe_150).toBeUndefined();
  });

  it("covers the range a domestic or light industrial job needs", () => {
    // At least ten IPE sizes from 100 to 300, and three UB depths.
    const ipes = STEEL_PROFILES.filter((p) => p.label.startsWith("IPE "));
    const ubs = STEEL_PROFILES.filter((p) => p.label.startsWith("Universal beam"));
    expect(ipes.length).toBeGreaterThanOrEqual(10);
    expect(ubs.length).toBeGreaterThanOrEqual(6);
    expect(ipes[0].label).toBe("IPE 100");
    expect(ipes[ipes.length - 1].label).toBe("IPE 300");
  });

  it("offers presets that all resolve to a real profile", () => {
    for (const preset of STEEL_USE_PRESETS) {
      expect(
        STEEL_PROFILE_BY_KEY[preset.profile],
        `preset ${preset.key} points at ${preset.profile}`,
      ).toBeTruthy();
    }
  });
});

describe("steel: mass from span", () => {
  const base = {
    profile: "ub_203_133_30",
    span_m: 6,
    beam_count: 2,
    price_per_tonne: NO_RATE,
    columns_included: false,
  };

  it("cuts the beam to span plus two bearings, not the clear span", () => {
    // 6 m clear + 0.3 m of bearings = 6.3 m of steel per beam.
    expect(BEARING_ALLOWANCE_M).toBeCloseTo(0.3, 3);
    const perBeam = steelMassKg({ ...base, beam_count: 1 })!;
    expect(perBeam).toBeCloseTo(6.3 * 30, 1);
  });

  it("multiplies by the number of beams", () => {
    const one = steelMassKg({ ...base, beam_count: 1 })!;
    const two = steelMassKg(base)!;
    expect(two).toBeCloseTo(one * 2, 1);
  });

  it("reports the tonnage a merchant weighs, to four decimals", () => {
    const r = calculateSteelBeam(base, {});
    // 6.3 x 2 x 30 = 378 kg = 0.378 t
    expect(r.lines[0].quantity).toBeCloseTo(0.378, 4);
    expect(r.lines[0].unit).toBe("tonnes");
  });

  it("scales linearly with span", () => {
    const short = calculateSteelBeam({ ...base, span_m: 3 }, {});
    const long = calculateSteelBeam({ ...base, span_m: 6 }, {});
    // (6.3 / 3.3) = 1.909..., not 2: the bearing allowance is constant.
    expect(long.lines[0].quantity! / short.lines[0].quantity!).toBeCloseTo(
      6.3 / 3.3,
      3,
    );
  });
});

describe("steel: pricing and refusals", () => {
  const base = {
    profile: "ipe_200",
    span_m: 4,
    beam_count: 1,
    price_per_tonne: 1_200_000,
    columns_included: false,
  };

  it("prices tonnes at the buyer's own rate", () => {
    const r = calculateSteelBeam(base, {});
    // 4.3 m x 22.4 kg/m = 96.32 kg = 0.0963 t x 1,200,000 = 115,560
    expect(r.lines[0].quantity).toBeCloseTo(0.0963, 4);
    expect(r.grand_total).toBeCloseTo(115_560, 0);
  });

  it("leaves the result incomplete when no rate is supplied", () => {
    const r = calculateSteelBeam({ ...base, price_per_tonne: null }, {});
    expect(r.incomplete).toBe(true);
    expect(r.grand_total).toBeNull();
    // The mass is still the deliverable, so the line keeps its quantity.
    expect(r.lines[0].quantity).toBeGreaterThan(0);
  });

  it("refuses a profile that is not in the table", () => {
    const r = calculateSteelBeam({ ...base, profile: "ipe_150" }, {});
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/steel profile/i);
  });

  it("refuses a span or beam count that cannot be built", () => {
    expect(calculateSteelBeam({ ...base, span_m: 0 }, {}).ok).toBe(false);
    expect(calculateSteelBeam({ ...base, beam_count: 0 }, {}).ok).toBe(false);
    expect(calculateSteelBeam({ ...base, beam_count: 1.5 }, {}).ok).toBe(false);
  });

  it("warns on an open span past the guardrail, and not before", () => {
    const short = calculateSteelBeam({ ...base, span_m: OPEN_SPAN_LIMIT_M }, {});
    const long = calculateSteelBeam(
      { ...base, span_m: OPEN_SPAN_LIMIT_M + 1 },
      {},
    );
    expect(short.warnings.join(" ")).not.toMatch(/deflection/i);
    expect(long.warnings.join(" ")).toMatch(/deflection/i);
  });
});

import { describe, expect, it } from "vitest";
import {
  COPPER_AMPACITY_A,
  COPPER_RESISTIVITY,
  minimumCableSize,
  selectBreaker,
  voltageDropPercent,
} from "../electrical-engine";
import { designFlow, requiredBoreMm, sizePipe } from "../pipe-sizing-engine";
import { calculateDrainageTakeoff } from "../drainage-standalone-engine";

/**
 * Building services fixes of 2026-11-04. Each case pins a formula that was
 * either missing or wrong, so the numbers cannot drift back.
 */
describe("voltage drop", () => {
  it("matches the hand calculation for a single-phase feeder", () => {
    const v = voltageDropPercent({
      run_m: 30,
      load_watts: 10000,
      voltage: 230,
      cross_section_mm2: 10,
    });
    const amps = 10000 / 230;
    const volts = (2 * 30 * amps * COPPER_RESISTIVITY) / 10;
    expect(v.drop_percent).toBe(Math.round((volts / 230) * 100 * 100) / 100);
    expect(v.passes).toBe(true); // 2.55% sits inside the 5% power limit
  });

  it("uses the three-phase relation for a balanced feeder", () => {
    const v = voltageDropPercent({
      run_m: 30,
      load_watts: 10000,
      voltage: 400,
      cross_section_mm2: 10,
      system: "three",
    });
    const amps = 10000 / (Math.sqrt(3) * 400);
    const volts = (Math.sqrt(3) * 30 * amps * COPPER_RESISTIVITY) / 10;
    expect(v.drop_percent).toBe(Math.round((volts / 400) * 100 * 100) / 100);
    expect(v.passes).toBe(true);
    expect(v.detail).toContain("three-phase");
  });

  it("raises the drop when the load has a power factor below unity", () => {
    const unity = voltageDropPercent({
      run_m: 25,
      load_watts: 5000,
      voltage: 230,
      cross_section_mm2: 4,
    });
    const lagging = voltageDropPercent({
      run_m: 25,
      load_watts: 5000,
      voltage: 230,
      cross_section_mm2: 4,
      power_factor: 0.8,
    });
    expect(lagging.drop_percent).toBeCloseTo(unity.drop_percent / 0.8, 1);
  });

  it("applies the tighter lighting limit only when asked", () => {
    const power = voltageDropPercent({
      run_m: 40,
      load_watts: 1000,
      voltage: 230,
      cross_section_mm2: 1.5,
    });
    const lighting = voltageDropPercent({
      run_m: 40,
      load_watts: 1000,
      voltage: 230,
      cross_section_mm2: 1.5,
      lighting_dominant: true,
    });
    expect(power.limit_percent).toBe(5);
    expect(lighting.limit_percent).toBe(3);
    expect(power.drop_percent).toBe(lighting.drop_percent);
  });
});

describe("minimum cable size", () => {
  it("picks the smallest size that satisfies ampacity and drop", () => {
    const verdict = minimumCableSize({
      load_watts: 1380,
      voltage: 230,
      run_m: 12,
      lighting_dominant: true,
    });
    expect(verdict.feasible).toBe(true);
    expect(verdict.cross_section_mm2).toBe(1.5);
    const chosen = verdict.attempt.find((a) => a.cross_section_mm2 === 1.5)!;
    expect(chosen.passes_ampacity).toBe(true);
    expect(chosen.passes_drop).toBe(true);
  });

  it("moves up a size when the run makes drop the binding constraint", () => {
    const verdict = minimumCableSize({
      load_watts: 2300,
      voltage: 230,
      run_m: 45,
    });
    expect(verdict.feasible).toBe(true);
    const chosenIndex = verdict.attempt.findIndex(
      (a) => a.cross_section_mm2 === verdict.cross_section_mm2,
    );
    expect(chosenIndex).toBeGreaterThan(0);
    const smaller = verdict.attempt[chosenIndex - 1];
    expect(smaller.passes_ampacity && smaller.passes_drop).toBe(false);
  });

  it("refuses to answer when no tabulated size passes", () => {
    const verdict = minimumCableSize({
      load_watts: 92000,
      voltage: 230,
      run_m: 300,
    });
    expect(verdict.feasible).toBe(false);
    expect(verdict.cross_section_mm2).toBeNull();
    expect(verdict.reason).toContain("No tabulated size");
  });

  it("keeps the ampacity table in ascending order", () => {
    for (let i = 1; i < COPPER_AMPACITY_A.length; i += 1) {
      expect(COPPER_AMPACITY_A[i][0]).toBeGreaterThan(
        COPPER_AMPACITY_A[i - 1][0],
      );
      expect(COPPER_AMPACITY_A[i][1]).toBeGreaterThan(
        COPPER_AMPACITY_A[i - 1][1],
      );
    }
  });
});

describe("drainage takeoff", () => {
  const network = () =>
    calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [
        { lengthM: 20, pipeDiameterMm: 160, fallMmPerM: 8 },
        { lengthM: 10, pipeDiameterMm: 110, fallMmPerM: 12.5 },
      ],
      chambersPerConnection: 30,
    });

  it("sizes bedding per run instead of by the largest pipe", () => {
    const mixed = network();
    const allLarge = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [
        { lengthM: 20, pipeDiameterMm: 160, fallMmPerM: 8 },
        { lengthM: 10, pipeDiameterMm: 160, fallMmPerM: 12.5 },
      ],
      chambersPerConnection: 30,
    });
    expect(mixed.beddingVolumeM3).toBeLessThan(allLarge.beddingVolumeM3);
  });

  it("spaces chambers along each run", () => {
    const result = network();
    expect(result.inspectionChambers).toBe(
      Math.ceil(20 / 30) + Math.ceil(10 / 30),
    );
  });

  it("warns when a fall is too shallow for the pipe size", () => {
    const shallow = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 12, pipeDiameterMm: 110, fallMmPerM: 3 }],
    });
    expect(
      shallow.cautions.some((c) => c.includes("below the 12.5 mm/m")),
    ).toBe(true);
  });

  it("keeps the trench deep enough to hold cover, pipe and bedding", () => {
    const result = calculateDrainageTakeoff({
      marketCode: "NG",
      runs: [{ lengthM: 10, pipeDiameterMm: 110, fallMmPerM: 12.5 }],
    });
    // 0.75 cover + 0.11 pipe + 0.1 bedding = 0.96 m deep, 0.71 m wide
    expect(result.excavationVolumeM3).toBeCloseTo(10 * 0.71 * 0.96, 1);
  });
});

describe("pipe sizing by velocity", () => {
  it("requires the bore that holds the velocity limit", () => {
    // 0.3 l/s at 1.5 m/s needs 15.96 mm of bore, so 15 mm copper fails.
    expect(requiredBoreMm(0.3, 1.5)).toBe(15.96);
    const verdict = sizePipe({ flow_lps: 0.3, velocity_limit_mps: 1.5 });
    expect(verdict.chosen?.label).toBe("22 mm copper");
    expect(verdict.velocity_mps).toBeCloseTo(0.94, 1);
    const fifteen = verdict.candidates.find((c) => c.label === "15 mm copper")!;
    expect(fifteen.passes).toBe(false);
  });

  it("moves up a size for hot water at the quieter limit", () => {
    const cold = sizePipe({ flow_lps: 0.3, velocity_limit_mps: 1.5 });
    const hot = sizePipe({ flow_lps: 0.3, velocity_limit_mps: 1.0 });
    expect(hot.chosen!.inner_mm).toBeGreaterThanOrEqual(cold.chosen!.inner_mm);
  });

  it("refuses rather than under-sizing an impossible flow", () => {
    const verdict = sizePipe({ flow_lps: 8, velocity_limit_mps: 1.5 });
    expect(verdict.feasible).toBe(false);
    expect(verdict.chosen).toBeNull();
    expect(verdict.reason).toContain("cannot be carried");
  });

  it("multiplies outlet flows and applies only the factor given", () => {
    const demand = designFlow({
      outlets: [
        { label: "basin tap", flow_lpm: 6, count: 4 },
        { label: "shower", flow_lpm: 9, count: 2 },
      ],
      simultaneity_factor: 0.5,
    });
    expect(demand.connected_lpm).toBe(42);
    expect(demand.design_lps).toBeCloseTo(0.35, 2);
  });

  it("ignores blank outlet rows instead of counting them as zero flow", () => {
    const demand = designFlow({
      outlets: [
        { label: "basin tap", flow_lpm: 6, count: 2 },
        { label: "empty", flow_lpm: 0, count: 0 },
      ],
      simultaneity_factor: 1,
    });
    expect(demand.connected_lpm).toBe(12);
    expect(demand.detail).not.toContain("empty");
  });
});

describe("breaker selection", () => {
  it("picks the smallest rating at or above the design current", () => {
    const v = selectBreaker({ design_current_a: 21.7, cable_ampacity_a: 27 });
    expect(v.rating_a).toBe(25);
    expect(v.complies).toBe(true);
  });

  it("refuses a breaker larger than the cable can carry", () => {
    const v = selectBreaker({ design_current_a: 26, cable_ampacity_a: 27 });
    expect(v.rating_a).toBeNull();
    expect(v.complies).toBe(false);
    expect(v.reason).toContain("cable has to be larger");
  });

  it("says plainly when cable capacity was not supplied", () => {
    const v = selectBreaker({ design_current_a: 12 });
    expect(v.rating_a).toBe(16);
    expect(v.reason).toContain("was not checked");
  });
});

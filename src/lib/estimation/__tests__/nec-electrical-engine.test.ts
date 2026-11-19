import { describe, expect, it } from "vitest";
import {
  calculateNecPreliminaryCable,
  NEC_COPPER_AWG,
} from "../nec-electrical-engine";

describe("NEC/AWG preliminary cable reference", () => {
  it("uses North American AWG candidates and 120/240 V configurations", () => {
    const result = calculateNecPreliminaryCable({
      load_watts: 1800,
      run_ft: 50,
      system: "120V_single",
      power_factor: 1,
    });
    expect(result.nominal_voltage_v).toBe(120);
    expect(result.run_m).toBeCloseTo(15.24);
    expect(result.design_current_a).toBe(15);
    expect(NEC_COPPER_AWG.map((c) => c.awg)).toContain("12 AWG");
    expect(result.selected_awg).toBe("14 AWG");
    expect(result.standards_reference).toContain("NEC 2023");
  });

  it("calculates three-phase design current for 208V", () => {
    const result = calculateNecPreliminaryCable({
      load_watts: 10_000,
      run_ft: 100,
      system: "208V_three",
      power_factor: 0.9,
    });
    expect(result.design_current_a).toBeCloseTo(30.86, 1);
    expect(result.nominal_voltage_v).toBe(208);
  });

  it("exposes design limitations rather than presenting compliance", () => {
    const result = calculateNecPreliminaryCable({
      load_watts: 5000,
      run_ft: 300,
      system: "240V_single",
      termination_temperature_c: 75,
    });
    expect(result.limitations.length).toBeGreaterThan(2);
    expect(result.limitations.join(" ")).toContain("Not a code compliance");
  });
});

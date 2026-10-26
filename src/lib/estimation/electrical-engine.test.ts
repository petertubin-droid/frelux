import { describe, it, expect } from "vitest";
import { voltageDropPercent } from "./electrical-engine";

// ── Audit fix F7 (2026-10-26): feeder voltage-drop check ──

describe("audit fix F7 — voltage drop", () => {
  it("computes single-phase copper drop correctly", () => {
    const v = voltageDropPercent({
      run_m: 40,
      load_watts: 2300,
      voltage: 230,
      cross_section_mm2: 4,
    });
    // I = 10 A; Vd = 2*40*10*0.0172/4 = 3.44 V → 1.496% < 5% → passes
    expect(v.drop_percent).toBeCloseTo(1.5, 1);
    expect(v.passes).toBe(true);
  });

  it("flags long thin runs against the 5% power limit", () => {
    const v = voltageDropPercent({
      run_m: 60,
      load_watts: 4600,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    // I = 20 A; Vd = 2*60*20*0.0172/2.5 = 16.5 V → 7.18% > 5% → fails
    expect(v.drop_percent).toBeGreaterThan(5);
    expect(v.passes).toBe(false);
  });

  it("applies the stricter 3% limit to lighting-dominant runs", () => {
    // 60 m, 10 A, 2.5 mm2: drop = 8.26 V = 3.59% — fails lighting, passes power
    const lighting = voltageDropPercent({
      run_m: 60,
      load_watts: 2300,
      voltage: 230,
      cross_section_mm2: 2.5,
      lighting_dominant: true,
    });
    const power = voltageDropPercent({
      run_m: 60,
      load_watts: 2300,
      voltage: 230,
      cross_section_mm2: 2.5,
    });
    expect(lighting.limit_percent).toBe(3);
    expect(lighting.passes).toBe(false);
    expect(power.limit_percent).toBe(5);
    expect(power.passes).toBe(true);
  });

  it("refuses to check when data is missing", () => {
    const v = voltageDropPercent({
      run_m: 0,
      load_watts: 0,
      voltage: 0,
      cross_section_mm2: 0,
    });
    expect(v.passes).toBe(false);
    expect(v.detail).toContain("not checked");
  });
});

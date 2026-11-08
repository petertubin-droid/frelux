import { describe, it, expect } from "vitest";
import {
  calculateElectrical,
  parseElectricalRules,
  voltageDropPercent,
} from "./electrical-engine";

// ── Audit fix F7 (2026-10-26): feeder voltage-drop check ──

describe("audit fix F7 — voltage drop", () => {
  it("computes single-phase copper drop correctly", () => {
    const v = voltageDropPercent({
      run_m: 40,
      load_watts: 2300,
      voltage: 230,
      cross_section_mm2: 4,
    });
    // I = 10 A; Vd = 2*40*10*0.0225/4 = 4.5 V → 1.957% < 5% → passes.
    // The 0.0225 basis is copper at 70 C operating temperature, matching
    // tabulated voltage drop; the previous 0.0172 was the 20 C value and made
    // this same cable look 24 percent better than it is in service.
    expect(v.drop_percent).toBeCloseTo(1.96, 1);
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

// ── Audit 2026-11-08 (E2): the connected-load basis is a market rule ──
describe("connected-load basis", () => {
  const base = {
    lighting_points: 24,
    socket_points: 20,
    dedicated_points: 3,
    switches: 24,
    distribution_boards: 1,
    avg_run_lighting_m: 12,
    avg_run_socket_m: 15,
    avg_run_dedicated_m: 20,
    avg_run_earth_m: 10,
    avg_run_feeder_m: 15,
    supply_system: "single" as const,
    supply_voltage: 230,
    building_type: "residential",
    labour: { mode: "none" as const },
  };

  it("defaults to the documented planning figures", () => {
    const rules = parseElectricalRules([]);
    expect(rules.lighting_va_per_point).toBe(100);
    expect(rules.socket_va_per_point).toBe(250);
    expect(rules.dedicated_va_per_point).toBe(2500);
  });

  it("lets a market raise the socket assumption instead of editing code", () => {
    const rules = parseElectricalRules([
      {
        rule_key: "socket_va_per_point",
        rule_value: { value: 3000 },
        is_active: true,
      },
    ] as never);
    expect(rules.socket_va_per_point).toBe(3000);
    // A 13 A outlet's connected load moves the incomer; that is the point of it
    // being configurable.
    const low = calculateElectrical(
      { ...base } as never,
      parseElectricalRules([]),
      {} as never,
    );
    const high = calculateElectrical({ ...base } as never, rules, {} as never);
    expect(high.circuit_summary?.diversified_demand_va ?? 0).toBeGreaterThan(
      low.circuit_summary?.diversified_demand_va ?? 0,
    );
  });

  it("ignores a nonsensical value rather than zeroing the load", () => {
    const rules = parseElectricalRules([
      {
        rule_key: "socket_va_per_point",
        rule_value: { value: 0 },
        is_active: true,
      },
      {
        rule_key: "lighting_va_per_point",
        rule_value: { value: -5 },
        is_active: true,
      },
    ] as never);
    expect(rules.socket_va_per_point).toBe(250);
    expect(rules.lighting_va_per_point).toBe(100);
  });
});

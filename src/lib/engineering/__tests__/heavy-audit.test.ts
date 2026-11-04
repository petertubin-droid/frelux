import { describe, it, expect } from "vitest";
import { designColumn } from "@/lib/engineering/structural-calculator";
import { designFoundation } from "@/lib/engineering/foundation-calculator";

const columnInput = (over: Record<string, unknown> = {}) =>
  ({
    axial_load: 1500,
    height: 3,
    concrete_grade: "C30/37",
    steel_grade: "Fe500",
    cover_mm: 40,
    existing_width: 400,
    existing_depth: 400,
    is_rectangular: true,
    unbraced_height_ratio: 7.5,
    ...over,
  }) as never;

describe("column reinforcement selection", () => {
  it("never specifies a main bar thinner than 12 mm", () => {
    for (const load of [300, 800, 1500, 2500]) {
      const column = designColumn(columnInput({ axial_load: load }));
      expect(column.recommended_bar_diameter).toBeGreaterThanOrEqual(12);
    }
  });

  it("uses a bar count a detailer would actually draw", () => {
    for (const load of [300, 800, 1500, 2500]) {
      const column = designColumn(columnInput({ axial_load: load }));
      expect([4, 6, 8, 10, 12]).toContain(column.recommended_bar_count);
    }
  });

  it("provides at least the minimum column steel ratio", () => {
    const column = designColumn(columnInput());
    const barArea = Math.PI * Math.pow(column.recommended_bar_diameter / 2, 2);
    const provided = barArea * column.recommended_bar_count;
    const gross = column.recommended_width * column.recommended_depth;
    expect(provided / gross).toBeGreaterThanOrEqual(0.004);
    expect(provided / gross).toBeLessThanOrEqual(0.06);
  });

  it("still passes capacity at the loads it claims to carry", () => {
    const column = designColumn(columnInput());
    expect(column.capacity_check_pass).toBe(true);
    expect(column.load_capacity).toBeGreaterThanOrEqual(2100);
  });
});

describe("pad footing depth", () => {
  const pad = (load: number) =>
    designFoundation({
      shape: "pad",
      soil_type: "sandy_clay",
      wall_load: 0,
      column_load: load,
      foundation_depth: 1.5,
      concrete_grade: "C25/30",
    } as never);

  it("deepens the pad until punching shear passes", () => {
    const result = pad(400);
    expect(result.punching_shear_check_pass).toBe(true);
    expect(result.concrete_volume).toBeGreaterThan(0);
  });

  it("carries the sized depth into the concrete volume", () => {
    const result = pad(400);
    const areaPerPad = result.area_per_pad ?? 0;
    const depthFromVolume = result.concrete_volume / areaPerPad;
    expect(depthFromVolume).toBeGreaterThanOrEqual(0.3);
    expect(depthFromVolume).toBeLessThanOrEqual(0.9);
  });

  it("counts blinding on the projected footprint, not the pad alone", () => {
    const result = pad(400);
    const padArea = result.area_per_pad ?? 0;
    expect(result.blinding_volume).toBeGreaterThan(padArea * 0.075);
  });

  it("reports the same answer for the same input twice", () => {
    expect(JSON.stringify(pad(600))).toBe(JSON.stringify(pad(600)));
  });
});

describe("retaining wall excavation", () => {
  it("includes working space and blinding, not just the concrete box", async () => {
    const { retainingWallGeometry, parseRetainingWallRules } =
      await import("@/lib/estimation/retaining-wall-engine");
    const rules = parseRetainingWallRules([
      {
        rule_key: "footing_width_m",
        value_numeric: 0.6,
        value_text: null,
      },
      {
        rule_key: "footing_thickness_m",
        value_numeric: 0.225,
        value_text: null,
      },
      {
        rule_key: "stem_thickness_m",
        value_numeric: 0.225,
        value_text: null,
      },
    ] as never);
    const geometry = retainingWallGeometry(
      {
        length_m: 10,
        height_m: 2,
        soil_type: "stable",
        stem_type: "block",
        footing_width_override_m: null,
      } as never,
      rules,
    );
    expect(geometry.excavation_m3).toBeGreaterThan(
      geometry.footing_concrete_m3 * 1.2,
    );
  });
});

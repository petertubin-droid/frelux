import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import {
  calculateWaterproofing,
  DEFAULT_WATERPROOFING_RULES,
} from "@/lib/estimation/waterproofing-engine";
import {
  calculateSoffitGutter,
  DEFAULT_SOFFIT_GUTTER_RULES,
} from "@/lib/estimation/soffit-gutter-engine";

describe("batch 3 adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("waterproofing");
    expect(ids).toContain("soffit_gutter");
  });

  it("waterproofing matches the engine", async () => {
    const direct = calculateWaterproofing(
      {
        dpc_run_m: 60,
        dpm_area_m2: 90,
        wet_floor_area_m2: 6,
        wet_wall_area_m2: 18,
        wet_perimeter_m: 12,
        terrace_area_m2: null,
        labour: { mode: "none" },
      } as never,
      DEFAULT_WATERPROOFING_RULES,
      {},
    );
    const result = await executeEngine("waterproofing", {});
    expect(result.ok).toBe(direct.ok);
    const directLines = direct.lines.filter((l) => l.quantity !== null);
    expect(result.quantities.length).toBe(directLines.length);
    for (const line of directLines) {
      const adapted = result.quantities.find((q) => q.label === line.label);
      expect(adapted, `missing line: ${line.label}`).toBeTruthy();
      expect(adapted?.quantity).toBeCloseTo(Number(line.quantity), 2);
    }
  });

  it("soffit_gutter matches the engine", async () => {
    const direct = calculateSoffitGutter(
      {
        mode: "footprint",
        perimeter_m: null,
        building_length_m: 18,
        building_width_m: 12,
        overhang_m: 0.6,
        material: "pvc",
      } as never,
      DEFAULT_SOFFIT_GUTTER_RULES,
      {},
    );
    const result = await executeEngine("soffit_gutter", {});
    expect(result.ok).toBe(direct.ok);
    const directLines = direct.lines.filter((l) => l.quantity !== null);
    expect(result.quantities.length).toBe(directLines.length);
    for (const line of directLines) {
      const adapted = result.quantities.find((q) => q.label === line.label);
      expect(adapted, `missing line: ${line.label}`).toBeTruthy();
      expect(adapted?.quantity).toBeCloseTo(Number(line.quantity), 2);
    }
    expect(result.quantities.length).toBeGreaterThan(0);
  });
});

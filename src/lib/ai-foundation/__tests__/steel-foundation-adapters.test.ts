import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateSteelBeam } from "@/lib/estimation/steel-beam-engine";
import {
  calculateFoundation,
  DEFAULT_FOUNDATION_RULES,
} from "@/lib/estimation/foundation-engine";

describe("steel_beam adapter", () => {
  it("is registered", () => {
    expect(listEngines().map((e) => e.id)).toContain("steel_beam");
  });

  it("returns the same quantities the engine does", async () => {
    const direct = calculateSteelBeam(
      {
        profile: "ipe_180",
        span_m: 5,
        beam_count: 1,
        price_per_tonne: null,
        columns_included: false,
      } as never,
      {},
    );
    const result = await executeEngine("steel_beam", {});
    expect(result.ok).toBe(true);
    const directLines = direct.lines.filter((l) => l.quantity !== null);
    expect(result.quantities.length).toBe(directLines.length);
    // Compare per label: the engine rounds its printed lines, so an index-wise
    // comparison would fail on ordering rather than on arithmetic.
    for (const line of directLines) {
      const adapted = result.quantities.find((q) => q.label === line.label);
      expect(adapted, `missing adapted line: ${line.label}`).toBeTruthy();
      expect(adapted?.quantity).toBeCloseTo(Number(line.quantity), 2);
    }
    expect(result.quantities.length).toBeGreaterThan(0);
  });
});

describe("foundation_below_dpc adapter", () => {
  it("is registered", () => {
    expect(listEngines().map((e) => e.id)).toContain("foundation_below_dpc");
  });

  it("returns the same quantities the engine does", async () => {
    const direct = calculateFoundation(
      {
        concrete_volume_m3: 12,
        block_wall_area_m2: 40,
        hardcore_volume_m3: 8,
        formwork_area_m2: 20,
        labour: { mode: "none" },
      } as never,
      DEFAULT_FOUNDATION_RULES,
      {},
    );
    const result = await executeEngine("foundation_below_dpc", {});
    expect(result.ok).toBe(direct.ok);
    const directLines = direct.lines.filter((l) => l.quantity !== null);
    expect(result.quantities.length).toBe(directLines.length);
    for (const line of directLines) {
      const adapted = result.quantities.find((q) => q.label === line.label);
      expect(adapted, `missing adapted line: ${line.label}`).toBeTruthy();
      expect(adapted?.quantity).toBeCloseTo(Number(line.quantity), 2);
    }
  });
});

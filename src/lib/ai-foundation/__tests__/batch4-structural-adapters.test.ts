import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import {
  calculateRetainingWall,
  DEFAULT_RETAINING_WALL_RULES,
} from "@/lib/estimation/retaining-wall-engine";
import { calculateTemporaryWorksTakeoff } from "@/lib/estimation/temporary-works-standalone-engine";

describe("batch 4 adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("retaining_wall");
    expect(ids).toContain("temporary_works");
  });

  it("retaining_wall matches the engine", async () => {
    const direct = calculateRetainingWall(
      {
        length_m: 10,
        height_m: 2,
        soil_type: "stable",
        stem_type: "block",
        marketCode: "NG",
        bagWeightKg: null,
      } as never,
      DEFAULT_RETAINING_WALL_RULES,
      {},
    );
    const result = await executeEngine("retaining_wall", {});
    expect(result.ok).toBe(direct.ok);
    const directLines = direct.lines.filter((l) => l.quantity !== null);
    expect(result.quantities.length).toBe(directLines.length);
    for (const line of directLines) {
      const adapted = result.quantities.find((q) => q.label === line.label);
      expect(adapted, `missing line: ${line.label}`).toBeTruthy();
      expect(adapted?.quantity).toBeCloseTo(Number(line.quantity), 2);
    }
  });

  it("temporary_works matches the engine", async () => {
    const direct = calculateTemporaryWorksTakeoff({
      marketCode: "NG",
      elements: [],
      formworkReuseCycles: 4,
      formworkWastePercent: 5,
      scaffoldRunLengthM: 20,
      scaffoldWorkingHeightM: 6,
      scaffoldBayLengthM: 2.4,
      scaffoldLiftHeightM: 2,
      scaffoldDeckWidthM: 0.9,
    } as never);
    const result = await executeEngine("temporary_works", {});
    expect(result.ok).toBe(true);
    const standards = result.quantities.find(
      (q) => q.label === "Scaffold standards",
    );
    expect(standards?.quantity).toBe(direct.scaffoldStandards);
    const sheets = result.quantities.find((q) => q.label === "Formwork sheets");
    expect(sheets?.quantity).toBe(direct.formworkSheets);
    expect(result.quantities.length).toBeGreaterThan(3);
  });
});

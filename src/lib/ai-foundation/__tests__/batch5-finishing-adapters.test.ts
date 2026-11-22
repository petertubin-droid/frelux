import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateDrywallTakeoff } from "@/lib/estimation/drywall-standalone-engine";
import { calculateInsulationTakeoff } from "@/lib/estimation/insulation-standalone-engine";

describe("batch 5 finishing adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("drywall");
    expect(ids).toContain("insulation");
  });

  it("drywall matches the engine", async () => {
    const direct = calculateDrywallTakeoff({
      marketCode: "NG",
      wallLengthM: 10,
      wallHeightM: 3,
      wallCount: 1,
      boardLayers: 1,
      boardSides: 2,
      studSpacingMm: 600,
      wastePercent: 10,
      insulation: false,
    } as never);
    const result = await executeEngine("drywall", {});
    expect(result.ok).toBe(true);
    const sheets = result.quantities.find((q) => q.label === "Board sheets");
    expect(sheets?.quantity).toBe(direct.boardSheets);
    const studs = result.quantities.find((q) => q.label === "Studs");
    expect(studs?.quantity).toBe(direct.studCount);
    const tape = result.quantities.find((q) => q.label === "Joint tape");
    expect(tape?.quantity).toBeCloseTo(direct.jointTapeLinearMeters, 2);
  });

  it("insulation matches the engine", async () => {
    const direct = calculateInsulationTakeoff({
      marketCode: "NG",
      areaM2: 100,
      layers: 1,
      thicknessMm: 100,
      wastePercent: 5,
      packCoverageM2: 5,
      installationType: "batt",
    } as never);
    const result = await executeEngine("insulation", {});
    expect(result.ok).toBe(true);
    const volume = result.quantities.find(
      (q) => q.label === "Installed volume",
    );
    expect(volume?.quantity).toBeCloseTo(direct.installedVolumeM3, 6);
    const packs = result.quantities.find((q) => q.label === "Packs");
    expect(packs?.quantity).toBe(direct.packsRequired);
  });
});

import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculateDrywallTakeoff } from "@/lib/estimation/drywall-standalone-engine";
import { calculateInsulationTakeoff } from "@/lib/estimation/insulation-standalone-engine";
import {
  calculateFlooring,
  DEFAULT_FLOORING_RULES,
} from "@/lib/estimation/flooring-engine";
import { calculatePlasterRender } from "@/lib/estimation/plaster-render-engine";
import { calculateDefs } from "@/lib/estimation/exterior-finish-engine";
import { calculateWallAreas } from "@/lib/wallfinishing/quantity-engine";

describe("batch 5 finishing adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("drywall");
    expect(ids).toContain("insulation");
    expect(ids).toContain("flooring");
    expect(ids).toContain("plaster_render");
    expect(ids).toContain("exterior_finish");
    expect(ids).toContain("wall_areas");
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

  it("plaster and render matches the engine, layer for layer", async () => {
    const direct = calculatePlasterRender({
      system: "exterior_render",
      marketCode: "GB",
      areaM2: 100,
      openingAreaM2: 0,
      substrate: "clay_brick",
      thicknessMm: 15,
      grainMm: 2,
      texturedCoatMm: 4,
      externalCornerLengthM: 0,
      openingPerimeterM: 0,
      wastePercent: 10,
      wetZone: false,
    } as never);
    const result = await executeEngine("plaster_render", {});
    expect(result.ok).toBe(true);

    // Every layer and accessory the engine reports has to appear with the same
    // quantity and unit; a dropped line would hide material from the console.
    const lines = [...direct.layers, ...direct.accessories];
    for (const line of lines) {
      const label = line.key ? `${line.material} (${line.key})` : line.material;
      const found = result.quantities.find((q) => q.label === label);
      expect(found, label).toBeDefined();
      expect(found!.quantity).toBeCloseTo(line.quantity, 2);
      expect(found!.unit).toBe(line.unit);
    }
    expect(result.quantities.length).toBe(lines.length);
  });

  it("flooring matches the engine line for line", async () => {
    const direct = calculateFlooring(
      {
        flooring_type: "laminate",
        floor_area_m2: 100,
        skirting_run_m: 40,
        include_underlay: true,
        include_adhesive: true,
        labour: { mode: "none" },
      },
      DEFAULT_FLOORING_RULES,
      {},
    );
    const result = await executeEngine("flooring", {});
    expect(result.ok).toBe(true);
    const expected = direct.lines.filter((line) => line.quantity !== null);
    expect(result.quantities.length).toBe(expected.length);
    expected.forEach((line, index) => {
      const produced = result.quantities[index];
      expect(produced.label).toBe(`${line.label} (${line.key})`);
      expect(produced.quantity).toBeCloseTo(line.quantity as number, 3);
      expect(produced.unit).toBe(line.unit);
    });
    // Quantities are authoritative; money is left null rather than invented
    // from a price book the console does not hold.
    expect(result.costs).toBeNull();
  });

  it("exterior finish matches the DEFS branch the page calls", async () => {
    const direct = calculateDefs({
      systemType: "DEFS",
      netWallAreaM2: 100,
      perimeterLinearM: 40,
      openingPerimeterM: 6,
      substrate: "cement-board",
      wastagePercent: 5,
      finishTexture: "medium_swirl",
      marketCode: "NG",
    } as never);

    const result = await executeEngine("exterior_finish", {});
    expect(result.ok).toBe(true);

    const byLabel = (label: string) =>
      result.quantities.find((q) => q.label === label)?.quantity;
    expect(byLabel("Net wall area")).toBeCloseTo(
      direct.geometry.netWallAreaM2,
      2,
    );
    expect(byLabel("Mesh rolls")).toBe(direct.layers.meshRolls);
    expect(byLabel("Base coat bags")).toBe(direct.layers.baseCoatBags);
    expect(byLabel("Primer pails")).toBe(direct.layers.primerPails);
    expect(byLabel("Finish pails")).toBe(direct.layers.finishPails);
    expect(byLabel("Boards")).toBe(direct.defs?.boardsCount);
    expect(byLabel("Joint tape rolls")).toBe(direct.defs?.jointTapeRolls);
  });

  it("exterior finish omits the backing board on masonry", async () => {
    const result = await executeEngine("exterior_finish", {
      substrate: "masonry",
    });
    expect(result.ok).toBe(true);
    // The base coat goes straight onto prepared blockwork, so there is no board
    // line at all rather than a zero that looks like a missing quantity.
    expect(result.quantities.find((q) => q.label === "Boards")).toBeUndefined();
    expect(
      result.quantities.find((q) => q.label === "Base coat bags")?.quantity,
    ).toBeGreaterThan(0);
  });

  it("wall areas match the measuring engine", async () => {
    const direct = calculateWallAreas({
      id: "engine-studio-wall",
      label: "Wall 1",
      lengthM: 10,
      heightM: 3,
      surface: "interior",
      wallSystemId: "engine-studio",
      assemblyId: "engine-studio",
      openings: [
        {
          id: "opening-1",
          type: "door",
          widthM: 1.2,
          heightM: 1.5,
          quantity: 1,
          revealDepthM: 0,
          deduct: true,
        },
      ],
      excludedAreaM2: 0,
    } as never);

    const result = await executeEngine("wall_areas", {});
    expect(result.ok).toBe(true);
    const byLabel = (label: string) =>
      result.quantities.find((q) => q.label === label)?.quantity;
    expect(byLabel("Gross area")).toBeCloseTo(direct.grossAreaM2, 6);
    expect(byLabel("Openings deducted")).toBeCloseTo(direct.openingAreaM2, 6);
    expect(byLabel("Net area")).toBeCloseTo(direct.netAreaM2, 6);
    expect(byLabel("Finishing area")).toBeCloseTo(direct.finishingAreaM2, 6);
  });

  it("wall areas deducts an exclusion the caller names", async () => {
    const result = await executeEngine("wall_areas", { excludedAreaM2: 4 });
    expect(result.ok).toBe(true);
    const net = result.quantities.find((q) => q.label === "Net area")?.quantity;
    expect(net).toBeCloseTo(30 - 1.8 - 4, 6);
  });
});

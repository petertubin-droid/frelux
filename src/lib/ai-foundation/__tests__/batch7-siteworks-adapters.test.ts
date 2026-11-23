import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import { calculatePavingTakeoff } from "@/lib/estimation/paving-standalone-engine";
import { calculateDemolitionTakeoff } from "@/lib/estimation/demolition-standalone-engine";
import { calculateSiteSafety } from "@/lib/estimation/global-site-safety-engine";

/**
 * Batch 7: siteworks and external works.
 *
 * Same contract as every other batch: the adapter and the engine are called
 * with identical inputs and compared by label, so the console cannot report a
 * number the calculator page would not.
 */

const quantity = (
  result: Awaited<ReturnType<typeof executeEngine>>,
  label: string,
) => result.quantities.find((q) => q.label === label)?.quantity;

describe("batch 7 siteworks adapters", () => {
  it("are registered", () => {
    const ids = listEngines().map((e) => e.id);
    expect(ids).toContain("paving");
    expect(ids).toContain("demolition");
    expect(ids).toContain("site_safety");
  });

  it("paving matches the takeoff the page runs", async () => {
    const direct = calculatePavingTakeoff({
      marketCode: "NG",
      areaM2: 50,
      paverLengthMm: 200,
      paverWidthMm: 100,
      paverThicknessMm: 60,
      jointWidthMm: 3,
      layingPattern: "running",
      wastePercent: 5,
      beddingDepthMm: 50,
      subbaseDepthMm: 150,
    } as never);

    const result = await executeEngine("paving", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "Pavers")).toBe(direct.paversRequired);
    expect(quantity(result, "Bedding sand")).toBeCloseTo(
      direct.beddingSandVolumeM3,
      6,
    );
    expect(quantity(result, "Bedding sand mass")).toBeCloseTo(
      direct.beddingSandTonnes,
      6,
    );
    expect(quantity(result, "Jointing sand")).toBeCloseTo(
      direct.jointingSandKg,
      6,
    );
    expect(quantity(result, "Subbase (compacted)")).toBeCloseTo(
      direct.compactedSubbaseVolumeM3,
      6,
    );
    expect(quantity(result, "Subbase mass")).toBeCloseTo(
      direct.subbaseTonnes,
      6,
    );
  });

  it("paving reports no edge line when no edge run is entered", async () => {
    const result = await executeEngine("paving", {});
    expect(
      result.quantities.find((q) => q.label === "Edge units"),
    ).toBeUndefined();
  });

  it("paving reports edges when a run is measured", async () => {
    const result = await executeEngine("paving", { edgeLengthM: 40 });
    expect(
      result.quantities.find((q) => q.label === "Edge units")?.quantity,
    ).toBeGreaterThan(0);
  });

  it("demolition matches the takeoff the page runs", async () => {
    const direct = calculateDemolitionTakeoff({
      marketCode: "NG",
      items: [
        {
          type: "wall",
          lengthM: 10,
          widthM: 3,
          thicknessM: 0.23,
          quantity: 1,
        },
      ],
    } as never);

    const result = await executeEngine("demolition", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "In-place debris")).toBeCloseTo(
      direct.inPlaceVolumeM3,
      6,
    );
    expect(quantity(result, "Loose debris")).toBeCloseTo(
      direct.looseDebrisVolumeM3,
      6,
    );
    expect(quantity(result, "Debris mass")).toBeCloseTo(
      direct.estimatedMassTonnes,
      6,
    );
  });

  it("site safety matches the provision the estimator makes", async () => {
    const direct = calculateSiteSafety({
      framework: "INTERNATIONAL_ISO",
      perimeterMeters: 100,
      crewCount: 10,
      reservePpe: 10,
      signSpacingMeters: 10,
      workersAtHeight: 0,
      hasFallRisk: false,
      hasExcavation: false,
      excavationPerimeterMeters: 0,
      tapeLines: 0,
      excavationSignCount: 0,
      hasHotWork: false,
      firstAidWorkersPerKit: 25,
      fireExtinguisherCount: 0,
    } as never);

    const result = await executeEngine("site_safety", {});
    expect(result.ok).toBe(true);
    expect(quantity(result, "Perimeter signs")).toBe(direct.perimeterSigns);
    expect(quantity(result, "Hard hats")).toBe(direct.hardHats);
    expect(quantity(result, "Hi-vis vests")).toBe(
      direct.highVisibilityVests,
    );
    expect(quantity(result, "Safety boot pairs")).toBe(direct.safetyBootPairs);
    expect(quantity(result, "First aid kits")).toBe(direct.firstAidKits);
  });

  it("site safety adds fall protection only when there is work at height", async () => {
    const baseline = await executeEngine("site_safety", {});
    const atHeight = await executeEngine("site_safety", {
      workersAtHeight: 4,
      hasFallRisk: true,
    });
    expect(quantity(baseline, "Fall protection users")).toBe(0);
    expect(quantity(atHeight, "Fall protection users")).toBe(4);
  });
});

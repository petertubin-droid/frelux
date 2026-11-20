import { describe, expect, it } from "vitest";

import { calculateEifsWall } from "@/lib/estimation/eifs-engine";
import {
  calculateDefs,
  calculateExteriorFinish,
  exteriorInputFromEifs,
  sharedFinishLayers,
  FINISH_LAYER_RATES,
  DEFS_RATES,
  type ExteriorFinishInput,
} from "@/lib/estimation/exterior-finish-engine";

const baseDefs: ExteriorFinishInput = {
  systemType: "DEFS",
  netWallAreaM2: 120,
  perimeterLinearM: 40,
  openingPerimeterM: 24,
  substrate: "cement-board",
  wastagePercent: 10,
  finishTexture: "medium_swirl",
  marketCode: "GB",
};

describe("shared layer maths", () => {
  it("applies the 10% mesh overlap and the published spread rates", () => {
    const layers = sharedFinishLayers(100, "medium_swirl");
    expect(layers.meshAreaM2).toBeCloseTo(110, 3);
    expect(layers.meshRolls).toBe(3); // 110 / 50 rolls, rounded up
    expect(layers.baseCoatKg).toBeCloseTo(450, 0);
    expect(layers.baseCoatBags).toBe(18); // 450 / 25
    expect(layers.primerKg).toBeCloseTo(22, 1);
    expect(layers.primerPails).toBe(2);
    expect(layers.finishCoatKg).toBeCloseTo(280, 0);
    expect(layers.finishPails).toBe(12);
  });

  it("matches the EIFS engine for the same net area, so the two routes cannot drift", () => {
    const eifs = calculateEifsWall({
      wallLengthM: 40,
      wallHeightM: 3,
      insulationThicknessMm: 50,
      substrateType: "cmu_masonry",
      systemType: "barrier_eifs",
      attachmentMethod: "adhesive_only",
      finishTexture: "medium_swirl",
      openings: [],
      impactMeshHeightM: 0,
      marketCode: "GB",
    });
    // The EIFS engine reinforces the effective area, which includes the reveal
    // returns it deducts; compare like with like.
    const effective = eifs.geometry.effectiveAreaM2;
    const layers = sharedFinishLayers(effective, "medium_swirl");

    expect(layers.meshAreaM2).toBeCloseTo(
      eifs.reinforcing.standardMeshAreaM2,
      1,
    );
    expect(layers.baseCoatKg).toBe(eifs.reinforcing.baseCoatKg);
    expect(layers.primerKg).toBeCloseTo(eifs.finish.primerKg, 1);
    expect(layers.finishCoatKg).toBe(eifs.finish.finishCoatKg);
    expect(layers.spreadRateKgPerM2).toBe(eifs.finish.spreadRateKgPerM2);
  });
});

describe("DEFS takeoff", () => {
  it("buys boards at the metric sheet size with the stated wastage", () => {
    const result = calculateDefs(baseDefs);
    expect(result.ok).toBe(true);
    const boards = result.defs!;
    expect(boards.boardAreaM2).toBeCloseTo(DEFS_RATES.metricBoardAreaM2, 3);
    expect(boards.boardPurchaseAreaM2).toBeCloseTo(132, 1);
    // 132 / 2.88 = 45.8, so 46 sheets
    expect(boards.boardsCount).toBe(46);
  });

  it("uses 4 ft x 8 ft sheets and 10 ft trims in the US and Canada", () => {
    const result = calculateDefs({ ...baseDefs, marketCode: "US" });
    expect(result.defs!.boardAreaM2).toBeCloseTo(2.973, 2);
    expect(result.defs!.boardsCount).toBe(45); // 132 / 2.973 = 44.4
    expect(result.defs!.stockLengthM).toBeCloseTo(3.048, 3);
  });

  it("orders the larger of the per-board and per-area screw counts", () => {
    const result = calculateDefs(baseDefs);
    const boards = result.defs!;
    expect(boards.screwsFromAreaRate).toBe(Math.ceil(132 * 7));
    expect(boards.screwsCount).toBeGreaterThanOrEqual(
      boards.screwsFromAreaRate,
    );
    expect(boards.screwsCount).toBeGreaterThanOrEqual(boards.boardsCount * 18);
    expect(boards.screwBoxes).toBe(Math.ceil(boards.screwsCount / 1000));
  });

  it("adds seam tape at 1.15 m per m² of board", () => {
    const result = calculateDefs(baseDefs);
    expect(result.defs!.jointTapeM).toBeCloseTo(132 * 1.15, 1);
    expect(result.defs!.jointTapeRolls).toBe(Math.ceil((132 * 1.15) / 90));
  });

  it("sizes the weep screed from the perimeter in 3 m lengths", () => {
    const result = calculateDefs(baseDefs);
    // 40 m x 1.10 = 44 m, / 3 = 14.67, so 15 pieces
    expect(result.defs!.starterTrackM).toBeCloseTo(44, 1);
    expect(result.defs!.starterTrackPieces).toBe(15);
  });

  it("omits board, screws and tape over masonry and says why", () => {
    const result = calculateDefs({ ...baseDefs, substrate: "masonry" });
    expect(result.defs!.boardsOmitted).toBe(true);
    expect(result.defs!.boardsCount).toBe(0);
    expect(result.defs!.screwsCount).toBe(0);
    expect(result.defs!.jointTapeM).toBe(0);
    expect(
      result.boq.some((item) => /sheathing board/i.test(item.description)),
    ).toBe(false);
    expect(result.disclosures.join(" ")).toMatch(
      /directly onto the prepared blockwork/i,
    );
    // The shared layers are still there.
    expect(
      result.boq.some((item) => /fiberglass mesh/i.test(item.description)),
    ).toBe(true);
  });

  it("never claims an R-value for DEFS", () => {
    const result = calculateDefs(baseDefs);
    expect(result.disclosures.join(" ")).toMatch(/no continuous R-value/i);
    expect(result.eifs).toBeUndefined();
  });

  it("refuses a wall with no area instead of returning zeros", () => {
    const result = calculateDefs({ ...baseDefs, netWallAreaM2: 0 });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/net wall area/i);
  });

  it("emits a priced-role-free BOQ with every line carrying a quantity", () => {
    const result = calculateDefs(baseDefs);
    expect(result.boq.length).toBeGreaterThanOrEqual(8);
    for (const item of result.boq) {
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.unit).toBeTruthy();
    }
  });
});

describe("one dispatcher", () => {
  it("routes EIFS to the existing engine and returns the same takeoff", () => {
    const eifsInput = {
      wallLengthM: 30,
      wallHeightM: 3,
      insulationThicknessMm: 75 as const,
      substrateType: "cmu_masonry" as const,
      systemType: "barrier_eifs" as const,
      attachmentMethod: "adhesive_only" as const,
      openings: [],
      marketCode: "GB",
    };
    const viaDispatcher = calculateExteriorFinish({
      systemType: "EIFS",
      eifsInput,
    });
    const direct = calculateEifsWall(eifsInput);
    expect(viaDispatcher.system).toBe("EIFS");
    expect(viaDispatcher.boq).toEqual(direct.boq);
    expect(viaDispatcher.layers.baseCoatKg).toBe(direct.reinforcing.baseCoatKg);
  });

  it("routes DEFS without touching the EIFS engine", () => {
    const result = calculateExteriorFinish({
      systemType: "DEFS",
      input: baseDefs,
    });
    expect(result.system).toBe("DEFS");
    expect(result.defs?.boardsCount).toBeGreaterThan(0);
  });

  it("hands the same wall to either system from the EIFS page inputs", () => {
    const area = exteriorInputFromEifs({
      wallLengthM: 20,
      wallHeightM: 3,
      insulationThicknessMm: 50,
      openings: [
        { id: "w1", label: "Window", widthM: 1.2, heightM: 1.2, count: 2 },
      ],
      marketCode: "GB",
    });
    expect(area.netWallAreaM2).toBeCloseTo(60 - 2.88, 3);
    expect(area.perimeterLinearM).toBe(20);
    expect(area.openingPerimeterM).toBeCloseTo(2 * (2 * (1.2 + 1.2)), 3);
    expect(area.systemType).toBe("DEFS");
  });
});

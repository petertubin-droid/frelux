import { describe, expect, it } from "vitest";

import { calculateRenovation } from "@/lib/estimation/renovation-engine";
import {
  ETHEKWINI_1H_36601_LINES,
  ETHEKWINI_1H_36601_PER_UNIT,
  ETHEKWINI_1H_36601_SOURCE,
  ETHEKWINI_1H_36601_TOTALS,
} from "@/lib/estimation/golden-sources/ethekwini-1h-36601";

const line = (bill: number, item: string) => {
  const found = ETHEKWINI_1H_36601_LINES.find(
    (l) => l.bill === bill && l.item === item,
  );
  if (!found)
    throw new Error(`Bill ${bill} item ${item} is missing from the source`);
  return found;
};

describe("eThekwini 1H-36601 measured bill of quantities", () => {
  it("names its employer, contract and document version", () => {
    expect(ETHEKWINI_1H_36601_SOURCE.employer).toBe(
      "eThekwini Metropolitan Municipality",
    );
    expect(ETHEKWINI_1H_36601_SOURCE.contractNumber).toBe("1H-36601");
    expect(ETHEKWINI_1H_36601_SOURCE.documentVersion).toBe("01/12/2025");
    expect(ETHEKWINI_1H_36601_SOURCE.unitCount).toBe(28);
    expect(ETHEKWINI_1H_36601_SOURCE.kind).toBe("published_tender_boq");
  });

  it("does not claim a person verified the transcription", () => {
    expect(ETHEKWINI_1H_36601_SOURCE.crossChecked).toBe(false);
    expect(ETHEKWINI_1H_36601_SOURCE.transcribedBy).toMatch(
      /automated|Solene/i,
    );
  });

  it("states that the dwelling mix adds up to the unit count", () => {
    const mix =
      ETHEKWINI_1H_36601_SOURCE.dwellingMix.match(/\d+/g)?.map(Number) ?? [];
    expect(mix).toEqual([20, 1, 8, 2]);
    expect(mix[0] + mix[2]).toBe(ETHEKWINI_1H_36601_SOURCE.unitCount);
  });

  it("carries only bills 5 to 16 with positive measured quantities", () => {
    for (const entry of ETHEKWINI_1H_36601_LINES) {
      expect(entry.bill).toBeGreaterThanOrEqual(5);
      expect(entry.bill).toBeLessThanOrEqual(16);
      expect(entry.quantity).toBeGreaterThan(0);
      expect(["m2", "m", "nr", "sum"]).toContain(entry.unit);
      expect(entry.description.length).toBeGreaterThan(10);
      expect(entry.billTitle.length).toBeGreaterThan(3);
    }
  });

  it("has no duplicated bill and item number", () => {
    const keys = ETHEKWINI_1H_36601_LINES.map((l) => `${l.bill}-${l.item}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("adds up the blockwork to the figure a reader gets by hand", () => {
    // 94 foundation + 788 in 90mm + 1451 in 190mm + 17 beamfilling + 64 above wall plate
    expect(line(5, "1").quantity).toBe(94);
    expect(line(5, "2").quantity).toBe(788);
    expect(line(5, "3").quantity).toBe(1451);
    expect(line(5, "4").quantity).toBe(17);
    expect(line(5, "5").quantity).toBe(64);
    expect(ETHEKWINI_1H_36601_TOTALS.blockworkAreaM2).toBe(2414);
    // plus the bird proof grille blocks, which are masonry but not walling
    expect(ETHEKWINI_1H_36601_TOTALS.masonryM2).toBe(2563);
  });

  it("adds up the plastering quantities by side", () => {
    expect(ETHEKWINI_1H_36601_TOTALS.internalPlasterM2).toBe(4321); // 2898 + 67 + 1356
    expect(ETHEKWINI_1H_36601_TOTALS.externalPlasterM2).toBe(2786); // 1975 + 150 + 98 + 98 + 412 + 34 + 19
  });

  it("adds up ceilings, screeds, tiling and paint", () => {
    expect(ETHEKWINI_1H_36601_TOTALS.ceilingBoardM2).toBe(374); // 266 gypsum + 108 fibre cement
    expect(ETHEKWINI_1H_36601_TOTALS.floorScreedM2).toBe(1672); // 1620 floors + 52 treads
    expect(ETHEKWINI_1H_36601_TOTALS.wallTilingM2).toBe(118);
    expect(ETHEKWINI_1H_36601_TOTALS.paintedCeilingsM2).toBe(2283); // 1901 plaster + 382 plasterboard
  });

  it("agrees with itself where two bills measure the same ceiling", () => {
    // Bill 9 measures 108 m2 of fibre cement ceiling, Bill 16 paints the same 108 m2.
    expect(line(9, "3").quantity).toBe(line(16, "4").quantity);
  });

  it("states the reinforcement and lintel lengths that a wall of that size needs", () => {
    expect(ETHEKWINI_1H_36601_TOTALS.masonryReinforcementM).toBe(6271); // 1970 + 4301
    expect(line(5, "8").quantity + line(5, "9").quantity).toBe(324); // lintels
  });

  it("normalises to one dwelling unit at two decimal places", () => {
    expect(ETHEKWINI_1H_36601_PER_UNIT.blockworkAreaM2).toBe(86.21);
    expect(ETHEKWINI_1H_36601_PER_UNIT.internalPlasterM2).toBe(154.32);
    expect(ETHEKWINI_1H_36601_PER_UNIT.ceilingBoardM2).toBe(13.36);
    expect(ETHEKWINI_1H_36601_PER_UNIT.floorScreedM2).toBe(59.71);
  });

  it("keeps the per unit figures consistent with the totals it divides", () => {
    const derived =
      ETHEKWINI_1H_36601_TOTALS.blockworkAreaM2 /
      ETHEKWINI_1H_36601_SOURCE.unitCount;
    expect(ETHEKWINI_1H_36601_PER_UNIT.blockworkAreaM2).toBeCloseTo(derived, 2);
  });

  it("keeps the file out of the engine's own expectations", () => {
    // The source states quantities, not costs. A material-level case still needs
    // receipts, so this fixture must never carry a price or a coverage rate.
    const text = JSON.stringify(ETHEKWINI_1H_36601_LINES);
    expect(text).not.toMatch(/price|rate|cost|coverage|litre per|bags? per/i);
  });
});

/**
 * The one comparison with the source that is not circular.
 *
 * A bill measures skirting in metres and internal wall plaster in square
 * metres, and both describe the same walls. So the project fixes the ratio
 * between them: 1,724 m of skirting against 2,898 m2 of internal plaster, or
 * 0.595 m of skirting for every square metre of plastered wall. Our engine
 * derives both from room dimensions, so comparing its own ratio with the
 * published one tests the derivation, not a number we chose.
 *
 * The band is wide on purpose. The source is 28 units of small one and two
 * bedroom flats, which run denser in small rooms than a roomy three bedroom,
 * so the floor is set below the source and the ceiling above it.
 */
describe("the engine's skirting against the measured project", () => {
  const SKIRTING_PER_PLASTERED_M2 = 1724 / 2898;

  const flat = () =>
    [
      { id: "living", use: "living", length: 4, width: 3 },
      { id: "bed1", use: "bedroom", length: 3.5, width: 3 },
      { id: "bed2", use: "bedroom", length: 3, width: 2.8 },
      { id: "kitchen", use: "kitchen", length: 3, width: 2.4 },
      { id: "bath", use: "bathroom", length: 2.2, width: 1.8 },
      { id: "passage", use: "hallway", length: 3, width: 1.2 },
    ].map((room) => ({
      ...room,
      height: 2.6,
      use: room.use as never,
      work: { plaster: true, tiling: { walls: true, skirting: true } },
    }));

  it("states the source ratio to three decimals", () => {
    expect(SKIRTING_PER_PLASTERED_M2).toBeCloseTo(0.595, 3);
  });

  it("derives skirting per square metre of plastered wall inside the measured band", () => {
    const result = calculateRenovation({
      marketCode: "NG",
      rooms: flat(),
    } as never);
    const skirting = result.rooms.reduce(
      (total, room) => total + room.skirtingLengthM,
      0,
    );
    const plastered = result.lines
      .filter((row) => /-plaster$/.test(row.id) && row.quantity !== null)
      .reduce((total, row) => total + (row.quantity as number), 0);

    expect(plastered).toBeGreaterThan(150);
    const ratio = skirting / plastered;
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.85);
    // A roomy flat sits below the dense small units in the source, never above.
    expect(ratio).toBeLessThan(SKIRTING_PER_PLASTERED_M2 * 1.25);
  });

  it("sums the skirting room by room rather than repeating one room", () => {
    const result = calculateRenovation({
      marketCode: "NG",
      rooms: flat(),
    } as never);
    const perRoom = result.rooms.map((room) => room.skirtingLengthM);
    expect(new Set(perRoom).size).toBeGreaterThan(3);
    const total = perRoom.reduce((a, b) => a + b, 0);
    const fromLines = result.lines
      .filter((row) => /-skirting$/.test(row.id))
      .reduce((sum, row) => sum + (row.quantity ?? 0), 0);
    expect(fromLines).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(fromLines * 0.5);
  });
});

import { describe, expect, it } from "vitest";
import { calculateDrywallTakeoff } from "@/lib/estimation/drywall-standalone-engine";

/**
 * Drywall & Partitions conformance suite.
 *
 * Expectations are written from the trade figures a dryliner orders against
 * (ASTM C840 / GA-216 framing and finishing practice), not from the engine:
 * a 1200 x 2400 board is 2.88 m2, studs stand at the specified centres plus
 * one, tracks run top and bottom of every wall, and joint tape and compound
 * belong to the face being finished rather than to every layer behind it.
 */

const run = (overrides: Record<string, unknown> = {}) =>
  calculateDrywallTakeoff({
    marketCode: "NG",
    wallLengthM: 10,
    wallHeightM: 2.4,
    wallCount: 1,
    boardSides: 2,
    wastePercent: 10,
    ...overrides,
  } as never);

describe("Drywall: board quantities", () => {
  it("counts both faces of the partition", () => {
    // 10 x 2.4 = 24 m2 of wall, boarded both sides = 48 m2 of board.
    expect(run().boardAreaM2).toBeCloseTo(48, 1);
  });

  it("buys whole sheets of the market board, waste included", () => {
    // 48 m2 / 2.88 m2 per 1200 x 2400 sheet = 16.67, plus 10 per cent = 18.3
    // -> 19 sheets.
    expect(run().boardSheets).toBe(19);
  });

  it("doubles the board when the wall is double layered", () => {
    const single = run();
    const double = run({ boardLayers: 2 });
    expect(double.boardSheets).toBeGreaterThan(single.boardSheets * 1.9);
  });

  it("takes openings out of the wall before boarding", () => {
    const withDoor = run({
      openings: [{ widthM: 0.9, heightM: 2.1, quantity: 1 }],
    });
    expect(withDoor.openingsAreaM2).toBeCloseTo(1.89, 2);
    expect(withDoor.netWallAreaM2).toBeCloseTo(24 - 1.89, 2);
  });

  it("uses the market's own board size and framing centres", () => {
    const us = run({ marketCode: "US" });
    // 1219 x 2438 mm is a 4 x 8 ft sheet = 2.972 m2.
    expect(us.boardSizeMm.width).toBe(1219);
    expect(us.studSpacingMm).toBe(406);
    expect(us.boardSheets).toBe(Math.ceil((48 / (1.219 * 2.438)) * 1.1));
  });

  it("falls back to a generic board for a market with no profile", () => {
    const nowhere = run({ marketCode: "ZZ" });
    expect(nowhere.boardSizeMm.width).toBe(1200);
    expect(nowhere.marketNotes).toContain("No maintained profile for ZZ");
  });
});

describe("Drywall: framing", () => {
  it("stands studs at the specified centres plus the closing stud", () => {
    // 10 m at 600 centres = 16.67 bays, 17 bays, so 18 studs.
    expect(run().studCount).toBe(18);
  });

  it("adds a stud run for every wall in the room", () => {
    expect(run({ wallCount: 3 }).studCount).toBe(54);
  });

  it("runs a track along the top and the bottom of each wall", () => {
    // 10 m x 2 (top and bottom) plus 10 per cent = 22 m, bought in 3 m lengths
    // = 8 pieces.
    expect(run().trackLinearMeters).toBeCloseTo(22, 1);
    expect(run().trackStockPieces).toBe(8);
  });
});

describe("Drywall: finishing", () => {
  it("drives screws across the boarded area", () => {
    expect(run().drywallScrews).toBe(Math.ceil(48 * 12));
  });

  it("tapes the joints of the face being finished, not every layer", () => {
    // Tape and compound finish the outer face. A second layer adds board and
    // screws; it does not double the tape, because the first layer's joints are
    // covered by the second layer's board.
    const single = run();
    const double = run({ boardLayers: 2 });
    expect(double.jointTapeLinearMeters).toBe(single.jointTapeLinearMeters);
    expect(double.jointCompoundKg).toBe(single.jointCompoundKg);
  });

  it("quotes compound and tape from the market's own finishing rate", () => {
    const ng = run();
    expect(ng.jointCompoundKg).toBeCloseTo(48 * 0.55, 1);
    expect(ng.jointTapeLinearMeters).toBeCloseTo(48 * 1.4, 1);
    const us = run({ marketCode: "US" });
    expect(us.jointCompoundKg).toBeCloseTo(48 * 0.65, 1);
  });

  it("adds insulation only when it is asked for, over the wall area", () => {
    expect(run().insulationAreaM2).toBe(0);
    expect(run({ insulation: true }).insulationAreaM2).toBeCloseTo(
      24 * 1.05,
      2,
    );
  });
});

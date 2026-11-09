import { describe, expect, it } from "vitest";
import { runTakeoff, roomTakeoff } from "./engine";
import type { ScheduleInput } from "./types";

const bedroom: ScheduleInput = {
  id: "sched-1",
  label: "Ground floor",
  rooms: [
    {
      id: "r1",
      label: "Bedroom 1",
      walls: [
        {
          id: "w1",
          length: 3.6,
          height: 2.7,
          openings: [{ id: "d1", width: 0.9, height: 2.1 }],
        },
        { id: "w2", length: 4.2, height: 2.7 },
      ],
      floor: { id: "f1", length: 3.6, width: 4.2 },
    },
  ],
};

const lineFor = (result: ReturnType<typeof runTakeoff>, id: string) =>
  result.lines.find((line) => line.id === id);

describe("schedule to bill", () => {
  it("produces a line per scope plus the measured area", () => {
    const result = runTakeoff(bedroom);
    const scopes = new Set(result.lines.map((line) => line.scope));
    expect(scopes).toEqual(
      new Set(["Blockwork", "Render", "Paint", "Floor tiling", "Screed"]),
    );
    expect(lineFor(result, "blockwork-measured-area")?.quantity).toBeCloseTo(
      19.17,
      2,
    );
  });

  it("deducts the door from the wall area, not from the floor", () => {
    const result = runTakeoff(bedroom, { scopes: ["blockwork"] });
    // 3.6 x 2.7 = 9.72 less 1.89 door, plus 4.2 x 2.7 = 11.34
    expect(lineFor(result, "blockwork-measured-area")?.quantity).toBeCloseTo(
      19.17,
      2,
    );
  });

  it("measures the floor by its own dimensions", () => {
    const result = runTakeoff(bedroom, { scopes: ["floor_tiles"] });
    expect(lineFor(result, "floor_tiles-measured-area")?.quantity).toBeCloseTo(
      15.12,
      2,
    );
  });

  it("counts materials once across rooms instead of once per room", () => {
    const twoRooms: ScheduleInput = {
      id: "sched-2",
      rooms: [
        bedroom.rooms[0],
        { ...bedroom.rooms[0], id: "r2", label: "Bedroom 2" },
      ],
    };
    const result = runTakeoff(twoRooms, {
      scopes: ["paint"],
      specs: { paint: { coats: 1, coverageM2PerLitre: 10 } },
    });
    const paint = result.lines.find((line) =>
      line.description.startsWith("Paint"),
    );
    // Two rooms of 19.17 m2 is 38.34 m2 at one coat, 10 m2 per litre.
    expect(paint?.netQuantity).toBeCloseTo(3.834, 2);
    expect(paint?.sources).toEqual(["w1", "w2"]);
  });

  it("keeps purchase rounding at the aggregate, so rooms do not each buy a bag", () => {
    const tiny: ScheduleInput = {
      id: "sched-3",
      rooms: Array.from({ length: 6 }, (_, index) => ({
        id: `r${index}`,
        walls: [{ id: `w${index}`, length: 0.5, height: 1 }],
      })),
    };
    const result = runTakeoff(tiny, { scopes: ["render"] });
    const cement = result.lines.find((line) =>
      line.description.startsWith("Cement"),
    );
    // 3 m2 of render is 0.045 m3 of mortar, well under one 50 kg bag.
    expect(cement?.purchaseQuantity).toBe(1);
  });

  it("marks assumed inputs so a reviewer can see them", () => {
    const assumed: ScheduleInput = {
      id: "sched-4",
      rooms: [
        {
          id: "r1",
          walls: [{ id: "w1", length: 3, height: 2.4, assumed: true }],
          floor: { id: "f1", length: 3, width: 3, assumed: true },
        },
      ],
    };
    const result = runTakeoff(assumed, { scopes: ["paint"] });
    expect(result.assumedLineCount).toBe(result.lines.length);
  });

  it("warns instead of inventing a line when a scope has nothing measured", () => {
    const wallsOnly: ScheduleInput = {
      id: "sched-5",
      rooms: [{ id: "r1", walls: [{ id: "w1", length: 3, height: 2.4 }] }],
    };
    const result = runTakeoff(wallsOnly, { scopes: ["floor_tiles"] });
    expect(result.lines).toHaveLength(0);
    expect(result.warnings.join(" ")).toMatch(/Floor tiling: nothing measured/);
  });

  it("warns on an empty schedule rather than returning zeros", () => {
    const result = runTakeoff({ id: "empty", rooms: [] });
    expect(result.lines).toHaveLength(0);
    expect(result.warnings.join(" ")).toMatch(/no rooms/);
  });

  it("carries the formula and the inputs on every line", () => {
    const result = runTakeoff(bedroom, { scopes: ["blockwork"] });
    for (const line of result.lines) {
      expect(line.derivation.formula.length).toBeGreaterThan(10);
      expect(Object.keys(line.derivation.inputs).length).toBeGreaterThan(0);
      expect(line.sources.length).toBeGreaterThan(0);
    }
  });

  it("applies a caller threshold and a caller spec", () => {
    const result = runTakeoff(bedroom, {
      scopes: ["blockwork"],
      deductAbove: 3,
      specs: { blockwork: { blockLengthMm: 400, blockHeightMm: 200 } },
    });
    // The door now falls below the threshold, so nothing is deducted.
    expect(lineFor(result, "blockwork-measured-area")?.quantity).toBeCloseTo(
      21.06,
      2,
    );
    const blocks = result.lines.find((line) =>
      line.description.startsWith("Blocks"),
    );
    expect(blocks?.derivation.inputs.blockLengthMm).toBe(400);
  });

  it("accepts millimetre schedules end to end", () => {
    const mm: ScheduleInput = {
      id: "sched-6",
      rooms: [
        {
          id: "r1",
          walls: [
            {
              id: "w1",
              length: 3600,
              height: 2700,
              unit: "mm",
              openings: [{ id: "d1", width: 900, height: 2100, unit: "mm" }],
            },
          ],
        },
      ],
    };
    const result = runTakeoff(mm, { scopes: ["paint"] });
    expect(lineFor(result, "paint-measured-area")?.quantity).toBeCloseTo(
      7.83,
      2,
    );
  });

  it("models one room through the convenience entry point", () => {
    const result = roomTakeoff(bedroom.rooms[0], { scopes: ["floor_tiles"] });
    expect(lineFor(result, "floor_tiles-measured-area")?.quantity).toBeCloseTo(
      15.12,
      2,
    );
  });

  it("caps a floor deduction that exceeds the floor", () => {
    const result = runTakeoff(
      {
        id: "sched-7",
        rooms: [
          {
            id: "r1",
            floor: {
              id: "f1",
              length: 2,
              width: 2,
              deductions: [{ id: "void", area: 9 }],
            },
          },
        ],
      },
      { scopes: ["screed"] },
    );
    expect(result.warnings.join(" ")).toMatch(/deductions exceed/);
    expect(lineFor(result, "screed-measured-area")).toBeUndefined();
  });

  it("totals area once even when several scopes measure the same walls", () => {
    const result = runTakeoff(bedroom, {
      scopes: ["blockwork", "render", "paint"],
    });
    const area = result.totals.find((total) => total.unit === "m2");
    // Three scopes over 19.17 m2 is 57.51 m2 of measured work.
    expect(area?.quantity).toBeCloseTo(57.51, 2);
  });

  it("keeps bought-in units out of the quantity totals", () => {
    const result = runTakeoff(bedroom, { scopes: ["screed"] });
    const kilograms = result.totals.find((total) => total.unit === "kg");
    const cement = result.lines.find((line) =>
      line.description.startsWith("Cement"),
    );
    // Cement is the only kilogram line, so the total must equal it exactly
    // rather than counting the bag-rounded figure twice.
    expect(kilograms?.quantity).toBeCloseTo(cement?.quantity ?? 0, 4);
  });
});

import { describe, expect, it } from "vitest";
import { parseDimensions, parseOpenings } from "./dimensions";

describe("dimension pairs", () => {
  it("reads a bare millimetre pair as millimetres", () => {
    const { pairs } = parseDimensions("3600 x 4200");
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      length: 3.6,
      width: 4.2,
      unit: "m",
      unitInferred: true,
    });
  });

  it("reads a metre pair with a stated unit", () => {
    const { pairs } = parseDimensions("3.60 m x 4.20 m");
    expect(pairs[0]).toMatchObject({
      length: 3.6,
      width: 4.2,
      unitInferred: false,
    });
  });

  it("reads European decimal commas", () => {
    const { pairs } = parseDimensions("3,60 x 4,20");
    expect(pairs[0]).toMatchObject({ length: 3.6, width: 4.2 });
  });

  it("reads a mixed annotation where only one side carries the unit", () => {
    const { pairs } = parseDimensions("900 x 2100 mm");
    expect(pairs[0]).toMatchObject({ length: 0.9, width: 2.1 });
  });

  it("reads feet and inches", () => {
    const feet = parseDimensions("12 ft x 10 ft").pairs[0];
    expect(feet.length).toBeCloseTo(3.658, 3);
    expect(feet.width).toBeCloseTo(3.048, 3);
  });

  it("accepts the multiplication sign and the word by", () => {
    expect(parseDimensions("3.6 × 2.7").pairs[0]).toMatchObject({
      length: 3.6,
      width: 2.7,
    });
    expect(parseDimensions("3.6 by 2.7").pairs[0]).toMatchObject({
      length: 3.6,
      width: 2.7,
    });
  });

  it("reads a small unlabelled pair as metres, because a 2 m room exists", () => {
    const { pairs } = parseDimensions("2 x 3");
    expect(pairs[0]).toMatchObject({ length: 2, width: 3, unit: "m" });
  });

  it("rejects an explicit millimetre pair too small to be an element", () => {
    const { pairs, rejected } = parseDimensions("5 x 5 mm");
    expect(pairs).toHaveLength(0);
    expect(rejected).toEqual(["5 x 5 mm"]);
  });

  it("rejects an absurd length rather than passing it through", () => {
    const { pairs } = parseDimensions("120000 x 3000");
    expect(pairs).toHaveLength(0);
  });

  it("finds every pair in a paragraph of plan text", () => {
    const { pairs } = parseDimensions(
      "BEDROOM 1 3600 x 4200, BEDROOM 2 3300 x 3600, corridor 1200 x 4000",
    );
    expect(pairs.map((pair) => pair.raw)).toHaveLength(3);
    expect(pairs[1].length).toBe(3.3);
  });

  it("reports single annotated lengths separately", () => {
    const { pairs, singles } = parseDimensions(
      "Wall length 4500 mm at 90 degrees",
    );
    expect(pairs).toHaveLength(0);
    expect(singles.some((single) => single.value === 4.5)).toBe(true);
  });

  it("returns nothing for text with no dimensions", () => {
    expect(parseDimensions("GROUND FLOOR PLAN").pairs).toHaveLength(0);
    expect(parseDimensions("").pairs).toHaveLength(0);
  });
});

describe("opening annotations", () => {
  it("reads a labelled door", () => {
    const openings = parseOpenings("D1 door 900 x 2100");
    expect(openings).toHaveLength(1);
    expect(openings[0]).toMatchObject({
      id: "opening-1",
      label: "D1",
      width: 0.9,
      height: 2.1,
    });
  });

  it("reads several openings from a schedule block", () => {
    const openings = parseOpenings(
      "W1 window 1200 x 1500\nD2 door 900 x 2100\nW2 window 600 x 900",
    );
    expect(openings).toHaveLength(3);
    expect(openings.map((opening) => opening.label)).toEqual([
      "W1",
      "D2",
      "W2",
    ]);
  });

  it("ignores text that is not an opening", () => {
    expect(parseOpenings("3600 x 4200")).toHaveLength(0);
    expect(parseOpenings("")).toHaveLength(0);
  });
});

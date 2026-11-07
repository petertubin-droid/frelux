import { describe, expect, it } from "vitest";
import {
  buildProjectContext,
  detectCalculatorIntent,
  parseProjectDimensions,
  readProject,
} from "./project-intent";

describe("detectCalculatorIntent", () => {
  it("reads the trade from ordinary phrasings", () => {
    expect(detectCalculatorIntent("paint two bedrooms")?.key).toBe("paint");
    expect(detectCalculatorIntent("I want the walls painting")?.key).toBe(
      "paint",
    );
    expect(detectCalculatorIntent("retile the kitchen floor")?.key).toBe(
      "tile",
    );
    expect(detectCalculatorIntent("screed the floor at 50 mm")?.key).toBe(
      "screeding",
    );
    expect(
      detectCalculatorIntent("POP ceiling for the sitting room")?.key,
    ).toBe("pop");
    expect(detectCalculatorIntent("fix wiring and sockets")?.key).toBe(
      "electrical",
    );
  });

  it("prefers the specific trade over a general word", () => {
    // "roof" appears alongside a house-building phrase; the house is the
    // project, so the build estimator wins only when its phrase is stronger.
    expect(
      detectCalculatorIntent("build a bungalow with a gable roof")?.key,
    ).toBe("build");
    expect(detectCalculatorIntent("new roof trusses for the house")?.key).toBe(
      "roof",
    );
  });

  it("does not fire on a keyword inside a longer word", () => {
    expect(detectCalculatorIntent("population survey")).toBeNull();
    // "door" inside "doorway" is not read as the doors estimator. The rule is
    // strict on purpose: a wrong match sends the visitor to the wrong engine.
    expect(detectCalculatorIntent("doorway")).toBeNull();
  });

  it("returns nothing rather than guessing", () => {
    expect(detectCalculatorIntent("")).toBeNull();
    expect(detectCalculatorIntent("   ")).toBeNull();
    expect(detectCalculatorIntent("something for the house")).toBeNull();
  });

  it("reports the words that decided it", () => {
    const intent = detectCalculatorIntent("paint the hall");
    expect(intent?.matched).toContain("paint");
    expect(intent?.path).toBe("/paint-calculator");
  });
});

describe("parseProjectDimensions", () => {
  it("reads metres written either way round", () => {
    const withUnitAfterBoth = parseProjectDimensions("4.5 m x 6 m room");
    expect(withUnitAfterBoth.rects).toEqual([
      { length: 4.5, width: 6, unit: "m" },
    ]);
    const unitOnce = parseProjectDimensions("12 by 15 metres");
    expect(unitOnce.rects[0]).toEqual({ length: 12, width: 15, unit: "m" });
  });

  it("keeps feet as feet rather than silently converting", () => {
    const dims = parseProjectDimensions("12 ft x 15 ft bedroom");
    expect(dims.rects[0]).toEqual({ length: 12, width: 15, unit: "ft" });
  });

  it("leaves the unit unset when the sentence did not state one", () => {
    expect(parseProjectDimensions("12 x 15 bedroom").rects[0].unit).toBeNull();
  });

  it("reads floor areas in both units", () => {
    expect(parseProjectDimensions("a 20 m2 room").areasM2).toEqual([20]);
    expect(parseProjectDimensions("about 200 ft2").areasM2).toEqual([18.58]);
  });

  it("reads rooms, doors and windows when they are stated", () => {
    const dims = parseProjectDimensions(
      "3 bedroom flat with 7 doors and 6 windows",
    );
    expect(dims.rooms).toBe(3);
    expect(dims.doors).toBe(7);
    expect(dims.windows).toBe(6);
  });

  it("invents nothing", () => {
    const dims = parseProjectDimensions("paint the house");
    expect(dims.rects).toEqual([]);
    expect(dims.areasM2).toEqual([]);
    expect(dims.rooms).toBeNull();
  });
});

describe("readProject", () => {
  it("names the calculator and the measurements it found", () => {
    const reading = readProject("Paint a 4.5 m by 6 m bedroom, two coats");
    expect(reading.intent?.label).toBe("Paint Calculator");
    expect(reading.summaryLines.join(" ")).toMatch(/4\.5 x 6 m/);
    expect(reading.summaryLines.join(" ")).toMatch(/4\.5 m x 6 m/);
    expect(reading.missing).not.toContain("length and width, or a floor area");
  });

  it("says what is still missing instead of filling it in", () => {
    const reading = readProject("paint the sitting room");
    expect(reading.intent?.key).toBe("paint");
    expect(reading.missing).toContain("length and width, or a floor area");
    expect(reading.dimensions.rects).toEqual([]);
  });

  it("reports both gaps when nothing could be read", () => {
    const reading = readProject("please help");
    expect(reading.intent).toBeNull();
    expect(reading.missing).toContain("the trade or work type");
    expect(reading.missing).toContain("length and width, or a floor area");
  });
});

describe("buildProjectContext", () => {
  it("quotes the visitor and carries the reading", () => {
    const context = buildProjectContext("tile a 3 m x 4 m bathroom");
    expect(context).toContain('"""tile a 3 m x 4 m bathroom"""');
    expect(context).toContain("Tile Calculator");
    expect(context).toContain("not invented here");
  });

  it("warns the model when no calculator matched", () => {
    const context = buildProjectContext("something vague for the house");
    expect(context).toContain("illustrative");
    expect(context).toContain("Still missing");
  });
});

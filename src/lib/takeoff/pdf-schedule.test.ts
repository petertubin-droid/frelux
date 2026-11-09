import { describe, expect, it } from "vitest";
import {
  clusterTextItems,
  pdfReadFailureMessage,
  readScheduleFromLines,
  roomsFromCandidates,
  type TextLine,
} from "./pdf-schedule";
import { runTakeoff } from "./engine";

const item = (str: string, x: number, y: number) => ({
  str,
  transform: [1, 0, 0, 1, x, y],
});

describe("line clustering", () => {
  it("joins items that share a baseline, left to right", () => {
    const lines = clusterTextItems([
      item("BEDROOM 1", 100, 700),
      item("3600 x 4200", 200, 700),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("BEDROOM 1 3600 x 4200");
  });

  it("keeps items on different baselines apart", () => {
    const lines = clusterTextItems([
      item("BEDROOM 1", 100, 700),
      item("3600 x 4200", 100, 680),
    ]);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("BEDROOM 1");
    expect(lines[1].text).toBe("3600 x 4200");
  });

  it("orders lines from the top of the page down", () => {
    const lines = clusterTextItems([
      item("LOWER", 100, 100),
      item("UPPER", 100, 700),
    ]);
    expect(lines.map((line) => line.text)).toEqual(["UPPER", "LOWER"]);
  });

  it("drops empty items instead of making blank lines", () => {
    const lines = clusterTextItems([
      item(" ", 0, 0),
      item("A", 10, 10),
      item("", 20, 20),
    ]);
    expect(lines).toHaveLength(1);
  });

  it("survives an item without a transform", () => {
    expect(clusterTextItems([{ str: "SOLO" }])).toHaveLength(1);
  });
});

describe("reading a schedule", () => {
  const lines: TextLine[] = [
    { page: 1, text: "GROUND FLOOR PLAN", x: 0, y: 800 },
    { page: 1, text: "SCALE 1:100", x: 0, y: 780 },
    { page: 1, text: "BEDROOM 1 3600 x 4200", x: 0, y: 700 },
    { page: 1, text: "BEDROOM 2", x: 0, y: 640 },
    { page: 1, text: "3300 x 3600", x: 0, y: 620 },
    { page: 1, text: "SITTING 4500 x 5000", x: 0, y: 540 },
    { page: 1, text: "DOOR D1", x: 0, y: 480 },
    { page: 1, text: "900 x 2100", x: 0, y: 460 },
    { page: 1, text: "3.6 x 4.2", x: 0, y: 300 },
  ];

  const read = readScheduleFromLines(lines);

  it("finds every room dimension pair", () => {
    expect(read.candidates.length).toBeGreaterThanOrEqual(4);
  });

  it("takes the label from the same line when it is there", () => {
    const bedroom = read.candidates.find(
      (candidate) => candidate.label === "BEDROOM 1",
    );
    expect(bedroom).toBeTruthy();
    expect(bedroom?.confidence).toBe("high");
    expect(bedroom?.length).toBe(3.6);
    expect(bedroom?.width).toBe(4.2);
  });

  it("takes the label from the line above and says so", () => {
    const bedroom = read.candidates.find(
      (candidate) => candidate.label === "BEDROOM 2",
    );
    expect(bedroom?.confidence).toBe("medium");
    expect(bedroom?.notes.join(" ")).toMatch(/line above/i);
    expect(bedroom?.width).toBe(3.6);
  });

  it("marks a dimension with no label as low confidence rather than guessing", () => {
    const lonely = read.candidates.find(
      (candidate) => candidate.raw === "3.6 x 4.2",
    );
    expect(lonely?.confidence).toBe("low");
    expect(lonely?.label).toBe("Room on page 1");
  });

  it("routes a door sized dimension to openings, not rooms", () => {
    expect(read.openings.some((opening) => opening.raw === "900 x 2100")).toBe(
      true,
    );
    expect(read.candidates.some((candidate) => candidate.width === 2.1)).toBe(
      false,
    );
  });

  it("reports the scale note without applying it", () => {
    expect(read.scaleNotes).toContain("1:100");
  });

  it("reads a plain metre pair as metres", () => {
    const bedroom = read.candidates.find(
      (candidate) => candidate.raw === "3600 x 4200",
    );
    expect(bedroom?.length).toBe(3.6);
    expect(bedroom?.unit).toBe("m");
  });

  it("returns nothing for a sheet with no dimensions", () => {
    const read = readScheduleFromLines([
      { page: 1, text: "ELEVATION", x: 0, y: 700 },
      { page: 1, text: "NOTES", x: 0, y: 600 },
    ]);
    expect(read.candidates).toHaveLength(0);
    expect(read.openings).toHaveLength(0);
  });
});

describe("candidates to rooms", () => {
  const read = readScheduleFromLines([
    { page: 1, text: "BEDROOM 1 3600 x 4200", x: 0, y: 700 },
  ]);

  it("builds four walls from a plan rectangle", () => {
    const rooms = roomsFromCandidates(read.candidates, 2.7);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].walls).toHaveLength(4);
    expect(rooms[0].walls?.map((wall) => wall.length)).toEqual([
      3.6, 3.6, 4.2, 4.2,
    ]);
    expect(rooms[0].floor).toMatchObject({ length: 3.6, width: 4.2 });
  });

  it("flags walls as assumed when no height was given", () => {
    const rooms = roomsFromCandidates(read.candidates, 0);
    expect(rooms[0].walls?.every((wall) => wall.assumed)).toBe(true);
  });

  it("produces a bill the engine can measure", () => {
    const rooms = roomsFromCandidates(read.candidates, 2.7);
    const result = runTakeoff(
      { id: "imported", rooms },
      { scopes: ["blockwork"] },
    );
    // Two walls of 3.6 and two of 4.2 at 2.7 is 42.12 m2.
    expect(
      result.lines.find((line) => line.id === "blockwork-measured-area")
        ?.quantity,
    ).toBeCloseTo(42.12, 2);
    expect(result.warnings).toHaveLength(0);
  });

  it("keeps an imported room measurable when the height is missing", () => {
    const rooms = roomsFromCandidates(read.candidates, 0);
    const result = runTakeoff(
      { id: "imported", rooms },
      { scopes: ["blockwork"] },
    );
    expect(result.lines).toHaveLength(0);
    expect(result.warnings.join(" ")).toMatch(/no measurable area/i);
  });
});

describe("read failures", () => {
  it("names the browser when the runtime lacks the language features pdfjs needs", () => {
    const error = new ReferenceError("Iterator is not defined");
    expect(pdfReadFailureMessage(error)).toMatch(
      /browser cannot read PDF plans/i,
    );
  });

  it("names password protection instead of blaming the file", () => {
    expect(pdfReadFailureMessage(new Error("No password given"))).toMatch(
      /password protected/i,
    );
  });

  it("passes an ordinary message through", () => {
    expect(pdfReadFailureMessage(new Error("Invalid PDF structure"))).toBe(
      "Invalid PDF structure",
    );
  });

  it("never returns an empty message", () => {
    expect(pdfReadFailureMessage(undefined).length).toBeGreaterThan(0);
  });
});

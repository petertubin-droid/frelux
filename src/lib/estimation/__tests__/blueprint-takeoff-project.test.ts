import { describe, expect, it } from "vitest";
import {
  buildWorksheetBridgeUrl,
  createTakeoffProjectExport,
  parseTakeoffProjectExport,
  serializeTakeoffProject,
  TAKEOFF_DISCLAIMERS,
  type TakeoffMark,
} from "../blueprint-takeoff-project";

const sampleMarks: TakeoffMark[] = [
  {
    id: "m-1",
    page: 1,
    type: "linear",
    category: "masonry",
    label: "External Brick Perimeter",
    points: [
      { x: 10, y: 10 },
      { x: 110, y: 10 },
      { x: 110, y: 80 },
    ],
    quantity: 18.5,
    unit: "m",
    color: "#2563eb",
  },
  {
    id: "m-2",
    page: 1,
    type: "area",
    category: "plastering",
    label: "Main Hall Rendering",
    points: [
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 60 },
      { x: 20, y: 60 },
    ],
    quantity: 42.0,
    unit: "m²",
    color: "#e11d48",
  },
  {
    id: "m-3",
    page: 2,
    type: "count",
    category: "general",
    label: "Isolated Column Footings",
    points: [{ x: 50, y: 50 }],
    quantity: 8,
    unit: "items",
    color: "#059669",
  },
];

describe("Blueprint Takeoff Project & Worksheet Bridge", () => {
  it("creates a well-formed export project with summaries and disclaimers", () => {
    const project = createTakeoffProjectExport({
      sourceFileName: "ground-floor-plan.pdf",
      marketCode: "NG",
      pageCount: 3,
      scalesByPage: { 1: 50.2, 2: 48.0 },
      marks: sampleMarks,
    });

    expect(project.format).toBe("frelux-blueprint-takeoff");
    expect(project.version).toBe(1);
    expect(project.sourceFileName).toBe("ground-floor-plan.pdf");
    expect(project.marketCode).toBe("NG");
    expect(project.pageCount).toBe(3);
    expect(project.scalesByPage).toEqual({ 1: 50.2, 2: 48.0 });

    // Summary calculations
    expect(project.summary.totalLinearM).toBe(18.5);
    expect(project.summary.totalAreaM2).toBe(42.0);
    expect(project.summary.totalCount).toBe(8);

    // Categories rollup
    expect(project.summary.byCategory.masonry.count).toBe(1);
    expect(project.summary.byCategory.masonry.totalQuantity).toBe(18.5);
    expect(project.summary.byCategory.plastering.count).toBe(1);
    expect(project.summary.byCategory.plastering.totalQuantity).toBe(42.0);

    // Disclaimers presence
    expect(project.limitations).toEqual(TAKEOFF_DISCLAIMERS);
    expect(project.limitations.length).toBeGreaterThan(3);
  });

  it("serializes and deserializes accurately round-trip", () => {
    const original = createTakeoffProjectExport({
      sourceFileName: "warehouse-layout.png",
      marketCode: "KE",
      pageCount: 2,
      scalesByPage: { 1: 32.5 },
      marks: sampleMarks,
    });

    const json = serializeTakeoffProject(original);
    expect(typeof json).toBe("string");

    const parsed = parseTakeoffProjectExport(json);

    expect(parsed.ok).toBe(true);
    expect(parsed.project).toBeDefined();
    expect(parsed.project?.sourceFileName).toBe("warehouse-layout.png");
    expect(parsed.project?.marketCode).toBe("KE");
    expect(parsed.project?.marks.length).toBe(3);
    expect(parsed.project?.summary.totalLinearM).toBe(18.5);
  });

  it("safely handles corrupt, partial, or malformed JSON imports", () => {
    expect(parseTakeoffProjectExport("not valid json").ok).toBe(false);

    expect(
      parseTakeoffProjectExport(
        JSON.stringify({
          format: "other-format",
          version: 1,
          marks: [],
        }),
      ).ok,
    ).toBe(false);

    expect(
      parseTakeoffProjectExport(
        JSON.stringify({
          format: "frelux-blueprint-takeoff",
          version: 99,
          marks: [],
        }),
      ).ok,
    ).toBe(false);

    expect(
      parseTakeoffProjectExport(
        JSON.stringify({
          format: "frelux-blueprint-takeoff",
          version: 1,
          marks: "not-an-array",
        }),
      ).ok,
    ).toBe(false);
  });

  it("builds correct worksheet bridge URLs with complete provenance parameters", () => {
    const masonryBridge = buildWorksheetBridgeUrl({
      mark: sampleMarks[0],
      sourceFileName: "site-layout.pdf",
      marketCode: "NG",
    });

    expect(masonryBridge).not.toBeNull();
    expect(masonryBridge?.path).toBe("/masonry-calculator");
    expect(masonryBridge?.targetParam).toBe("length");
    expect(masonryBridge?.targetValue).toBe(18.5);
    expect(masonryBridge?.url).toContain("source=blueprint-takeoff");
    expect(masonryBridge?.url).toContain("length=18.5");
    expect(masonryBridge?.url).toContain("plan=site-layout.pdf");
    expect(masonryBridge?.url).toContain("category=masonry");

    const plasterBridge = buildWorksheetBridgeUrl({
      mark: sampleMarks[1],
      sourceFileName: "site-layout.pdf",
      marketCode: "NG",
    });

    expect(plasterBridge).not.toBeNull();
    expect(plasterBridge?.path).toBe("/plastering-calculator");
    expect(plasterBridge?.targetParam).toBe("area");
    expect(plasterBridge?.targetValue).toBe(42.0);
    expect(plasterBridge?.url).toContain("area=42");

    // Count mark should not produce an unsupported direct route
    const countBridge = buildWorksheetBridgeUrl({
      mark: sampleMarks[2],
      sourceFileName: "site-layout.pdf",
      marketCode: "NG",
    });
    expect(countBridge).toBeNull();
  });
});

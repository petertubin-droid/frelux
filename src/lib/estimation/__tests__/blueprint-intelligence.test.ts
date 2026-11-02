import { describe, it, expect } from "vitest";
import {
  validateBlueprintDocument,
  parseScaleAnnotation,
  detectScaleFromSheet,
  extractDimensionCandidates,
  parseDxfDocument,
  marksFromDxf,
  buildTakeoffEngineHandoff,
  PT_PER_MM,
} from "../blueprint-intelligence";
import type { TakeoffMark } from "../blueprint-takeoff-project";

// ---------------------------------------------------------------------------
// 1. Multi-sheet document validation
// ---------------------------------------------------------------------------

const A1_LONG_PT = 841 * PT_PER_MM; // 841 mm long side in PDF points
const A1_SHORT_PT = 594 * PT_PER_MM;

describe("validateBlueprintDocument", () => {
  it("classifies a clean multi-sheet architectural set", () => {
    const result = validateBlueprintDocument({
      fileName: "architectural-set.pdf",
      pageCount: 3,
      pages: [
        {
          pageNumber: 1,
          widthPt: A1_LONG_PT,
          heightPt: A1_SHORT_PT,
          rotation: 0,
          hasTextContent: true,
          hasVectorContent: true,
        },
        {
          pageNumber: 2,
          widthPt: A1_SHORT_PT,
          heightPt: A1_LONG_PT,
          rotation: 90,
          hasTextContent: true,
          hasVectorContent: true,
        },
        {
          pageNumber: 3,
          widthPt: 420 * PT_PER_MM,
          heightPt: 297 * PT_PER_MM,
          rotation: 0,
          hasTextContent: true,
          hasVectorContent: true,
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.sheets[0].sheetClass).toBe("A1");
    expect(result.sheets[0].orientation).toBe("landscape");
    expect(result.sheets[1].sheetClass).toBe("A1");
    expect(result.sheets[1].rotated).toBe(true);
    expect(result.sheets[2].sheetClass).toBe("A3");
    expect(result.summary).toContain("3 sheets");
    expect(result.summary).toContain("0 error");
  });

  it("flags scanned raster sheets and corrupt geometry", () => {
    const result = validateBlueprintDocument({
      fileName: "scans.pdf",
      pageCount: 2,
      pages: [
        {
          pageNumber: 1,
          widthPt: A1_LONG_PT,
          heightPt: A1_SHORT_PT,
          rotation: 0,
          hasTextContent: false,
          hasVectorContent: false,
        },
        {
          pageNumber: 2,
          widthPt: 0,
          heightPt: 0,
          rotation: 0,
          hasTextContent: false,
          hasVectorContent: false,
        },
      ],
    });
    expect(result.ok).toBe(false);
    const messages = result.findings.map((f) => f.message).join(" ");
    expect(messages).toMatch(/scanned raster image/);
    expect(messages).toMatch(/unreadable page geometry/);
  });

  it("warns when a page is not a standard sheet size", () => {
    const result = validateBlueprintDocument({
      fileName: "banner.pdf",
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          widthPt: 4000,
          heightPt: 500,
          rotation: 0,
          hasTextContent: true,
          hasVectorContent: true,
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.sheets[0].sheetClass).toBeNull();
    expect(
      result.findings.some((f) =>
        /not a standard A\/ARCH sheet/.test(f.message),
      ),
    ).toBe(true);
  });

  it("rejects a document with no readable pages", () => {
    const result = validateBlueprintDocument({
      fileName: "empty.pdf",
      pageCount: 0,
      pages: [],
    });
    expect(result.ok).toBe(false);
    expect(result.findings[0].severity).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// 2. Scale annotation and dimension extraction
// ---------------------------------------------------------------------------

describe("parseScaleAnnotation", () => {
  it("parses a metric ratio", () => {
    const a = parseScaleAnnotation("SECTION A-A  SCALE 1:100");
    expect(a).not.toBeNull();
    expect(a!.ratio).toBe(100);
    expect(a!.notation).toBe("metric-ratio");
  });

  it("captures the sheet class hint from '1:200 @ A1'", () => {
    const a = parseScaleAnnotation("GROUND FLOOR PLAN  1:200 @ A1");
    expect(a!.ratio).toBe(200);
    expect(a!.sheetClassHint).toBe("A1");
  });

  it("parses an imperial scale as a real ratio", () => {
    const a = parseScaleAnnotation('1/4" = 1\'-0"');
    expect(a!.ratio).toBeCloseTo(48, 1);
    expect(a!.notation).toBe("imperial");
  });

  it("returns null for text without a scale", () => {
    expect(parseScaleAnnotation("PROJECT NORTH")).toBeNull();
    expect(parseScaleAnnotation("")).toBeNull();
  });
});

describe("detectScaleFromSheet", () => {
  it("converts a 1:100 annotation on a true A1 page into meters per point", () => {
    const annotation = parseScaleAnnotation("SCALE 1:100")!;
    const out = detectScaleFromSheet({
      pageLongPt: A1_LONG_PT,
      annotation,
      sheetClass: "A1",
    });
    if ("error" in out) throw new Error(out.error);
    // The 841 mm A1 long side at 1:100 spans 84.1 m across the sheet.
    expect(out.scale.metersPerPt).toBeCloseTo(84.1 / A1_LONG_PT, 6);
    expect(out.scale.sheetClass).toBe("A1");
    expect(out.scale.note).toContain("1:100");
  });

  it("uses the annotation's own sheet hint when the page was not classified", () => {
    const annotation = parseScaleAnnotation("1:200 @ A1")!;
    const out = detectScaleFromSheet({
      pageLongPt: A1_LONG_PT,
      annotation,
      sheetClass: null,
    });
    if ("error" in out) throw new Error(out.error);
    expect(out.scale.ratio).toBe(200);
  });

  it("refuses when the page size contradicts the declared sheet class", () => {
    const annotation = parseScaleAnnotation("SCALE 1:100")!;
    const out = detectScaleFromSheet({
      pageLongPt: 420 * PT_PER_MM, // an A3-length page
      annotation,
      sheetClass: "A1",
    });
    expect("error" in out).toBe(true);
    if ("error" in out) expect(out.error).toContain("does not apply");
  });

  it("refuses when no sheet size is known at all", () => {
    const annotation = parseScaleAnnotation("SCALE 1:100")!;
    const out = detectScaleFromSheet({
      pageLongPt: A1_LONG_PT,
      annotation,
      sheetClass: null,
    });
    expect("error" in out).toBe(true);
  });
});

describe("extractDimensionCandidates", () => {
  const items = (strings: string[]) =>
    strings.map((str, i) => ({ str, x: i * 10, y: 20 }));

  it("reads bare millimetre dimensions, explicit mm and m, and feet-inch", () => {
    const found = extractDimensionCandidates(
      items(["3600", "3.6 m", "3600 mm", "12'-6\""]),
    );
    expect(found).toHaveLength(4);
    expect(found[0].meters).toBeCloseTo(3.6, 3);
    expect(found[0].unit).toBe("mm");
    expect(found[1].meters).toBeCloseTo(3.6, 3);
    expect(found[1].unit).toBe("m");
    expect(found[2].meters).toBeCloseTo(3.6, 3);
    expect(found[3].meters).toBeCloseTo(3.81, 2);
    expect(found[3].unit).toBe("ft-in");
  });

  it("rejects non-dimension strings and implausible spans", () => {
    const found = extractDimensionCandidates(
      items(["A-101", "5", "9", "ROOM 101", "999999", "0.5"]),
    );
    expect(found).toHaveLength(0);
  });

  it("keeps positional information for each candidate", () => {
    const found = extractDimensionCandidates(items(["4200"]));
    expect(found[0].x).toBe(0);
    expect(found[0].y).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// 3. ASCII DXF (CAD) parsing
// ---------------------------------------------------------------------------

const sampleDxf = [
  "0",
  "SECTION",
  "2",
  "HEADER",
  "9",
  "$INSUNITS",
  "70",
  "4",
  "0",
  "ENDSEC",
  "0",
  "SECTION",
  "2",
  "ENTITIES",
  "0",
  "LINE",
  "10",
  "0",
  "20",
  "0",
  "11",
  "3000",
  "21",
  "4000",
  "0",
  "LINE",
  "10",
  "0",
  "20",
  "0",
  "11",
  "3000",
  "21",
  "0",
  "0",
  "LWPOLYLINE",
  "90",
  "4",
  "70",
  "1",
  "10",
  "0",
  "20",
  "0",
  "10",
  "6000",
  "20",
  "0",
  "10",
  "6000",
  "20",
  "3000",
  "10",
  "0",
  "20",
  "3000",
  "0",
  "CIRCLE",
  "10",
  "1000",
  "20",
  "1000",
  "40",
  "500",
  "0",
  "ENDSEC",
  "0",
  "EOF",
].join("\n");

describe("parseDxfDocument", () => {
  it("converts DXF geometry into metres using $INSUNITS", () => {
    const out = parseDxfDocument(sampleDxf);
    if ("error" in out) throw new Error(out.error);
    const d = out.dxf;
    expect(d.units).toBe("millimetres");
    expect(d.entityCounts.line).toBe(2);
    expect(d.entityCounts.polyline).toBe(1);
    expect(d.entityCounts.circle).toBe(1);
    expect(d.lines[0].lengthM).toBeCloseTo(5.0, 3); // 3-4-5 triangle in mm
    expect(d.lines[0].end.x).toBeCloseTo(3, 3);
    expect(d.polylines[0].closed).toBe(true);
    expect(d.polylines[0].areaM2).toBeCloseTo(18.0, 3); // 6 m x 3 m
    expect(d.polylines[0].lengthM).toBeCloseTo(18.0, 3);
    expect(d.circles[0].radiusM).toBeCloseTo(0.5, 3);
    expect(d.bboxM!.maxX).toBeCloseTo(6, 3);
    expect(d.bboxM!.minY).toBeCloseTo(0, 3);
    expect(d.warnings).toHaveLength(0);
  });

  it("refuses binary DXF and files without geometric entities", () => {
    expect("error" in parseDxfDocument("AutoCAD Binary DXF\r\n\u001a0")).toBe(
      true,
    );
    const noEntities = [
      "0",
      "SECTION",
      "2",
      "HEADER",
      "0",
      "ENDSEC",
      "0",
      "SECTION",
      "2",
      "ENTITIES",
      "0",
      "ENDSEC",
      "0",
      "EOF",
    ].join("\n");
    const out = parseDxfDocument(noEntities);
    expect("error" in out).toBe(true);
    if ("error" in out)
      expect(out.error).toContain("No LINE, LWPOLYLINE or CIRCLE");
  });

  it("warns when $INSUNITS is absent and defaults to millimetres", () => {
    const noUnits = sampleDxf
      .replace("9\n$INSUNITS\n70\n4\n", "")
      .replace("9\r\n$INSUNITS\r\n70\r\n4\r\n", "");
    const out = parseDxfDocument(noUnits);
    if ("error" in out) throw new Error(out.error);
    expect(out.dxf.units).toBe("millimetres");
    expect(out.dxf.lines[0].end.x).toBeCloseTo(3, 3);
    expect(out.dxf.warnings.some((w) => w.includes("$INSUNITS"))).toBe(true);
  });
});

describe("marksFromDxf", () => {
  it("creates linear marks from lines and an area mark from a closed polyline", () => {
    const out = parseDxfDocument(sampleDxf);
    if ("dxf" in out) {
      const { marks } = marksFromDxf(out.dxf, { category: "general" });
      const linear = marks.filter((m) => m.type === "linear");
      const area = marks.filter((m) => m.type === "area");
      expect(linear).toHaveLength(2);
      expect(area).toHaveLength(1);
      expect(area[0].quantity).toBeCloseTo(18.0, 3);
      expect(area[0].unit).toBe("m²");
      expect(linear[0].quantity).toBeCloseTo(5.0, 3);
      expect(marks.every((m) => m.notes?.includes("DXF"))).toBe(true);
    } else {
      throw new Error(out.error);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Engine handoff
// ---------------------------------------------------------------------------

const makeMark = (overrides: Partial<TakeoffMark>): TakeoffMark => ({
  id: overrides.id ?? "m1",
  page: 1,
  type: "linear",
  category: "masonry",
  label: "test",
  points: [],
  quantity: 0,
  unit: "m",
  color: "#2563eb",
  ...overrides,
});

describe("buildTakeoffEngineHandoff", () => {
  it("recomputes quantities from raw geometry and hands paving areas to the concrete engine", () => {
    // 200 px per metre: a 600x400 px rectangle is 3 m x 2 m = 6 m².
    const marks: TakeoffMark[] = [
      makeMark({
        id: "lin1",
        type: "linear",
        category: "masonry",
        unit: "m",
        points: [
          { x: 0, y: 0 },
          { x: 400, y: 0 },
        ],
      }),
      makeMark({
        id: "area1",
        type: "area",
        category: "paving",
        unit: "m²",
        points: [
          { x: 0, y: 0 },
          { x: 600, y: 0 },
          { x: 600, y: 400 },
          { x: 0, y: 400 },
        ],
      }),
      makeMark({
        id: "cnt1",
        type: "count",
        category: "general",
        unit: "items",
        points: [{ x: 10, y: 10 }],
      }),
    ];
    const out = buildTakeoffEngineHandoff({
      marks,
      scalesByPage: { 1: 200 },
      slabThicknessM: 0.15,
    });
    if ("errors" in out) throw new Error(out.errors.join("; "));
    const h = out.handoff;
    expect(h.linearRunsM).toBeCloseTo(2.0, 3);
    expect(h.totalAreaM2).toBeCloseTo(6.0, 3);
    expect(h.totalCount).toBe(1);
    expect(h.byCategory.masonry.quantity).toBeCloseTo(2.0, 3);
    expect(h.byCategory.paving.quantity).toBeCloseTo(6.0, 3);
    expect(h.concreteSlabs).toHaveLength(1);
    const slab = h.concreteSlabs[0];
    expect(slab.markId).toBe("area1");
    expect(slab.lengthM).toBeCloseTo(3.0, 3);
    expect(slab.widthM).toBeCloseTo(2.0, 3);
    expect(slab.depthM).toBeCloseTo(0.15, 3);
    expect(slab.result.elementType).toBe("slab");
    expect(slab.result.concreteVolumeM3).toBeCloseTo(3.0 * 2.0 * 0.15, 3);
    expect(h.notes.some((n) => n.includes("bounding rectangle"))).toBe(true);
  });

  it("refuses to assume slab depth or an uncalibrated page", () => {
    const marks: TakeoffMark[] = [
      makeMark({
        id: "a",
        type: "area",
        category: "paving",
        unit: "m²",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      }),
    ];
    const noDepth = buildTakeoffEngineHandoff({
      marks,
      scalesByPage: { 1: 100 },
      slabThicknessM: Number(""),
    });
    expect("errors" in noDepth).toBe(true);
    if ("errors" in noDepth)
      expect(noDepth.errors[0]).toContain(
        "Slab depth must be a positive number",
      );

    const noScale = buildTakeoffEngineHandoff({
      marks,
      scalesByPage: {},
      slabThicknessM: 0.15,
    });
    expect("errors" in noScale).toBe(true);
    if ("errors" in noScale)
      expect(noScale.errors[0]).toContain("no scale calibration");
  });

  it("leaves non-paving area categories out of the concrete engine", () => {
    const marks: TakeoffMark[] = [
      makeMark({
        id: "w",
        type: "area",
        category: "plastering",
        unit: "m²",
        points: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 200 },
          { x: 0, y: 200 },
        ],
      }),
    ];
    const out = buildTakeoffEngineHandoff({
      marks,
      scalesByPage: { 1: 100 },
      slabThicknessM: 0.15,
    });
    if ("handoff" in out) {
      expect(out.handoff.totalAreaM2).toBeCloseTo(4.0, 3);
      expect(out.handoff.concreteSlabs).toHaveLength(0);
    } else {
      throw new Error(out.errors.join("; "));
    }
  });
});

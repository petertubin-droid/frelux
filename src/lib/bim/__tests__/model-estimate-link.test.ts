/**
 * Pillar 3 engine tests: bi-directional model-to-estimate linking (5D BIM).
 * Hand-verified arithmetic: declared lines mirror IfcQuantity values exactly;
 * indicative lines derive with explicit assumptions.
 */

import { describe, expect, it } from "vitest";

import type { IfcModelElement } from "../ifc-model-loader";
import {
  DEFAULT_LINK_OPTIONS,
  buildEstimateLines,
  elementIdsForLine,
  groupLinesByCategory,
  linesForElement,
} from "../model-estimate-link";

function element(
  overrides: Partial<IfcModelElement> & { globalId: string },
): IfcModelElement {
  return {
    expressID: 100,
    ifcClass: "IFCCOLUMN",
    name: "Col-A",
    quantities: [],
    geometry: [],
    ...overrides,
  };
}

describe("buildEstimateLines (5D linking)", () => {
  const column = element({
    globalId: "COL-1",
    quantities: [
      { name: "NetVolume", kind: "volume", value: 2.4 },
      { name: "GrossSideArea", kind: "area", value: 8.2 },
      { name: "NetLength", kind: "length", value: 3.6 },
    ],
  });

  it("maps a concrete column to concrete, rebar and formwork lines with exact declared values", () => {
    const index = buildEstimateLines([column]);
    const concrete = index.lineById.get(
      `concrete-Concrete - IFCCOLUMN Col-A-COL-1`,
    );
    expect(concrete).toMatchObject({
      category: "concrete",
      quantity: 2.4,
      unit: "m3",
      provenance: "declared",
    });
    const rebar = index.lineById.get(`rebar-Rebar - IFCCOLUMN Col-A-COL-1`);
    expect(rebar).toMatchObject({
      quantity: 240, // 2.4 m3 x 100 kg/m3 default density
      unit: "kg",
      provenance: "indicative",
    });
    const formwork = index.lineById.get(
      `formwork-Formwork - IFCCOLUMN Col-A-COL-1`,
    );
    expect(formwork).toMatchObject({
      quantity: 8.2,
      unit: "m2",
      provenance: "declared",
    });
    // The length quantity does not fabricate a line by itself.
    expect(index.lines).toHaveLength(3);
  });

  it("maps a roof facet to sheets and screw package with explicit indicative math", () => {
    const roof = element({
      globalId: "ROOF-1",
      ifcClass: "IFCROOF",
      name: "Roof facet",
      quantities: [{ name: "GrossArea", kind: "area", value: 20 }],
    });
    const index = buildEstimateLines([roof]);
    const covering = index.lineById.get(
      `roof-Roof covering - IFCROOF Roof facet-ROOF-1`,
    );
    expect(covering).toMatchObject({
      quantity: 20,
      unit: "m2",
      provenance: "declared",
    });
    const sheets = index.lineById.get(
      `roof-Roof sheets - IFCROOF Roof facet-ROOF-1`,
    );
    expect(sheets?.quantity).toBe(
      Math.ceil(20 / DEFAULT_LINK_OPTIONS.roofSheetNetCoverM2),
    );
    const screws = index.lineById.get(
      `roof-Screw package - IFCROOF Roof facet-ROOF-1`,
    );
    expect(screws?.quantity).toBe(
      sheets!.quantity * DEFAULT_LINK_OPTIONS.screwsPerSheet,
    );
    // No ridge length declared: 0 m with an honest note, never a guess.
    const ridge = index.lineById.get(
      `roof-Ridge cap - IFCROOF Roof facet-ROOF-1`,
    );
    expect(ridge).toMatchObject({ quantity: 0, provenance: "indicative" });
    expect(ridge?.note).toContain("no ridge length");
  });

  it("uses a declared ridge length when the model provides one", () => {
    const roof = element({
      globalId: "ROOF-2",
      ifcClass: "IFCROOF",
      quantities: [
        { name: "GrossArea", kind: "area", value: 10 },
        { name: "RidgeLength", kind: "length", value: 6.25 },
      ],
    });
    const index = buildEstimateLines([roof]);
    const ridge = index.lineById.get(`roof-Ridge cap - IFCROOF Col-A-ROOF-2`);
    expect(ridge).toMatchObject({
      quantity: 6.25,
      unit: "m",
      provenance: "declared",
    });
  });

  it("respects custom options for indicative densities", () => {
    const index = buildEstimateLines([column], { rebarDensityKgPerM3: 120 });
    expect(
      index.lineById.get(`rebar-Rebar - IFCCOLUMN Col-A-COL-1`)?.quantity,
    ).toBe(288);
  });

  it("makes every link bidirectional: element -> lines and line -> element", () => {
    const roof = element({
      globalId: "ROOF-3",
      ifcClass: "IFCROOF",
      name: "Roof",
      quantities: [{ name: "GrossArea", kind: "area", value: 4.5 }],
    });
    const index = buildEstimateLines([column, roof]);
    const colLines = linesForElement(index, "COL-1");
    expect(colLines.map((l) => l.category).sort()).toEqual([
      "concrete",
      "formwork",
      "rebar",
    ]);
    for (const line of colLines) {
      expect(elementIdsForLine(index, line.id)).toEqual(["COL-1"]);
    }
    const roofLines = linesForElement(index, "ROOF-3");
    expect(roofLines.length).toBe(4); // covering, sheets, screws, ridge
    for (const line of roofLines) {
      expect(elementIdsForLine(index, line.id)).toEqual(["ROOF-3"]);
    }
    expect(linesForElement(index, "UNKNOWN")).toEqual([]);
    expect(linesForElement(index, null)).toEqual([]);
  });

  it("invents no line for elements without declared quantities", () => {
    const bare = element({ globalId: "BARE-1", quantities: [] });
    const index = buildEstimateLines([bare]);
    expect(index.lines).toHaveLength(0);
    expect(linesForElement(index, "BARE-1")).toEqual([]);
  });

  it("groups lines by category for the BoQ table", () => {
    const index = buildEstimateLines([column]);
    const grouped = groupLinesByCategory(index);
    expect([...grouped.keys()].sort()).toEqual([
      "concrete",
      "formwork",
      "rebar",
    ]);
    expect(grouped.get("concrete")).toHaveLength(1);
  });

  it("treats openings (doors, windows, curtain walls) with declared area only", () => {
    const door = element({
      globalId: "DOOR-1",
      ifcClass: "IFCDOOR",
      quantities: [{ name: "NetArea", kind: "area", value: 1.9 }],
    });
    const index = buildEstimateLines([door]);
    expect(index.lines).toHaveLength(1);
    expect(index.lines[0]).toMatchObject({
      category: "openings",
      quantity: 1.9,
      provenance: "declared",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  createIfcTakeoffExport,
  serializeIfcTakeoffExport,
} from "./ifc-takeoff-export";
import type { IfcParseResult } from "./ifc-parser";

const parsed: IfcParseResult = {
  ok: true,
  entity_count: 10,
  elements: [{ type: "IFCWALL", count: 2, quantity_totals: {} }],
  has_quantities: false,
  unparsed_lines: 0,
  warnings: ["No quantities declared; counts only."],
  steps: [],
};

describe("portable IFC takeoff export", () => {
  it("exports a versioned source-linked summary without embedding the IFC", () => {
    const exported = createIfcTakeoffExport(
      "model.ifc",
      parsed,
      "2026-01-01T00:00:00Z",
    );
    expect(exported).toMatchObject({
      format: "frelux-ifc-takeoff",
      formatVersion: 1,
      sourceFileName: "model.ifc",
      sourceFileIncluded: false,
      exportedAt: "2026-01-01T00:00:00Z",
      takeoff: parsed,
    });
    expect(exported.limitations.join(" ")).toContain(
      "not an IFC schema certification",
    );
    expect(serializeIfcTakeoffExport("model.ifc", parsed)).toContain(
      '"sourceFileIncluded": false',
    );
  });

  it("refuses to export a rejected parse as a takeoff", () => {
    expect(() =>
      createIfcTakeoffExport("bad.ifc", { ...parsed, ok: false }),
    ).toThrow("Cannot export a refused IFC takeoff.");
  });
});

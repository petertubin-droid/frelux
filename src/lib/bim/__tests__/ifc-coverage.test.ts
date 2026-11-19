/**
 * Coverage manifest tests: what the loader claims to understand must match
 * what it actually does, and unmapped classes must be reported, never dropped.
 */

import { describe, expect, it } from "vitest";

import {
  IFC_COVERAGE,
  summarizeCoverage,
  summarizeUnits,
} from "../ifc-model-loader";

describe("IFC_COVERAGE manifest", () => {
  it("declares the schemas, quantity kinds and relations the loader handles", () => {
    expect(IFC_COVERAGE.schema).toContain("IFC4");
    expect(IFC_COVERAGE.quantityKinds).toEqual([
      "length",
      "area",
      "volume",
      "count",
      "weight",
    ]);
    expect(IFC_COVERAGE.relations.length).toBeGreaterThanOrEqual(4);
  });
});

describe("summarizeCoverage", () => {
  it("counts supported classes and reports unmapped geometry classes", () => {
    const report = summarizeCoverage(
      [
        "IFCWALL",
        "IFCWALL",
        "IFCSLAB",
        "IFCFURNITURE",
        "IFCFURNITURE",
        "IFCSENSOR",
      ],
      [
        { ifcClass: "IFCWALL" },
        { ifcClass: "IFCWALL" },
        { ifcClass: "IFCSLAB" },
      ],
    );
    expect(report.countsByClass).toEqual({ IFCWALL: 2, IFCSLAB: 1 });
    expect(report.unmappedClasses).toEqual([
      { ifcClass: "IFCFURNITURE", count: 2 },
      { ifcClass: "IFCSENSOR", count: 1 },
    ]);
    expect(report.supportedClasses).toContain("IFCWALL");
  });

  it("returns an empty unmapped list for a fully covered model", () => {
    const report = summarizeCoverage(
      ["IFCCOLUMN"],
      [{ ifcClass: "IFCCOLUMN" }],
    );
    expect(report.unmappedClasses).toEqual([]);
  });
});

describe("summarizeUnits", () => {
  it("maps SI unit names to quantity kinds", () => {
    expect(summarizeUnits(["METRE", "SQUARE_METRE", "CUBIC_METRE"])).toEqual({
      length: "METRE",
      area: "SQUARE_METRE",
      volume: "CUBIC_METRE",
      undeclared: false,
    });
  });

  it("marks a file with no units as undeclared rather than assuming metres", () => {
    expect(summarizeUnits([])).toMatchObject({
      undeclared: true,
      length: null,
    });
  });
});

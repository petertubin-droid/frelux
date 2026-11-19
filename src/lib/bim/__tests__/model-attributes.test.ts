/**
 * Accuracy attributes: read exactly what the file declares, never a default.
 * A missing property must read as null, and a declared false must stay false.
 */

import { describe, expect, it } from "vitest";

import type { IfcElementProperty } from "../ifc-model-loader";
import {
  accuracyReviewFlags,
  declaredAttributeGaps,
  EMPTY_ATTRIBUTES,
  readAccuracyAttributes,
} from "../model-attributes";

const props = (
  ...entries: Array<[string, string, string | number | boolean]>
): IfcElementProperty[] =>
  entries.map(([pset, name, value]) => ({ pset, name, value }));

describe("readAccuracyAttributes", () => {
  it("returns all nulls when the element declares no properties", () => {
    expect(readAccuracyAttributes({ properties: undefined })).toEqual(
      EMPTY_ATTRIBUTES,
    );
    expect(readAccuracyAttributes({ properties: [] })).toEqual(
      EMPTY_ATTRIBUTES,
    );
  });

  it("reads declared values verbatim, without normalising ratings", () => {
    const a = readAccuracyAttributes({
      properties: props(
        ["Pset_DoorCommon", "FireRating", "FD60"],
        ["Pset_DoorCommon", "IsExternal", false],
        ["Pset_DoorCommon", "SecurityRating", "High"],
      ),
    });
    expect(a.fireRating).toBe("FD60");
    expect(a.isExternal).toBe(false);
    expect(a.securityRating).toBe("High");
    // not declared, so not guessed
    expect(a.loadBearing).toBeNull();
    expect(a.thermalTransmittance).toBeNull();
  });

  it("distinguishes declared false from undeclared", () => {
    const declaredFalse = readAccuracyAttributes({
      properties: props(["Pset_WallCommon", "IsExternal", false]),
    });
    const undeclared = readAccuracyAttributes({ properties: [] });
    expect(declaredFalse.isExternal).toBe(false);
    expect(undeclared.isExternal).toBeNull();
  });

  it("accepts U-value aliases and parses numeric strings with commas", () => {
    expect(
      readAccuracyAttributes({
        properties: props(["Pset_X", "ThermalTransmittance", 0.28]),
      }).thermalTransmittance,
    ).toBe(0.28);
    expect(
      readAccuracyAttributes({
        properties: props(["Pset_X", "UValue", "0,31"]),
      }).thermalTransmittance,
    ).toBe(0.31);
  });

  it("matches property names case-insensitively across property sets", () => {
    const a = readAccuracyAttributes({
      properties: props(["CustomPset", "firerating", "2 HR"]),
    });
    expect(a.fireRating).toBe("2 HR");
  });
});

describe("accuracyReviewFlags", () => {
  it("flags a fire-rated opening as needing a certified rate, not a standard one", () => {
    const flags = accuracyReviewFlags("IFCDOOR", {
      ...EMPTY_ATTRIBUTES,
      fireRating: "FD60",
    });
    expect(flags.join(" ")).toMatch(/certified fire-rated unit/);
    expect(flags.join(" ")).toContain("FD60");
  });

  it("flags an undeclared rating on an opening instead of assuming standard", () => {
    const flags = accuracyReviewFlags("IFCWINDOW", EMPTY_ATTRIBUTES);
    expect(flags.join(" ")).toMatch(/No fire rating declared/);
  });

  it("raises external, load-bearing, U-value, security and finish questions", () => {
    const flags = accuracyReviewFlags("IFCWALL", {
      ...EMPTY_ATTRIBUTES,
      isExternal: true,
      loadBearing: true,
      thermalTransmittance: 0.28,
      securityRating: "High",
      finish: "Painted plaster",
    });
    const text = flags.join(" ");
    expect(text).toMatch(/external-grade rate/);
    expect(text).toMatch(/load bearing/);
    expect(text).toMatch(/U-value 0.28/);
    expect(text).toMatch(/Security rating/);
    expect(text).toMatch(/Finish declared/);
  });

  it("says nothing about specification for an element that declares nothing", () => {
    // a slab with no psets: no fire/exposure flags invented
    const flags = accuracyReviewFlags("IFCSLAB", EMPTY_ATTRIBUTES);
    expect(flags).toEqual([]);
  });
});

describe("declaredAttributeGaps", () => {
  it("lists the accuracy attributes the model did not declare", () => {
    const gaps = declaredAttributeGaps({
      ...EMPTY_ATTRIBUTES,
      fireRating: "FD60",
    });
    expect(gaps).toContain("isExternal");
    expect(gaps).not.toContain("fireRating");
  });
});

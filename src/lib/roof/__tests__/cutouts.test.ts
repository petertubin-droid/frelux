/**
 * FRELUX ROOF CUTOUTS — Tests
 *
 * Feature 8: Roof Cutouts / Penetrations
 */

import { describe, it, expect } from "vitest";
import {
  CUTOUT_TYPES,
  createCutout,
  addCutout,
  updateCutout,
  deleteCutout,
  totalCutoutArea,
  netAreaAfterCutouts,
  validateCutout,
} from "../cutouts";

describe("Roof Cutouts: Types", () => {
  it("has 5 cutout types", () => {
    expect(CUTOUT_TYPES).toHaveLength(5);
    const types = CUTOUT_TYPES.map((t) => t.type);
    expect(types).toContain("skylight");
    expect(types).toContain("courtyard");
    expect(types).toContain("equipment");
    expect(types).toContain("opening");
    expect(types).toContain("other");
  });

  it("each type has a label", () => {
    for (const t of CUTOUT_TYPES) {
      expect(t.label).toBeTruthy();
    }
  });
});

describe("Roof Cutouts: Factory", () => {
  it("creates a cutout with id, name, area, type", () => {
    const c = createCutout("Skylight A", 4, "skylight");
    expect(c.id).toBeTruthy();
    expect(c.name).toBe("Skylight A");
    expect(c.areaM2).toBe(4);
    expect(c.type).toBe("skylight");
  });

  it("clamps negative area to 0", () => {
    const c = createCutout("Invalid", -5, "other");
    expect(c.areaM2).toBe(0);
  });
});

describe("Roof Cutouts: Management", () => {
  it("adds a cutout to the list", () => {
    const cutouts = addCutout([], "Skylight", 4, "skylight");
    expect(cutouts).toHaveLength(1);
  });

  it("updates a cutout", () => {
    let cutouts = addCutout([], "Skylight", 4, "skylight");
    const id = cutouts[0].id;
    cutouts = updateCutout(cutouts, id, { areaM2: 6, name: "Big Skylight" });
    expect(cutouts[0].areaM2).toBe(6);
    expect(cutouts[0].name).toBe("Big Skylight");
  });

  it("clamps negative area on update", () => {
    let cutouts = addCutout([], "Test", 5, "opening");
    const id = cutouts[0].id;
    cutouts = updateCutout(cutouts, id, { areaM2: -10 });
    expect(cutouts[0].areaM2).toBe(0);
  });

  it("deletes a cutout", () => {
    let cutouts = addCutout([], "A", 4, "skylight");
    cutouts = addCutout(cutouts, "B", 6, "courtyard");
    const id = cutouts[0].id;
    cutouts = deleteCutout(cutouts, id);
    expect(cutouts).toHaveLength(1);
    expect(cutouts[0].name).toBe("B");
  });
});

describe("Roof Cutouts: Area Calculation", () => {
  it("calculates total cutout area", () => {
    const cutouts = [
      createCutout("A", 4, "skylight"),
      createCutout("B", 10, "courtyard"),
      createCutout("C", 2, "equipment"),
    ];
    expect(totalCutoutArea(cutouts)).toBe(16);
  });

  it("ignores negative areas in total", () => {
    const cutouts = [
      createCutout("A", 4, "skylight"),
      createCutout("B", -5, "other"), // negative, but createCutout clamps to 0
    ];
    expect(totalCutoutArea(cutouts)).toBe(4);
  });

  it("returns 0 for empty list", () => {
    expect(totalCutoutArea([])).toBe(0);
  });

  it("calculates net area after cutouts", () => {
    const cutouts = [createCutout("A", 10, "courtyard")];
    expect(netAreaAfterCutouts(100, cutouts)).toBe(90);
  });

  it("net area never goes below 0", () => {
    const cutouts = [createCutout("Huge", 200, "courtyard")];
    expect(netAreaAfterCutouts(100, cutouts)).toBe(0);
  });
});

describe("Roof Cutouts: Validation", () => {
  it("valid cutout has no errors", () => {
    const c = createCutout("Skylight", 4, "skylight");
    expect(validateCutout(c)).toHaveLength(0);
  });

  it("empty name has error", () => {
    const c = createCutout("", 4, "skylight");
    expect(validateCutout(c)).toContain("Name is required");
  });

  it("zero area has error", () => {
    const c = createCutout("Test", 0, "opening");
    expect(validateCutout(c)).toContain("Area must be greater than 0");
  });
});

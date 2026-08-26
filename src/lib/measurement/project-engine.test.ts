import { describe, it, expect } from "vitest";
import {
  createConstructionProject,
  createProjectElement,
  PROJECT_ELEMENT_TYPE_LABELS,
} from "./project-engine";

describe("measurement/project-engine", () => {
  it("createConstructionProject creates with defaults", () => {
    const p = createConstructionProject();
    expect(p.name).toBe("New Project");
    expect(p.preferredUnit).toBe("feet");
    expect(p.elements).toEqual([]);
    expect(p.status).toBe("draft");
    expect(p.id).toBeTruthy();
    expect(p.createdAt).toBeTruthy();
  });

  it("createConstructionProject accepts name and unit", () => {
    const p = createConstructionProject("My Building", "meters");
    expect(p.name).toBe("My Building");
    expect(p.preferredUnit).toBe("meters");
  });

  it("createProjectElement creates with spaces", () => {
    const e = createProjectElement("Living Room", "interior_space", "painting");
    expect(e.name).toBe("Living Room");
    expect(e.elementType).toBe("interior_space");
    expect(e.primaryCalculator).toBe("painting");
    expect(e.spaces).toEqual([]);
    expect(e.id).toBeTruthy();
  });

  it("PROJECT_ELEMENT_TYPE_LABELS has all types", () => {
    expect(
      Object.keys(PROJECT_ELEMENT_TYPE_LABELS).length,
    ).toBeGreaterThanOrEqual(3);
    for (const v of Object.values(PROJECT_ELEMENT_TYPE_LABELS)) {
      expect(typeof v).toBe("string");
    }
  });
});

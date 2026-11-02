import { describe, it, expect } from "vitest";
import {
  createBuilding,
  createMultiBuildingProject,
  addBuilding,
  renameBuilding,
  removeBuilding,
  updateBuilding,
  BUILDING_TYPE_LABELS,
} from "./multi-building";

describe("measurement/multi-building", () => {
  it("createBuilding creates with defaults", () => {
    const b = createBuilding("Main House");
    expect(b.name).toBe("Main House");
    expect(b.buildingType).toBe("main_house");
    expect(b.numberOfFloors).toBe(1);
    expect(b.elements).toEqual([]);
    expect(b.roofSpec).toBeNull();
    expect(b.id).toBeTruthy();
  });

  it("createBuilding respects custom type and floors", () => {
    const b = createBuilding("Garage", "garage", 2);
    expect(b.buildingType).toBe("garage");
    expect(b.numberOfFloors).toBe(2);
  });

  it("createMultiBuildingProject creates with defaults", () => {
    const p = createMultiBuildingProject();
    expect(p.name).toBe("New Project");
    expect(p.preferredUnit).toBe("feet");
    expect(p.buildings).toEqual([]);
    expect(p.status).toBe("draft");
    expect(p.id).toBeTruthy();
  });

  it("createMultiBuildingProject accepts name and unit", () => {
    const p = createMultiBuildingProject("My Compound", "meters");
    expect(p.name).toBe("My Compound");
    expect(p.preferredUnit).toBe("meters");
  });

  it("addBuilding adds building immutably", () => {
    const p = createMultiBuildingProject();
    const b = createBuilding("Main House");
    const updated = addBuilding(p, b);
    expect(updated.buildings.length).toBe(1);
    expect(p.buildings.length).toBe(0); // original unchanged
  });

  it("renameBuilding updates name", () => {
    const b = createBuilding("Main House");
    const p = addBuilding(createMultiBuildingProject(), b);
    const renamed = renameBuilding(p, b.id, "Big House");
    expect(renamed.buildings[0].name).toBe("Big House");
  });

  it("removeBuilding removes by id", () => {
    const b1 = createBuilding("A");
    const b2 = createBuilding("B");
    const p = addBuilding(addBuilding(createMultiBuildingProject(), b1), b2);
    const updated = removeBuilding(p, b1.id);
    expect(updated.buildings.length).toBe(1);
    expect(updated.buildings[0].id).toBe(b2.id);
  });

  it("updateBuilding applies partial updates", () => {
    const b = createBuilding("Main House");
    const p = addBuilding(createMultiBuildingProject(), b);
    const updated = updateBuilding(p, b.id, {
      numberOfFloors: 3,
      notes: "Updated",
    });
    expect(updated.buildings[0].numberOfFloors).toBe(3);
    expect(updated.buildings[0].notes).toBe("Updated");
    expect(updated.buildings[0].name).toBe("Main House"); // unchanged
  });

  it("BUILDING_TYPE_LABELS has all types", () => {
    expect(Object.keys(BUILDING_TYPE_LABELS).length).toBeGreaterThanOrEqual(10);
    expect(BUILDING_TYPE_LABELS.main_house).toBe("Main House");
    expect(BUILDING_TYPE_LABELS.boys_quarters).toBe(`Boys' Quarters`);
  });
});

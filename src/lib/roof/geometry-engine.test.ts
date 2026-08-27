import { describe, it, expect } from "vitest";
import {
  generateGeometryId,
  distanceBetween,
  createPoint,
  polygonArea,
  polygonPerimeter,
  pixelAreaToM2,
  pixelLengthToM,
  createRoofSection,
  createDefaultRoofGeometry,
  isValidSection,
  addVertex,
  moveVertex,
  deleteVertex,
  addSection,
  removeSection,
  renameSection,
  confirmGeometry,
} from "./geometry-engine";

describe("roof/geometry-engine", () => {
  it("generateGeometryId produces unique ids", () => {
    const a = generateGeometryId();
    const b = generateGeometryId();
    expect(a).not.toBe(b);
    expect(a.startsWith("g")).toBe(true);
  });

  it("distanceBetween calculates euclidean distance", () => {
    const a = createPoint(0, 0);
    const b = createPoint(3, 4);
    expect(distanceBetween(a, b)).toBe(5);
  });

  it("createPoint creates point with id", () => {
    const p = createPoint(5, 10);
    expect(p.x).toBe(5);
    expect(p.y).toBe(10);
    expect(p.id).toBeTruthy();
  });

  it("polygonArea calculates area of square", () => {
    const vertices = [
      createPoint(0, 0),
      createPoint(4, 0),
      createPoint(4, 4),
      createPoint(0, 4),
    ];
    expect(polygonArea(vertices)).toBe(16);
  });

  it("polygonArea returns 0 for < 3 vertices", () => {
    expect(polygonArea([createPoint(0, 0), createPoint(1, 1)])).toBe(0);
  });

  it("polygonPerimeter calculates perimeter of square", () => {
    const vertices = [
      createPoint(0, 0),
      createPoint(4, 0),
      createPoint(4, 4),
      createPoint(0, 4),
    ];
    expect(polygonPerimeter(vertices)).toBe(16);
  });

  it("pixelAreaToM2 converts correctly", () => {
    expect(pixelAreaToM2(10000, 100)).toBeCloseTo(1, 2);
  });

  it("pixelLengthToM converts correctly", () => {
    expect(pixelLengthToM(100, 100)).toBeCloseTo(1, 2);
  });

  it("createRoofSection creates with defaults", () => {
    const s = createRoofSection();
    expect(s.name).toBe("New Section");
    expect(s.vertices).toEqual([]);
    expect(s.confirmed).toBe(false);
    expect(s.source).toBe("manual");
    expect(s.id).toBeTruthy();
  });

  it("createDefaultRoofGeometry has at least one section", () => {
    const g = createDefaultRoofGeometry();
    expect(g.sections.length).toBeGreaterThanOrEqual(1);
  });

  it("isValidSection requires 3+ vertices", () => {
    const s = createRoofSection();
    expect(isValidSection(s)).toBe(false);
    const s2 = {
      ...s,
      vertices: [createPoint(0, 0), createPoint(1, 0), createPoint(0, 1)],
    };
    expect(isValidSection(s2)).toBe(true);
  });

  it("addVertex adds vertex to section in geometry", () => {
    const g = createDefaultRoofGeometry();
    const sectionId = g.sections[0].id;
    const updated = addVertex(g, sectionId, { x: 5, y: 10 });
    expect(updated.sections[0].vertices.length).toBe(1);
    expect(updated.sections[0].vertices[0].x).toBe(5);
  });

  it("moveVertex updates vertex position", () => {
    const g = createDefaultRoofGeometry();
    const sectionId = g.sections[0].id;
    const withVertex = addVertex(g, sectionId, { x: 5, y: 10 });
    const pointId = withVertex.sections[0].vertices[0].id;
    const moved = moveVertex(withVertex, sectionId, pointId, 20, 30);
    expect(moved.sections[0].vertices[0].x).toBe(20);
    expect(moved.sections[0].vertices[0].y).toBe(30);
  });

  it("deleteVertex removes vertex by id", () => {
    const g = createDefaultRoofGeometry();
    const sectionId = g.sections[0].id;
    const withV1 = addVertex(g, sectionId, { x: 1, y: 1 });
    const withV2 = addVertex(withV1, sectionId, { x: 2, y: 2 });
    const pointId = withV2.sections[0].vertices[0].id;
    const deleted = deleteVertex(withV2, sectionId, pointId);
    expect(deleted.sections[0].vertices.length).toBe(1);
  });

  it("addSection adds to geometry", () => {
    const g = createDefaultRoofGeometry();
    const _newSec = createRoofSection("Garage");
    const updated = addSection(g, "Garage");
    expect(updated.sections.length).toBe(g.sections.length + 1);
  });

  it("removeSection removes by id", () => {
    const g = createDefaultRoofGeometry();
    const id = g.sections[0].id;
    const updated = removeSection(g, id);
    expect(updated.sections.length).toBe(g.sections.length - 1);
  });

  it("renameSection updates name", () => {
    const g = createDefaultRoofGeometry();
    const id = g.sections[0].id;
    const updated = renameSection(g, id, "Main");
    expect(updated.sections[0].name).toBe("Main");
  });

  it("confirmGeometry sets confirmed on all sections", () => {
    const g = createDefaultRoofGeometry();
    const confirmed = confirmGeometry(g);
    expect(confirmed.sections.every((s) => s.confirmed)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  generateGeometryId,
  createPoint,
  distanceBetween,
  polygonArea,
  polygonPerimeter,
  pixelAreaToM2,
  pixelLengthToM,
  createRoofSection,
  createDefaultRoofGeometry,
  addVertex,
  moveVertex,
  deleteVertex,
  addSection,
  removeSection,
  renameSection,
  confirmGeometry,
  isValidSection,
} from "@/lib/roof/geometry-engine";

describe("generateGeometryId", () => {
  it("generates unique ids", () => {
    const a = generateGeometryId();
    const b = generateGeometryId();
    expect(a).not.toBe(b);
  });
  it("uses prefix", () => {
    const id = generateGeometryId("test");
    expect(id.startsWith("test_")).toBe(true);
  });
});

describe("createPoint", () => {
  it("creates a point with x, y, and id", () => {
    const p = createPoint(10, 20);
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
    expect(p.id).toBeTruthy();
  });
  it("accepts custom id", () => {
    const p = createPoint(0, 0, "custom-id");
    expect(p.id).toBe("custom-id");
  });
});

describe("distanceBetween", () => {
  it("calculates distance between two points", () => {
    const a = createPoint(0, 0, "a");
    const b = createPoint(3, 4, "b");
    expect(distanceBetween(a, b)).toBeCloseTo(5, 5);
  });
  it("returns 0 for same point", () => {
    const a = createPoint(5, 5, "a");
    expect(distanceBetween(a, a)).toBe(0);
  });
});

describe("polygonArea", () => {
  it("returns 0 for fewer than 3 vertices", () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([createPoint(0, 0)])).toBe(0);
    expect(polygonArea([createPoint(0, 0), createPoint(1, 1)])).toBe(0);
  });
  it("calculates area of a unit square", () => {
    const pts = [
      createPoint(0, 0, "p1"),
      createPoint(100, 0, "p2"),
      createPoint(100, 100, "p3"),
      createPoint(0, 100, "p4"),
    ];
    expect(polygonArea(pts)).toBe(10000);
  });
  it("calculates area of a triangle", () => {
    const pts = [
      createPoint(0, 0, "p1"),
      createPoint(100, 0, "p2"),
      createPoint(0, 100, "p3"),
    ];
    expect(polygonArea(pts)).toBe(5000);
  });
  it("returns absolute value regardless of winding order", () => {
    const cw = [
      createPoint(0, 0, "p1"),
      createPoint(0, 100, "p2"),
      createPoint(100, 100, "p3"),
      createPoint(100, 0, "p4"),
    ];
    expect(polygonArea(cw)).toBe(10000);
  });
});

describe("polygonPerimeter", () => {
  it("returns 0 for fewer than 2 vertices", () => {
    expect(polygonPerimeter([])).toBe(0);
    expect(polygonPerimeter([createPoint(0, 0)])).toBe(0);
  });
  it("calculates perimeter of a unit square", () => {
    const pts = [
      createPoint(0, 0, "p1"),
      createPoint(100, 0, "p2"),
      createPoint(100, 100, "p3"),
      createPoint(0, 100, "p4"),
    ];
    expect(polygonPerimeter(pts)).toBe(400);
  });
  it("calculates perimeter of a triangle", () => {
    const pts = [
      createPoint(0, 0, "p1"),
      createPoint(100, 0, "p2"),
      createPoint(0, 100, "p3"),
    ];
    expect(polygonPerimeter(pts)).toBeCloseTo(341.42, 1);
  });
});

describe("pixelAreaToM2 / pixelLengthToM", () => {
  it("converts pixel area to square meters", () => {
    expect(pixelAreaToM2(10000, 100)).toBe(1);
  });
  it("converts pixel length to meters", () => {
    expect(pixelLengthToM(100, 100)).toBe(1);
  });
  it("handles zero", () => {
    expect(pixelAreaToM2(0, 100)).toBe(0);
    expect(pixelLengthToM(0, 100)).toBe(0);
  });
});

describe("createRoofSection", () => {
  it("creates a section with a name and id", () => {
    const section = createRoofSection("Main Roof");
    expect(section.name).toBe("Main Roof");
    expect(section.id).toBeTruthy();
    expect(section.vertices).toEqual([]);
    expect(section.confirmed).toBe(false);
  });
});

describe("createDefaultRoofGeometry", () => {
  it("creates geometry with one initial section", () => {
    const geo = createDefaultRoofGeometry();
    expect(geo.sections.length).toBe(1);
    expect(geo.activeSectionId).toBeTruthy();
    expect(geo.confirmed).toBe(false);
  });
});

describe("vertex operations", () => {
  it("addVertex adds a point to the active section", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.activeSectionId!;
    const updated = addVertex(geo, sectionId, { x: 10, y: 10 });
    const active = updated.sections.find((s) => s.id === sectionId)!;
    expect(active.vertices.length).toBe(1);
    expect(active.vertices[0].x).toBe(10);
    expect(active.vertices[0].y).toBe(10);
  });

  it("addVertex un-confirms the geometry", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.activeSectionId!;
    const updated = addVertex(geo, sectionId, { x: 0, y: 0 });
    expect(updated.confirmed).toBe(false);
  });

  it("moveVertex updates the position", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.activeSectionId!;
    const added = addVertex(geo, sectionId, { x: 10, y: 10 });
    const vertexId = added.sections.find((s) => s.id === sectionId)!.vertices[0]
      .id;
    const moved = moveVertex(added, sectionId, vertexId, 50, 60);
    const active = moved.sections.find((s) => s.id === sectionId)!;
    expect(active.vertices[0].x).toBe(50);
    expect(active.vertices[0].y).toBe(60);
  });

  it("deleteVertex removes a vertex", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.activeSectionId!;
    let g = addVertex(geo, sectionId, { x: 10, y: 10 });
    g = addVertex(g, sectionId, { x: 20, y: 20 });
    const firstVertexId = g.sections.find((s) => s.id === sectionId)!
      .vertices[0].id;
    g = deleteVertex(g, sectionId, firstVertexId);
    const active = g.sections.find((s) => s.id === sectionId)!;
    expect(active.vertices.length).toBe(1);
  });

  it("deleteVertex un-confirms the geometry", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.activeSectionId!;
    const g = addVertex(geo, sectionId, { x: 10, y: 10 });
    const vid = g.sections.find((s) => s.id === sectionId)!.vertices[0].id;
    const deleted = deleteVertex(g, sectionId, vid);
    expect(deleted.confirmed).toBe(false);
  });
});

describe("section operations", () => {
  it("addSection adds a new section and sets it active", () => {
    const geo = createDefaultRoofGeometry();
    const updated = addSection(geo, "Garage");
    expect(updated.sections.length).toBe(2);
    expect(updated.activeSectionId).not.toBe(geo.activeSectionId);
  });

  it("removeSection removes a section", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.sections[0].id;
    const updated = removeSection(geo, sectionId);
    expect(updated.sections.length).toBe(0);
  });

  it("renameSection updates the name", () => {
    const geo = createDefaultRoofGeometry();
    const sectionId = geo.sections[0].id;
    const updated = renameSection(geo, sectionId, "Porch");
    expect(updated.sections[0].name).toBe("Porch");
  });
});

describe("confirmGeometry", () => {
  it("sets confirmed to true", () => {
    const geo = createDefaultRoofGeometry();
    const confirmed = confirmGeometry(geo);
    expect(confirmed.confirmed).toBe(true);
  });
});

describe("isValidSection", () => {
  it("returns false for fewer than 3 vertices", () => {
    const section = createRoofSection("Test");
    expect(isValidSection(section)).toBe(false);
  });
  it("returns true for 3 or more vertices", () => {
    let section = createRoofSection("Test");
    section = {
      ...section,
      vertices: [
        createPoint(0, 0, "v1"),
        createPoint(100, 0, "v2"),
        createPoint(50, 100, "v3"),
      ],
    };
    expect(isValidSection(section)).toBe(true);
  });
});

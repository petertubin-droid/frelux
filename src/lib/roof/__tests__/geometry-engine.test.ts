/**
 * FRELUX ROOF GEOMETRY — Tests
 *
 * Feature 3: Editable Roof Tracing
 *
 * Tests:
 *   - Polygon area (shoelace formula) with known shapes
 *   - Polygon perimeter
 *   - Scale conversion (pixel → m²)
 *   - Edge classification (heuristic)
 *   - Section validation (≥3 vertices, non-zero area)
 *   - Vertex manipulation (add, move, delete)
 *   - Section management (add, remove, rename)
 *   - Geometry confirmation
 *   - Full geometry calculation
 */

import { describe, it, expect } from 'vitest';
import {
  createPoint,
  distanceBetween,
  polygonArea,
  polygonPerimeter,
  pixelAreaToM2,
  pixelLengthToM,
  classifyEdge,
  generateEdges,
  isValidSection,
  calculateRoofGeometry,
  createRoofSection,
  createDefaultRoofGeometry,
  addVertex,
  moveVertex,
  deleteVertex,
  addSection,
  removeSection,
  renameSection,
  confirmGeometry,
  setSectionSource,
} from '../geometry-engine';
import type {
  RoofPoint,
  _RoofGeometry,
  _GeometrySource,
} from '../geometry-types';

// =========================================================
// Helper: create a square of points
// =========================================================

function squarePoints(x: number, y: number, size: number): RoofPoint[] {
  return [
    createPoint(x, y),
    createPoint(x + size, y),
    createPoint(x + size, y + size),
    createPoint(x, y + size),
  ];
}

// =========================================================
// Polygon Area
// =========================================================

describe('Roof Geometry: Polygon Area', () => {
  it('returns 0 for fewer than 3 vertices', () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([createPoint(0, 0)])).toBe(0);
    expect(polygonArea([createPoint(0, 0), createPoint(1, 0)])).toBe(0);
  });

  it('calculates area of a 100×100 square correctly', () => {
    const points = squarePoints(0, 0, 100);
    expect(polygonArea(points)).toBeCloseTo(10000, 2);
  });

  it('calculates area of a 4×3 rectangle', () => {
    const points = [
      createPoint(0, 0),
      createPoint(40, 0),
      createPoint(40, 30),
      createPoint(0, 30),
    ];
    expect(polygonArea(points)).toBeCloseTo(1200, 2);
  });

  it('calculates area of a triangle', () => {
    const points = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(50, 50),
    ];
    // Triangle area = 0.5 × base × height = 0.5 × 100 × 50 = 2500
    expect(polygonArea(points)).toBeCloseTo(2500, 2);
  });

  it('returns positive area regardless of winding order', () => {
    const clockwise = squarePoints(0, 0, 100);
    const counterClockwise = [...clockwise].reverse();
    expect(polygonArea(clockwise)).toBeCloseTo(polygonArea(counterClockwise), 2);
  });

  it('handles irregular polygon (L-shape)', () => {
    const points = [
      createPoint(0, 0),
      createPoint(200, 0),
      createPoint(200, 100),
      createPoint(100, 100),
      createPoint(100, 200),
      createPoint(0, 200),
    ];
    // L-shape: 200×100 + 100×100 = 20000 + 10000 = 30000
    expect(polygonArea(points)).toBeCloseTo(30000, 0);
  });
});

// =========================================================
// Polygon Perimeter
// =========================================================

describe('Roof Geometry: Polygon Perimeter', () => {
  it('returns 0 for fewer than 2 vertices', () => {
    expect(polygonPerimeter([])).toBe(0);
    expect(polygonPerimeter([createPoint(0, 0)])).toBe(0);
  });

  it('calculates perimeter of a 100×100 square', () => {
    const points = squarePoints(0, 0, 100);
    expect(polygonPerimeter(points)).toBeCloseTo(400, 2);
  });

  it('calculates perimeter of a triangle', () => {
    const points = [
      createPoint(0, 0),
      createPoint(30, 40),
      createPoint(30, 0),
    ];
    // 50 + 40 + 30 = 120 (3-4-5 triangle)
    expect(polygonPerimeter(points)).toBeCloseTo(120, 2);
  });
});

// =========================================================
// Scale Conversion
// =========================================================

describe('Roof Geometry: Scale Conversion', () => {
  it('converts pixel area to m²', () => {
    // 10000 px² with 10 px/m → 100 m²
    expect(pixelAreaToM2(10000, 10)).toBeCloseTo(100, 2);
  });

  it('converts pixel length to meters', () => {
    // 500 px with 10 px/m → 50 m
    expect(pixelLengthToM(500, 10)).toBeCloseTo(50, 2);
  });

  it('returns 0 for invalid scale', () => {
    expect(pixelAreaToM2(10000, 0)).toBe(0);
    expect(pixelAreaToM2(10000, -1)).toBe(0);
    expect(pixelLengthToM(500, 0)).toBe(0);
  });
});

// =========================================================
// Edge Classification
// =========================================================

describe('Roof Geometry: Edge Classification', () => {
  it('classifies top horizontal edge as ridge', () => {
    const vertices = [
      createPoint(0, 0),      // top-left
      createPoint(100, 0),    // top-right
      createPoint(100, 100),  // bottom-right
      createPoint(0, 100),    // bottom-left
    ];
    const type = classifyEdge(vertices[0], vertices[1], vertices);
    expect(type).toBe('ridge');
  });

  it('classifies bottom horizontal edge as eave', () => {
    const vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const type = classifyEdge(vertices[2], vertices[3], vertices);
    expect(type).toBe('eave');
  });

  it('classifies vertical edge as rake', () => {
    const vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const type = classifyEdge(vertices[0], vertices[3], vertices);
    expect(type).toBe('rake');
  });

  it('returns unclassified for degenerate polygon', () => {
    const vertices = [createPoint(0, 0), createPoint(1, 0)];
    const type = classifyEdge(vertices[0], vertices[1], vertices);
    expect(type).toBe('unclassified');
  });
});

// =========================================================
// Edge Generation
// =========================================================

describe('Roof Geometry: Edge Generation', () => {
  it('generates edges for a square', () => {
    const section = createRoofSection('Test');
    section.vertices = squarePoints(0, 0, 100);
    const edges = generateEdges(section);
    expect(edges).toHaveLength(4);
    edges.forEach(e => {
      expect(e.sectionId).toBe(section.id);
      expect(e.confirmed).toBe(false);
    });
  });

  it('generates 0 edges for < 2 vertices', () => {
    const section = createRoofSection('Test');
    section.vertices = [createPoint(0, 0)];
    expect(generateEdges(section)).toHaveLength(0);
  });
});

// =========================================================
// Section Validation
// =========================================================

describe('Roof Geometry: Section Validation', () => {
  it('is invalid with < 3 vertices', () => {
    const section = createRoofSection('Test');
    section.vertices = [createPoint(0, 0), createPoint(1, 0)];
    expect(isValidSection(section)).toBe(false);
  });

  it('is invalid with zero area (collinear points)', () => {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(10, 0),
      createPoint(20, 0), // collinear
    ];
    expect(isValidSection(section)).toBe(false);
  });

  it('is valid with 4 non-collinear vertices', () => {
    const section = createRoofSection('Test');
    section.vertices = squarePoints(0, 0, 100);
    expect(isValidSection(section)).toBe(true);
  });
});

// =========================================================
// Vertex Manipulation
// =========================================================

describe('Roof Geometry: Vertex Manipulation', () => {
  it('adds a vertex to a section', () => {
    const geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    const result = addVertex(geom, sectionId, { x: 50, y: 50 });
    expect(result.sections[0].vertices).toHaveLength(1);
    expect(result.sections[0].vertices[0].x).toBe(50);
    expect(result.sections[0].vertices[0].y).toBe(50);
  });

  it('moving a vertex updates position and un-confirms', () => {
    let geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    geom = addVertex(geom, sectionId, { x: 50, y: 50 });
    geom = confirmGeometry(geom);
    expect(geom.confirmed).toBe(true);

    const pointId = geom.sections[0].vertices[0].id;
    const result = moveVertex(geom, sectionId, pointId, 100, 100);
    expect(result.sections[0].vertices[0]).toEqual(
      expect.objectContaining({ x: 100, y: 100 })
    );
    expect(result.confirmed).toBe(false);
    expect(result.sections[0].confirmed).toBe(false);
  });

  it('deletes a vertex and un-confirms', () => {
    let geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    geom = addVertex(geom, sectionId, { x: 50, y: 50 });
    geom = addVertex(geom, sectionId, { x: 100, y: 50 });
    geom = confirmGeometry(geom);

    const pointId = geom.sections[0].vertices[0].id;
    const result = deleteVertex(geom, sectionId, pointId);
    expect(result.sections[0].vertices).toHaveLength(1);
    expect(result.confirmed).toBe(false);
  });
});

// =========================================================
// Section Management
// =========================================================

describe('Roof Geometry: Section Management', () => {
  it('adds a section and sets it active', () => {
    const geom = createDefaultRoofGeometry();
    const result = addSection(geom, 'Garage', 'manual');
    expect(result.sections).toHaveLength(2);
    expect(result.activeSectionId).toBe(result.sections[1].id);
    expect(result.sections[1].name).toBe('Garage');
  });

  it('removes a section and updates active section', () => {
    const geom = createDefaultRoofGeometry();
    const result = addSection(geom, 'Garage', 'manual');
    const garageId = result.sections[1].id;

    const removed = removeSection(result, garageId);
    expect(removed.sections).toHaveLength(1);
    expect(removed.activeSectionId).toBe(geom.sections[0].id);
  });

  it('renames a section', () => {
    const geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    const result = renameSection(geom, sectionId, 'Porch');
    expect(result.sections[0].name).toBe('Porch');
  });

  it('sets section source', () => {
    const geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    const result = setSectionSource(geom, sectionId, 'ai_image');
    expect(result.sections[0].source).toBe('ai_image');
  });
});

// =========================================================
// Geometry Confirmation
// =========================================================

describe('Roof Geometry: Confirmation', () => {
  it('confirms all sections and the geometry', () => {
    let geom = createDefaultRoofGeometry();
    geom = addSection(geom, 'Garage', 'manual');
    const result = confirmGeometry(geom);
    expect(result.confirmed).toBe(true);
    result.sections.forEach(s => expect(s.confirmed).toBe(true));
  });

  it('modifying after confirmation un-confirms', () => {
    let geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    geom = confirmGeometry(geom);
    const result = addVertex(geom, sectionId, { x: 50, y: 50 });
    expect(result.confirmed).toBe(false);
  });
});

// =========================================================
// Full Geometry Calculation
// =========================================================

describe('Roof Geometry: Full Calculation', () => {
  it('calculates total area across multiple sections', () => {
    let geom = createDefaultRoofGeometry();
    const section1Id = geom.activeSectionId!;
    geom = addVertex(geom, section1Id, { x: 0, y: 0 });
    geom = addVertex(geom, section1Id, { x: 100, y: 0 });
    geom = addVertex(geom, section1Id, { x: 100, y: 100 });
    geom = addVertex(geom, section1Id, { x: 0, y: 100 });

    geom = addSection(geom, 'Porch', 'manual');
    const section2Id = geom.sections[1].id;
    geom = addVertex(geom, section2Id, { x: 0, y: 0 });
    geom = addVertex(geom, section2Id, { x: 50, y: 0 });
    geom = addVertex(geom, section2Id, { x: 50, y: 50 });
    geom = addVertex(geom, section2Id, { x: 0, y: 50 });

    const result = calculateRoofGeometry(geom);
    expect(result.sections).toHaveLength(2);
    expect(result.validSectionCount).toBe(2);
    expect(result.totalPlanAreaM2).toBeCloseTo(10000 + 2500, 0); // pixel²
  });

  it('calculates with scale conversion', () => {
    let geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    geom = addVertex(geom, sectionId, { x: 0, y: 0 });
    geom = addVertex(geom, sectionId, { x: 100, y: 0 });
    geom = addVertex(geom, sectionId, { x: 100, y: 100 });
    geom = addVertex(geom, sectionId, { x: 0, y: 100 });

    // 10 px/m → 100×100 = 10000 px² → 10000 / 100 = 100 m²
    const result = calculateRoofGeometry(geom, 10);
    expect(result.totalPlanAreaM2).toBeCloseTo(100, 2);
  });

  it('marks invalid sections correctly', () => {
    let geom = createDefaultRoofGeometry();
    const sectionId = geom.activeSectionId!;
    // Only 2 vertices — invalid
    geom = addVertex(geom, sectionId, { x: 0, y: 0 });
    geom = addVertex(geom, sectionId, { x: 100, y: 0 });

    const result = calculateRoofGeometry(geom);
    expect(result.validSectionCount).toBe(0);
    expect(result.totalPlanAreaM2).toBe(0);
  });
});

// =========================================================
// Distance Between
// =========================================================

describe('Roof Geometry: Distance', () => {
  it('calculates distance between two points', () => {
    const a = createPoint(0, 0);
    const b = createPoint(30, 40);
    expect(distanceBetween(a, b)).toBeCloseTo(50, 2);
  });

  it('returns 0 for same point', () => {
    const a = createPoint(50, 50);
    expect(distanceBetween(a, a)).toBe(0);
  });
});

// =========================================================
// AI-Generated Geometry Never Auto-Confirmed
// =========================================================

describe('Roof Geometry: AI Source Never Auto-Confirmed', () => {
  it('creates AI-sourced section as unconfirmed', () => {
    const section = createRoofSection('AI Section', 'ai_image');
    expect(section.confirmed).toBe(false);
    expect(section.source).toBe('ai_image');
  });

  it('geometry with AI sections is not confirmed until user confirms', () => {
    let geom = createDefaultRoofGeometry();
    geom = setSectionSource(geom, geom.activeSectionId!, 'ai_image');
    expect(geom.confirmed).toBe(false);
    expect(geom.sections[0].source).toBe('ai_image');

    // User must explicitly confirm
    const confirmed = confirmGeometry(geom);
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.sections[0].confirmed).toBe(true);
  });
});

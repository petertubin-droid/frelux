/**
 * FRELUX ROOF GEOMETRY — Calculation Engine
 *
 * Pure functions for calculating roof geometry from traced polygons.
 *
 * Supports:
 *   - Polygon area (shoelace formula)
 *   - Polygon perimeter
 *   - Edge classification (by position — auto-classification, user can correct)
 *   - Point-in-polygon test
 *   - Vertex manipulation (add, move, delete)
 *
 * All functions are pure — no side effects, no state.
 * Feature 3: Editable Roof Tracing
 */

import type {
  RoofPoint,
  RoofSectionGeometry,
  RoofGeometry,
  RoofEdge,
  EdgeType,
  SectionAreaResult,
  RoofGeometryCalculation,
  GeometrySource,
} from './geometry-types';

// =========================================================
// ID Generation
// =========================================================

let idCounter = 0;

export function generateGeometryId(prefix: string = 'g'): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

// =========================================================
// Point Operations
// =========================================================

/**
 * Calculate the distance between two points.
 */
export function distanceBetween(a: RoofPoint, b: RoofPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create a new point at the given coordinates.
 */
export function createPoint(x: number, y: number, id?: string): RoofPoint {
  return { id: id ?? generateGeometryId('pt'), x, y };
}

// =========================================================
// Polygon Area (Shoelace Formula)
// =========================================================

/**
 * Calculate the area of a polygon using the shoelace formula.
 *
 * Returns the ABSOLUTE value (always positive).
 * Returns 0 for fewer than 3 vertices.
 *
 * @param vertices Ordered list of polygon vertices
 * @returns Area in the same unit² as the vertex coordinates
 */
export function polygonArea(vertices: RoofPoint[]): number {
  if (vertices.length < 3) return 0;

  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Calculate the perimeter of a polygon.
 */
export function polygonPerimeter(vertices: RoofPoint[]): number {
  if (vertices.length < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    perimeter += distanceBetween(current, next);
  }

  return perimeter;
}

// =========================================================
// Scale Conversion
// =========================================================

/**
 * Convert pixel area to m² using a scale factor.
 *
 * @param pixelArea Area in pixels²
 * @param pixelsPerMeter Scale: how many pixels represent 1 meter
 * @returns Area in m²
 */
export function pixelAreaToM2(pixelArea: number, pixelsPerMeter: number): number {
  if (pixelsPerMeter <= 0) return 0;
  return pixelArea / (pixelsPerMeter * pixelsPerMeter);
}

/**
 * Convert pixel length to meters.
 */
export function pixelLengthToM(pixelLength: number, pixelsPerMeter: number): number {
  if (pixelsPerMeter <= 0) return 0;
  return pixelLength / pixelsPerMeter;
}

// =========================================================
// Edge Classification (heuristic — user can correct)
// =========================================================

/**
 * Classify an edge based on its position in the polygon.
 *
 * This is a HEURISTIC — it's not always correct, and the user must be able
 * to correct classifications. The classification is based on:
 *   - Top edges → likely ridge or rake
 *   - Bottom edges → likely eave
 *   - Side edges on a gable → likely rake
 *
 * For hip roofs, diagonal edges are hip/valley.
 *
 * This auto-classification is a starting point only.
 */
export function classifyEdge(
  from: RoofPoint,
  to: RoofPoint,
  allVertices: RoofPoint[],
): EdgeType {
  // For a simple polygon, we classify by Y position:
  // Top edges (smallest Y) → ridge
  // Bottom edges (largest Y) → eave
  // Vertical or near-vertical side edges → rake
  // Diagonal edges → hip or valley (can't auto-determine → unclassified)

  if (allVertices.length < 3) return 'unclassified';

  const yValues = allVertices.map(v => v.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const yRange = maxY - minY;

  if (yRange < 0.01) return 'unclassified'; // degenerate

  const _midY = (minY + maxY) / 2;
  const edgeMidY = (from.y + to.y) / 2;

  // Threshold: within 20% of top or bottom
  const threshold = yRange * 0.2;

  // Horizontal edge
  const dy = Math.abs(to.y - from.y);
  const dx = Math.abs(to.x - from.x);
  const isHorizontal = dy < dx * 0.15;

  if (isHorizontal) {
    if (Math.abs(edgeMidY - minY) < threshold) return 'ridge';
    if (Math.abs(edgeMidY - maxY) < threshold) return 'eave';
    return 'unclassified';
  }

  // Near-vertical → rake (gable side)
  const angle = Math.atan2(dy, dx);
  if (angle > Math.PI / 3) { // > 60 degrees from horizontal
    return 'rake';
  }

  // Diagonal → could be hip or valley (user must determine)
  return 'unclassified';
}

/**
 * Generate edges from a section's vertices.
 */
export function generateEdges(section: RoofSectionGeometry): RoofEdge[] {
  const edges: RoofEdge[] = [];
  for (let i = 0; i < section.vertices.length; i++) {
    const from = section.vertices[i];
    const to = section.vertices[(i + 1) % section.vertices.length];

    // Only create edges if we have enough vertices for a polygon
    if (section.vertices.length < 2) continue;

    const edgeType = classifyEdge(from, to, section.vertices);
    edges.push({
      id: generateGeometryId('edge'),
      sectionId: section.id,
      from,
      to,
      type: edgeType,
      confirmed: false,
    });
  }
  return edges;
}

// =========================================================
// Section Validation
// =========================================================

/**
 * Check if a section has a valid polygon (≥3 vertices, non-zero area).
 */
export function isValidSection(section: RoofSectionGeometry): boolean {
  if (section.vertices.length < 3) return false;
  const area = polygonArea(section.vertices);
  return area > 0.001; // non-trivial area
}

// =========================================================
// Full Geometry Calculation
// =========================================================

/**
 * Calculate all section areas and totals for a roof geometry.
 *
 * @param geometry The complete roof geometry
 * @param pixelsPerMeter Scale factor (pixels per meter). If 0 or negative, areas are in pixel².
 * @returns Calculation result with per-section and total areas
 */
export function calculateRoofGeometry(
  geometry: RoofGeometry,
  pixelsPerMeter: number = 0,
): RoofGeometryCalculation {
  const sections: SectionAreaResult[] = [];
  let totalPlanAreaM2 = 0;
  let validSectionCount = 0;

  for (const section of geometry.sections) {
    const pixelArea = polygonArea(section.vertices);
    const areaM2 = pixelsPerMeter > 0
      ? pixelAreaToM2(pixelArea, pixelsPerMeter)
      : pixelArea;

    const valid = isValidSection(section);

    sections.push({
      sectionId: section.id,
      sectionName: section.name,
      planAreaM2: areaM2,
      vertexCount: section.vertices.length,
      valid,
    });

    if (valid) {
      totalPlanAreaM2 += areaM2;
      validSectionCount += 1;
    }
  }

  return {
    sections,
    totalPlanAreaM2,
    validSectionCount,
    confirmed: geometry.confirmed,
  };
}

// =========================================================
// Section Factory
// =========================================================

/**
 * Create a new empty roof section.
 */
export function createRoofSection(
  name: string = 'New Section',
  source: GeometrySource = 'manual',
): RoofSectionGeometry {
  return {
    id: generateGeometryId('sec'),
    name,
    vertices: [],
    confirmed: false,
    source,
  };
}

/**
 * Create a default roof geometry with one empty section.
 */
export function createDefaultRoofGeometry(): RoofGeometry {
  const section = createRoofSection('Main Roof', 'manual');
  return {
    sections: [section],
    activeSectionId: section.id,
    confirmed: false,
  };
}

// =========================================================
// Vertex Manipulation
// =========================================================

/**
 * Add a vertex to a section's polygon.
 */
export function addVertex(
  geometry: RoofGeometry,
  sectionId: string,
  point: { x: number; y: number },
): RoofGeometry {
  return {
    ...geometry,
    sections: geometry.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        vertices: [...s.vertices, createPoint(point.x, point.y)],
        confirmed: false, // modifying geometry un-confirms it
      };
    }),
    confirmed: false,
  };
}

/**
 * Move a vertex to a new position.
 */
export function moveVertex(
  geometry: RoofGeometry,
  sectionId: string,
  pointId: string,
  x: number,
  y: number,
): RoofGeometry {
  return {
    ...geometry,
    sections: geometry.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        vertices: s.vertices.map(v =>
          v.id === pointId ? { ...v, x, y } : v
        ),
        confirmed: false,
      };
    }),
    confirmed: false,
  };
}

/**
 * Delete a vertex from a section's polygon.
 */
export function deleteVertex(
  geometry: RoofGeometry,
  sectionId: string,
  pointId: string,
): RoofGeometry {
  return {
    ...geometry,
    sections: geometry.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        vertices: s.vertices.filter(v => v.id !== pointId),
        confirmed: false,
      };
    }),
    confirmed: false,
  };
}

/**
 * Add a new section to the geometry.
 */
export function addSection(
  geometry: RoofGeometry,
  name: string,
  source: GeometrySource = 'manual',
): RoofGeometry {
  const newSection = createRoofSection(name, source);
  return {
    sections: [...geometry.sections, newSection],
    activeSectionId: newSection.id,
    confirmed: false,
  };
}

/**
 * Remove a section from the geometry.
 */
export function removeSection(
  geometry: RoofGeometry,
  sectionId: string,
): RoofGeometry {
  const remaining = geometry.sections.filter(s => s.id !== sectionId);
  const newActive = geometry.activeSectionId === sectionId
    ? (remaining[0]?.id ?? null)
    : geometry.activeSectionId;

  return {
    sections: remaining,
    activeSectionId: newActive,
    confirmed: false,
  };
}

/**
 * Rename a section.
 */
export function renameSection(
  geometry: RoofGeometry,
  sectionId: string,
  name: string,
): RoofGeometry {
  return {
    ...geometry,
    sections: geometry.sections.map(s =>
      s.id === sectionId ? { ...s, name } : s
    ),
  };
}

/**
 * Confirm the entire geometry (user has verified all sections).
 */
export function confirmGeometry(geometry: RoofGeometry): RoofGeometry {
  return {
    ...geometry,
    sections: geometry.sections.map(s => ({ ...s, confirmed: true })),
    confirmed: true,
  };
}

/**
 * Update a section's source.
 */
export function setSectionSource(
  geometry: RoofGeometry,
  sectionId: string,
  source: GeometrySource,
): RoofGeometry {
  return {
    ...geometry,
    sections: geometry.sections.map(s =>
      s.id === sectionId ? { ...s, source } : s
    ),
  };
}

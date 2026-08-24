/**
 * FRELUX ROOF GEOMETRY — Types
 *
 * Type definitions for editable roof geometry tracing.
 *
 * A RoofGeometry is a collection of roof sections. Each section is a
 * polygon defined by vertices (points). The user can add, move, and
 * delete vertices to trace the roof outline.
 *
 * Feature 3: Editable Roof Tracing
 */

// =========================================================
// Point Types
// =========================================================

/**
 * A 2D point in roof geometry space.
 * Coordinates are in the roof tracing coordinate system (pixels or meters
 * depending on context — the UI converts between them).
 */
export interface RoofPoint {
  id: string;
  x: number;
  y: number;
}

// =========================================================
// Roof Section (Polygon)
// =========================================================

/**
 * A roof section is a polygon (closed shape) defined by an ordered list
 * of vertices. The polygon is closed — the last point connects to the first.
 */
export interface RoofSectionGeometry {
  id: string;
  name: string;
  /** Ordered list of vertices forming the polygon boundary */
  vertices: RoofPoint[];
  /** Whether the user has confirmed this geometry */
  confirmed: boolean;
  /** Source of the geometry (manual, AI-detected, imported) */
  source: GeometrySource;
  /** Optional notes */
  notes?: string;
}

// =========================================================
// Measurement Source
// =========================================================

export type GeometrySource =
  | 'manual'           // User drew it manually
  | 'ai_image'         // AI detected from building photo
  | 'ai_plan'          // AI detected from building plan
  | 'satellite'        // From satellite/aerial imagery
  | 'imported'         // Imported from external file
  | 'user_verified'    // AI-generated but user-verified
  | 'unknown';

// =========================================================
// Full Roof Geometry (all sections)
// =========================================================

/**
 * Complete roof geometry for a building.
 * Contains multiple sections (Main Roof, Garage, Porch, etc.).
 */
export interface RoofGeometry {
  sections: RoofSectionGeometry[];
  /** ID of the currently active/selected section */
  activeSectionId: string | null;
  /** Whether the geometry has been confirmed for calculation */
  confirmed: boolean;
}

// =========================================================
// Edge Types (for Feature 7 — edge classification)
// =========================================================

export type EdgeType =
  | 'eave'      // Bottom edge of a roof slope (gutter line)
  | 'rake'      // Angled edge on a gable end
  | 'ridge'     // Top horizontal edge where two slopes meet
  | 'hip'       // External angle where two roof slopes meet
  | 'valley'    // Internal angle where two roof slopes meet
  | 'parapet'   // Low wall at edge of flat roof
  | 'unclassified';

/**
 * An edge between two consecutive vertices in a roof section.
 */
export interface RoofEdge {
  id: string;
  sectionId: string;
  from: RoofPoint;
  to: RoofPoint;
  type: EdgeType;
  /** Length in meters (calculated from pixel coordinates + scale) */
  lengthM?: number;
  /** Whether the user has confirmed the edge classification */
  confirmed: boolean;
}

// =========================================================
// Geometry Calculation Results
// =========================================================

/**
 * Calculated area for a roof section.
 */
export interface SectionAreaResult {
  sectionId: string;
  sectionName: string;
  /** Horizontal (plan) area in m² */
  planAreaM2: number;
  /** Number of vertices */
  vertexCount: number;
  /** Whether the polygon is valid (≥3 vertices, non-zero area) */
  valid: boolean;
}

/**
 * Complete geometry calculation result.
 */
export interface RoofGeometryCalculation {
  sections: SectionAreaResult[];
  totalPlanAreaM2: number;
  validSectionCount: number;
  confirmed: boolean;
}

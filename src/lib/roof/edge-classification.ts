/**
 * FRELUX ROOF EDGE CLASSIFICATION — Engine
 *
 * Extends the existing edge classification with:
 *   - User correction of edge types
 *   - Linear quantity calculation per edge type (ridge, hip, valley, eave, rake, parapet)
 *   - Edge summary for material planning (ridge caps, valley flashing, drip edge, fascia)
 *
 * Does NOT hardcode material quantities — only calculates linear measurements.
 * Material quantities are determined by configurable material specifications (Feature 17).
 *
 * Feature 7: Roof Edge Classification
 */

import type { RoofEdge, EdgeType, RoofSectionGeometry } from './geometry-types';
import { distanceBetween, pixelLengthToM, generateEdges } from './geometry-engine';

// =========================================================
// Edge Type Metadata
// =========================================================

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  eave: 'Eave (gutter line)',
  rake: 'Rake (gable edge)',
  ridge: 'Ridge (top edge)',
  hip: 'Hip (external angle)',
  valley: 'Valley (internal angle)',
  parapet: 'Parapet (low wall)',
  unclassified: 'Unclassified',
};

export const EDGE_TYPE_COLORS: Record<EdgeType, string> = {
  eave: '#3b82f6',      // blue
  rake: '#10b981',      // green
  ridge: '#f59e0b',     // amber
  hip: '#8b5cf6',       // purple
  valley: '#ec4899',    // pink
  parapet: '#6b7280',   // gray
  unclassified: '#9ca3af',
};

/**
 * Edge types that are relevant for linear material calculations.
 */
export const LINEAR_EDGE_TYPES: EdgeType[] = [
  'ridge', 'hip', 'valley', 'eave', 'rake', 'parapet',
];

// =========================================================
// Edge Correction
// =========================================================

/**
 * Reclassify an edge to a different type (user correction).
 * Returns a new edge array with the corrected type.
 */
export function reclassifyEdge(
  edges: RoofEdge[],
  edgeId: string,
  newType: EdgeType,
): RoofEdge[] {
  return edges.map(e =>
    e.id === edgeId
      ? { ...e, type: newType, confirmed: true }
      : e
  );
}

/**
 * Confirm all edge classifications (user has reviewed them).
 */
export function confirmAllEdges(edges: RoofEdge[]): RoofEdge[] {
  return edges.map(e => ({ ...e, confirmed: true }));
}

/**
 * Get edges that are not yet confirmed by the user.
 */
export function getUnconfirmedEdges(edges: RoofEdge[]): RoofEdge[] {
  return edges.filter(e => !e.confirmed);
}

// =========================================================
// Linear Quantity Calculation
// =========================================================

/**
 * Calculate the total length of edges by type.
 * Returns a map of edge type → total length in meters.
 *
 * @param edges The edges to calculate
 * @param pixelsPerMeter Scale factor (0 = returns pixel lengths)
 */
export function calculateEdgeLengths(
  edges: RoofEdge[],
  pixelsPerMeter: number = 0,
): Record<EdgeType, number> {
  const totals: Record<EdgeType, number> = {
    eave: 0,
    rake: 0,
    ridge: 0,
    hip: 0,
    valley: 0,
    parapet: 0,
    unclassified: 0,
  };

  for (const edge of edges) {
    const pixelLength = distanceBetween(edge.from, edge.to);
    const lengthM = pixelsPerMeter > 0
      ? pixelLengthToM(pixelLength, pixelsPerMeter)
      : pixelLength;
    totals[edge.type] += lengthM;
  }

  return totals;
}

// =========================================================
// Edge Summary
// =========================================================

export interface EdgeSummaryLine {
  type: EdgeType;
  label: string;
  lengthM: number;
  edgeCount: number;
  confirmed: boolean;
}

export interface EdgeSummary {
  lines: EdgeSummaryLine[];
  totalLengthM: number;
  unconfirmedCount: number;
  hasEdges: boolean;
}

/**
 * Generate a summary of all edge types with their total lengths.
 *
 * @param section The roof section
 * @param pixelsPerMeter Scale factor (0 = pixel lengths)
 */
export function getEdgeSummary(
  section: RoofSectionGeometry,
  pixelsPerMeter: number = 0,
): EdgeSummary {
  const edges = generateEdges(section);
  const lengths = calculateEdgeLengths(edges, pixelsPerMeter);

  const lines: EdgeSummaryLine[] = [];
  let totalLengthM = 0;
  let unconfirmedCount = 0;

  for (const type of LINEAR_EDGE_TYPES) {
    const length = lengths[type];
    if (length > 0) {
      const typeEdges = edges.filter(e => e.type === type);
      const allConfirmed = typeEdges.every(e => e.confirmed);
      if (!allConfirmed) unconfirmedCount += typeEdges.length;

      lines.push({
        type,
        label: EDGE_TYPE_LABELS[type],
        lengthM: length,
        edgeCount: typeEdges.length,
        confirmed: allConfirmed,
      });
      totalLengthM += length;
    }
  }

  // Include unclassified if present
  if (lengths.unclassified > 0) {
    const unclassifiedEdges = edges.filter(e => e.type === 'unclassified');
    unconfirmedCount += unclassifiedEdges.length;
    lines.push({
      type: 'unclassified',
      label: EDGE_TYPE_LABELS.unclassified,
      lengthM: lengths.unclassified,
      edgeCount: unclassifiedEdges.length,
      confirmed: false,
    });
    totalLengthM += lengths.unclassified;
  }

  return {
    lines,
    totalLengthM,
    unconfirmedCount,
    hasEdges: edges.length > 0,
  };
}

// =========================================================
// Multi-Section Edge Summary
// =========================================================

/**
 * Calculate edge summaries across all sections in a geometry.
 */
export function getMultiSectionEdgeSummary(
  sections: RoofSectionGeometry[],
  pixelsPerMeter: number = 0,
): EdgeSummary {
  let allLines: EdgeSummaryLine[] = [];
  let totalLengthM = 0;
  let unconfirmedCount = 0;

  for (const section of sections) {
    const summary = getEdgeSummary(section, pixelsPerMeter);
    allLines = [...allLines, ...summary.lines];
    totalLengthM += summary.totalLengthM;
    unconfirmedCount += summary.unconfirmedCount;
  }

  // Merge lines by type
  const merged: Record<string, EdgeSummaryLine> = {};
  for (const line of allLines) {
    if (!merged[line.type]) {
      merged[line.type] = { ...line };
    } else {
      merged[line.type].lengthM += line.lengthM;
      merged[line.type].edgeCount += line.edgeCount;
      merged[line.type].confirmed = merged[line.type].confirmed && line.confirmed;
    }
  }

  return {
    lines: Object.values(merged),
    totalLengthM,
    unconfirmedCount,
    hasEdges: allLines.length > 0,
  };
}

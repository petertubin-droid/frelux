/**
 * FRELUX ROOF EDGE CLASSIFICATION — Tests
 *
 * Feature 7: Roof Edge Classification
 */

import { describe, it, expect } from 'vitest';
import {
  EDGE_TYPE_LABELS,
  LINEAR_EDGE_TYPES,
  reclassifyEdge,
  confirmAllEdges,
  getUnconfirmedEdges,
  calculateEdgeLengths,
  getEdgeSummary,
  getMultiSectionEdgeSummary,
} from '../edge-classification';
import { createPoint, createRoofSection, generateEdges, classifyEdge } from '../geometry-engine';
import type { EdgeType, RoofSectionGeometry } from '../geometry-types';

// =========================================================
// Edge Type Metadata
// =========================================================

describe('Roof Edge: Type Metadata', () => {
  it('all edge types have labels', () => {
    const types: EdgeType[] = ['eave', 'rake', 'ridge', 'hip', 'valley', 'parapet', 'unclassified'];
    for (const t of types) {
      expect(EDGE_TYPE_LABELS[t]).toBeTruthy();
    }
  });

  it('linear edge types include ridge, hip, valley, eave, rake, parapet', () => {
    expect(LINEAR_EDGE_TYPES).toContain('ridge');
    expect(LINEAR_EDGE_TYPES).toContain('hip');
    expect(LINEAR_EDGE_TYPES).toContain('valley');
    expect(LINEAR_EDGE_TYPES).toContain('eave');
    expect(LINEAR_EDGE_TYPES).toContain('rake');
    expect(LINEAR_EDGE_TYPES).toContain('parapet');
  });

  it('unclassified is NOT in linear edge types', () => {
    expect(LINEAR_EDGE_TYPES).not.toContain('unclassified');
  });
});

// =========================================================
// Edge Correction
// =========================================================

describe('Roof Edge: Correction', () => {
  function makeSectionWithEdges(): RoofSectionGeometry {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    return section;
  }

  it('reclassifies an edge to a different type', () => {
    const section = makeSectionWithEdges();
    const edges = generateEdges(section);
    const firstEdgeId = edges[0].id;
    const corrected = reclassifyEdge(edges, firstEdgeId, 'valley');
    const correctedEdge = corrected.find(e => e.id === firstEdgeId);
    expect(correctedEdge?.type).toBe('valley');
    expect(correctedEdge?.confirmed).toBe(true);
  });

  it('does not affect other edges when reclassifying one', () => {
    const section = makeSectionWithEdges();
    const edges = generateEdges(section);
    const firstEdgeId = edges[0].id;
    const corrected = reclassifyEdge(edges, firstEdgeId, 'hip');
    const otherEdges = corrected.filter(e => e.id !== firstEdgeId);
    otherEdges.forEach(e => {
      expect(e.confirmed).toBe(false); // only the corrected one is confirmed
    });
  });

  it('confirms all edges', () => {
    const section = makeSectionWithEdges();
    const edges = generateEdges(section);
    const confirmed = confirmAllEdges(edges);
    confirmed.forEach(e => expect(e.confirmed).toBe(true));
  });

  it('gets unconfirmed edges', () => {
    const section = makeSectionWithEdges();
    let edges = generateEdges(section);
    const firstEdgeId = edges[0].id;
    edges = reclassifyEdge(edges, firstEdgeId, 'ridge');

    const unconfirmed = getUnconfirmedEdges(edges);
    expect(unconfirmed.length).toBe(3); // 4 edges, 1 confirmed
  });
});

// =========================================================
// Linear Quantity Calculation
// =========================================================

describe('Roof Edge: Linear Quantities', () => {
  it('calculates total length per edge type', () => {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const edges = generateEdges(section);
    const lengths = calculateEdgeLengths(edges);

    // Top and bottom edges are ridge and eave (100px each)
    // Left and right edges are rake (100px each)
    expect(lengths.ridge).toBeCloseTo(100, 0);
    expect(lengths.eave).toBeCloseTo(100, 0);
    expect(lengths.rake).toBeCloseTo(200, 0); // two vertical sides
  });

  it('converts to meters with scale factor', () => {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const edges = generateEdges(section);
    const lengths = calculateEdgeLengths(edges, 10); // 10 px/m
    expect(lengths.ridge).toBeCloseTo(10, 1); // 100px / 10 = 10m
    expect(lengths.eave).toBeCloseTo(10, 1);
  });

  it('returns 0 for all types with no edges', () => {
    const section = createRoofSection('Test');
    section.vertices = [];
    const edges = generateEdges(section);
    const lengths = calculateEdgeLengths(edges);
    expect(lengths.ridge).toBe(0);
    expect(lengths.eave).toBe(0);
    expect(lengths.hip).toBe(0);
  });
});

// =========================================================
// Edge Summary
// =========================================================

describe('Roof Edge: Summary', () => {
  it('generates summary for a square section', () => {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const summary = getEdgeSummary(section);
    expect(summary.hasEdges).toBe(true);
    expect(summary.lines.length).toBeGreaterThan(0);
    expect(summary.totalLengthM).toBeCloseTo(400, 0); // 4 sides × 100px
  });

  it('marks unconfirmed edges', () => {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const summary = getEdgeSummary(section);
    expect(summary.unconfirmedCount).toBeGreaterThan(0); // auto-classified, not user-confirmed
  });

  it('returns empty summary for section with no vertices', () => {
    const section = createRoofSection('Empty');
    const summary = getEdgeSummary(section);
    expect(summary.hasEdges).toBe(false);
    expect(summary.lines).toHaveLength(0);
  });

  it('includes unclassified edges in summary', () => {
    // Create a section where some edges are diagonal (unclassified)
    const section = createRoofSection('Diagonal');
    section.vertices = [
      createPoint(0, 0),
      createPoint(50, 30),   // diagonal
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const summary = getEdgeSummary(section);
    expect(summary.hasEdges).toBe(true);
  });
});

// =========================================================
// Multi-Section Edge Summary
// =========================================================

describe('Roof Edge: Multi-Section Summary', () => {
  it('aggregates edges across multiple sections', () => {
    const section1 = createRoofSection('Main');
    section1.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const section2 = createRoofSection('Porch');
    section2.vertices = [
      createPoint(0, 0),
      createPoint(50, 0),
      createPoint(50, 50),
      createPoint(0, 50),
    ];
    const summary = getMultiSectionEdgeSummary([section1, section2]);
    expect(summary.hasEdges).toBe(true);
    // Perimeter: 100×100 = 400px, 50×50 = 200px, total = 600px
    expect(summary.totalLengthM).toBeCloseTo(600, 0);
  });
});

// =========================================================
// No Hardcoded Material Quantities
// =========================================================

describe('Roof Edge: No Hardcoded Materials', () => {
  it('only calculates linear lengths, not material counts', () => {
    const section = createRoofSection('Test');
    section.vertices = [
      createPoint(0, 0),
      createPoint(100, 0),
      createPoint(100, 100),
      createPoint(0, 100),
    ];
    const summary = getEdgeSummary(section);
    // Each line should only have lengthM and edgeCount — no material quantity
    for (const line of summary.lines) {
      expect(line).toHaveProperty('lengthM');
      expect(line).toHaveProperty('edgeCount');
      expect(line).not.toHaveProperty('materialCount');
      expect(line).not.toHaveProperty('sheetCount');
    }
  });
});

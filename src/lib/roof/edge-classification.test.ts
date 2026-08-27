import { describe, it, expect } from "vitest";
import {
  EDGE_TYPE_LABELS,
  EDGE_TYPE_COLORS,
  LINEAR_EDGE_TYPES,
  reclassifyEdge,
  confirmAllEdges,
  getUnconfirmedEdges,
  calculateEdgeLengths,
} from "./edge-classification";
import type { EdgeType, RoofEdge } from "./geometry-types";

describe("roof/edge-classification", () => {
  const mockEdges: RoofEdge[] = [
    {
      id: "e1",
      sectionId: "s1",
      from: { id: "p1", x: 0, y: 0 },
      to: { id: "p2", x: 10, y: 0 },
      type: "ridge",
      confirmed: false,
    },
    {
      id: "e2",
      sectionId: "s1",
      from: { id: "p2", x: 10, y: 0 },
      to: { id: "p3", x: 10, y: 10 },
      type: "eave",
      confirmed: false,
    },
  ];

  it("EDGE_TYPE_LABELS has all edge types", () => {
    expect(EDGE_TYPE_LABELS.ridge).toContain("Ridge");
    expect(EDGE_TYPE_LABELS.eave).toContain("Eave");
    expect(EDGE_TYPE_LABELS.unclassified).toContain("Unclassified");
  });

  it("EDGE_TYPE_COLORS has all edge types", () => {
    expect(EDGE_TYPE_COLORS.ridge).toBeTruthy();
    expect(EDGE_TYPE_COLORS.eave).toBeTruthy();
  });

  it("LINEAR_EDGE_TYPES includes ridge, hip, valley, eave, rake, parapet", () => {
    expect(LINEAR_EDGE_TYPES).toContain("ridge");
    expect(LINEAR_EDGE_TYPES).toContain("hip");
    expect(LINEAR_EDGE_TYPES).toContain("valley");
    expect(LINEAR_EDGE_TYPES).toContain("eave");
  });

  it("reclassifyEdge changes type and marks confirmed", () => {
    const result = reclassifyEdge(mockEdges, "e1", "hip" as EdgeType);
    expect(result[0].type).toBe("hip");
    expect(result[0].confirmed).toBe(true);
    expect(result[1].type).toBe("eave");
  });

  it("reclassifyEdge does not mutate original", () => {
    const original = [...mockEdges];
    reclassifyEdge(mockEdges, "e1", "hip" as EdgeType);
    expect(mockEdges[0].type).toBe(original[0].type);
  });

  it("confirmAllEdges marks all as confirmed", () => {
    const result = confirmAllEdges(mockEdges);
    expect(result.every((e) => e.confirmed)).toBe(true);
  });

  it("getUnconfirmedEdges returns unconfirmed edges", () => {
    const confirmed = confirmAllEdges(mockEdges);
    const unconfirmed = getUnconfirmedEdges(mockEdges);
    expect(unconfirmed.length).toBe(2);
    expect(getUnconfirmedEdges(confirmed).length).toBe(0);
  });

  it("calculateEdgeLengths returns totals by type", () => {
    const totals = calculateEdgeLengths(mockEdges);
    expect(totals.ridge).toBe(10); // distance 0,0 to 10,0
    expect(totals.eave).toBe(10); // distance 10,0 to 10,10
  });

  it("calculateEdgeLengths with pixelsPerMeter converts to meters", () => {
    const totals = calculateEdgeLengths(mockEdges, 10);
    expect(totals.ridge).toBe(1); // 10 pixels / 10 px/m = 1m
  });
});

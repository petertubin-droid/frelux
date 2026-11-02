import { describe, it, expect } from "vitest";
import {
  calculateManhattanDistance,
  calculateMEPRouting,
  type MEPPoint,
} from "../mep-conduit-router-engine";

describe("MEP Conduit Router Engine", () => {
  it("calculates Manhattan distance correctly", () => {
    expect(calculateManhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    expect(calculateManhattanDistance({ x: 1.5, y: 2 }, { x: 4.5, y: 6 })).toBe(7);
    expect(calculateManhattanDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it("calculates routing across multiple devices with vertical drops and 10% waste", () => {
    const points: MEPPoint[] = [
      { id: "db", type: "distribution_board", x: 0.5, y: 0.5 }, // 1.5m elev -> 1.5m drop
      { id: "sw", type: "switch", x: 0.5, y: 3.0 },             // 1.2m elev -> 1.8m drop
      { id: "light", type: "light", x: 3.0, y: 3.0 },           // 3.0m elev -> 0m drop
      { id: "socket", type: "socket", x: 5.5, y: 1.0 },         // 0.3m elev -> 2.7m drop
    ];

    const result = calculateMEPRouting(points, { ceilingHeightMeters: 3.0, conduitStandardLengthMeters: 2.9 });

    expect(result.segments).toHaveLength(3);
    expect(result.totalHorizontalLengthM).toBe(9.5);
    expect(result.totalVerticalLengthM).toBe(7.8);
    // (9.5 + 7.8) * 1.10 = 17.3 * 1.10 = 19.03
    expect(result.totalConduitLengthM).toBe(19.03);
    // ceil(19.03 / 2.9) = 7
    expect(result.conduitPvcPipes20mmPieces).toBe(7);
    expect(result.lightingWireCoils1_5mm).toBe(1);
    expect(result.socketWireCoils2_5mm).toBe(1);
  });

  it("handles empty or single point gracefully", () => {
    const res = calculateMEPRouting([]);
    expect(res.segments).toHaveLength(0);
    expect(res.totalConduitLengthM).toBe(0);
    expect(res.conduitPvcPipes20mmPieces).toBe(0);

    const single = calculateMEPRouting([{ id: "p1", type: "socket", x: 1, y: 1 }]);
    expect(single.segments).toHaveLength(0);
    expect(single.totalConduitLengthM).toBe(0);
  });
});

/**
 * Conduit & Pipe Length Router Engine
 *
 * Geometric path-finding algorithms for electrical conduit and plumbing pipe routing.
 * Converts 2D/3D device points into Manhattan (taxicab) wall-routed runs
 * with vertical drop adjustments and physical installation wastage.
 *
 * Formulas:
 * - Manhattan Distance: |x1 - x2| + |y1 - y2|
 * - Height Factor: Drops from ceiling or rises from floor for switches, sockets, fixtures
 * - Pipe Route = Manhattan Distance + Drop/Rise Lengths + 10% Wastage Constant
 */

export interface MEPPoint {
  id: string;
  type: "light" | "socket" | "switch" | "distribution_board" | "water_inlet" | "tap";
  x: number; // in meters relative to room origin
  y: number; // in meters relative to room origin
  zElevationMeters?: number; // installation height from floor (e.g. switch=1.2m, socket=0.3m, light=ceiling)
  label?: string;
}

export interface MEPRoutingOptions {
  ceilingHeightMeters?: number; // default 3.0m
  conduitStandardLengthMeters?: number; // default 2.9m per PVC pipe
  wireCoilLengthMeters?: number; // default 100m per coil
  wastageMultiplier?: number; // default 1.10 (10% standard wastage)
}

export interface MEPRoutedSegment {
  fromId: string;
  toId: string;
  manhattanHorizontalM: number;
  verticalDropsM: number;
  totalLengthM: number;
}

export interface MEPRoutingResult {
  segments: MEPRoutedSegment[];
  totalHorizontalLengthM: number;
  totalVerticalLengthM: number;
  totalConduitLengthM: number; // with 10% wastage
  conduitPvcPipes20mmPieces: number;
  lightingWireCoils1_5mm: number; // 100m coils (live + neutral + earth = 2 or 3 conductors)
  socketWireCoils2_5mm: number; // 100m coils
  summary: string;
}

export const DEFAULT_DEVICE_HEIGHTS: Record<MEPPoint["type"], number> = {
  distribution_board: 1.5,
  switch: 1.2,
  socket: 0.3,
  light: 3.0, // at ceiling
  water_inlet: 0.5,
  tap: 0.6,
};

/**
 * Calculates Manhattan distance between two 2D points.
 */
export function calculateManhattanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

/**
 * Routes electrical conduit or plumbing pipe across an ordered sequence of devices / fixtures.
 */
export function calculateMEPRouting(
  points: MEPPoint[],
  options: MEPRoutingOptions = {},
): MEPRoutingResult {
  const ceilingHeight = options.ceilingHeightMeters ?? 3.0;
  const conduitStandardLength = options.conduitStandardLengthMeters ?? 2.9;
  const wireCoilLength = options.wireCoilLengthMeters ?? 100;
  const wastage = options.wastageMultiplier ?? 1.10;

  if (points.length < 2) {
    return {
      segments: [],
      totalHorizontalLengthM: 0,
      totalVerticalLengthM: 0,
      totalConduitLengthM: 0,
      conduitPvcPipes20mmPieces: 0,
      lightingWireCoils1_5mm: 0,
      socketWireCoils2_5mm: 0,
      summary: "Add at least 2 points (e.g. Distribution Board and a Socket or Light) to calculate routing.",
    };
  }

  const segments: MEPRoutedSegment[] = [];
  let sumHorizontal = 0;
  let sumVertical = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const pA = points[i];
    const pB = points[i + 1];

    const hDist = calculateManhattanDistance(pA, pB);

    const hA = pA.zElevationMeters ?? DEFAULT_DEVICE_HEIGHTS[pA.type] ?? 1.2;
    const hB = pB.zElevationMeters ?? DEFAULT_DEVICE_HEIGHTS[pB.type] ?? 1.2;

    // Cable/pipe runs up to ceiling level, across, and down to target point
    const dropA = Math.max(0, ceilingHeight - hA);
    const dropB = Math.max(0, ceilingHeight - hB);
    const vDrop = dropA + dropB;

    const segTotal = Math.round((hDist + vDrop) * 100) / 100;
    sumHorizontal += hDist;
    sumVertical += vDrop;

    segments.push({
      fromId: pA.id,
      toId: pB.id,
      manhattanHorizontalM: Math.round(hDist * 100) / 100,
      verticalDropsM: Math.round(vDrop * 100) / 100,
      totalLengthM: segTotal,
    });
  }

  const rawTotal = sumHorizontal + sumVertical;
  const totalWithWastage = Math.round(rawTotal * wastage * 100) / 100;

  const pvcPieces = Math.ceil(totalWithWastage / conduitStandardLength);

  // Electrical wire: lighting uses 1.5mm (phase + neutral + cpc = 3 runs)
  // Sockets use 2.5mm ring or radial (3 runs)
  const hasLights = points.some((p) => p.type === "light" || p.type === "switch");
  const hasSockets = points.some((p) => p.type === "socket");

  const lightingWireMeters = hasLights ? totalWithWastage * 3 : 0;
  const socketWireMeters = hasSockets ? totalWithWastage * 3 : 0;

  const lightingCoils = Math.ceil(lightingWireMeters / wireCoilLength);
  const socketCoils = Math.ceil(socketWireMeters / wireCoilLength);

  return {
    segments,
    totalHorizontalLengthM: Math.round(sumHorizontal * 100) / 100,
    totalVerticalLengthM: Math.round(sumVertical * 100) / 100,
    totalConduitLengthM: totalWithWastage,
    conduitPvcPipes20mmPieces: pvcPieces,
    lightingWireCoils1_5mm: lightingCoils,
    socketWireCoils2_5mm: socketCoils,
    summary: `Routed ${points.length} points across ${segments.length} runs. Total conduit path: ${totalWithWastage}m (with 10% wastage). Requires ${pvcPieces}x 20mm PVC pipes, ${lightingCoils}x 1.5mm wire coils, and ${socketCoils}x 2.5mm wire coils.`,
  };
}

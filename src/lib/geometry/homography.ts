// =========================================================
// Projective geometry: the 3x3 homography that flattens a photo
//
// A phone photo of a wall is a perspective projection: parallel edges
// converge, so pixel lengths are not proportional to real lengths. Mapping the
// four photographed wall corners onto a flat rectangle recovers a true
// elevation, and every window, door and roof vertex travels through the same
// matrix.
//
// This module is pure linear algebra. It knows nothing about buildings, React
// or the DOM, so the numbers it returns can be audited and unit tested.
// =========================================================

export interface Point {
  x: number;
  y: number;
}

/** Row-major 3x3 matrix: [h0 h1 h2, h3 h4 h5, h6 h7 h8]. */
export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const IDENTITY: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const EPSILON = 1e-12;

function isFinitePoint(p: Point | null | undefined): p is Point {
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

/** Gaussian elimination with partial pivoting. Returns null when singular. */
export function solveLinearSystem(
  coefficients: number[][],
  constants: number[],
): number[] | null {
  const n = constants.length;
  if (coefficients.length !== n) return null;
  if (coefficients.some((row) => row.length !== n)) return null;

  const m = coefficients.map((row, i) => [...row, constants[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(m[pivotRow][col]) < EPSILON) return null;
    if (pivotRow !== col) {
      const swap = m[pivotRow];
      m[pivotRow] = m[col];
      m[col] = swap;
    }
    for (let r = col + 1; r < n; r++) {
      const factor = m[r][col] / m[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }

  const solution = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = m[r][n];
    for (let c = r + 1; c < n; c++) sum -= m[r][c] * solution[c];
    solution[r] = sum / m[r][r];
  }
  return solution.every((value) => Number.isFinite(value)) ? solution : null;
}

/**
 * The homography taking four source points onto four destination points.
 *
 * Eight degrees of freedom, so four correspondences (eight equations) fix it
 * with h8 = 1. The points must not be collinear in either set; a degenerate
 * quadrilateral (three corners on one line) returns null rather than a matrix
 * that would silently distort every measurement.
 */
export function solveHomography(
  source: readonly Point[],
  destination: readonly Point[],
): Matrix3 | null {
  if (source.length !== 4 || destination.length !== 4) return null;
  if (!source.every(isFinitePoint) || !destination.every(isFinitePoint)) {
    return null;
  }

  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = source[i];
    const { x: u, y: v } = destination[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const solved = solveLinearSystem(a, b);
  if (!solved) return null;
  const [h0, h1, h2, h3, h4, h5, h6, h7] = solved;
  return [h0, h1, h2, h3, h4, h5, h6, h7, 1];
}

/** Determinant of a 3x3 matrix, used for invertibility and degeneracy. */
export function determinant3(m: Matrix3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

/** The inverse homography, or null when the matrix is singular. */
export function invertHomography(m: Matrix3): Matrix3 | null {
  const det = determinant3(m);
  if (!Number.isFinite(det) || Math.abs(det) < EPSILON) return null;
  const inv: Matrix3 = [
    (m[4] * m[8] - m[5] * m[7]) / det,
    (m[2] * m[7] - m[1] * m[8]) / det,
    (m[1] * m[5] - m[2] * m[4]) / det,
    (m[5] * m[6] - m[3] * m[8]) / det,
    (m[0] * m[8] - m[2] * m[6]) / det,
    (m[2] * m[3] - m[0] * m[5]) / det,
    (m[3] * m[7] - m[4] * m[6]) / det,
    (m[1] * m[6] - m[0] * m[7]) / det,
    (m[0] * m[4] - m[1] * m[3]) / det,
  ];
  return inv.every((value) => Number.isFinite(value)) ? inv : null;
}

/**
 * Send one point through the matrix. A point on the horizon (w = 0) has no
 * finite image, so it returns null instead of an infinite coordinate.
 */
export function applyHomography(m: Matrix3, p: Point): Point | null {
  if (!isFinitePoint(p)) return null;
  const w = m[6] * p.x + m[7] * p.y + m[8];
  if (!Number.isFinite(w) || Math.abs(w) < EPSILON) return null;
  const x = (m[0] * p.x + m[1] * p.y + m[2]) / w;
  const y = (m[3] * p.x + m[4] * p.y + m[5]) / w;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/** Map a whole polygon; null if any vertex cannot be projected. */
export function applyHomographyToPolygon(
  m: Matrix3,
  polygon: readonly Point[],
): Point[] | null {
  const out: Point[] = [];
  for (const point of polygon) {
    const mapped = applyHomography(m, point);
    if (!mapped) return null;
    out.push(mapped);
  }
  return out;
}

/**
 * The homography that flattens a photographed quad onto a W x H rectangle:
 * (0,0), (W,0), (W,H), (0,H). The quad must be given in that same order
 * (top-left, top-right, bottom-right, bottom-left of the wall).
 */
export function rectifyingHomography(
  quad: readonly Point[],
  widthPx: number,
  heightPx: number,
): Matrix3 | null {
  if (!(widthPx > 0) || !(heightPx > 0)) return null;
  // Normalized DLT: phone photos reach 4000+ px, where the plain
  // unnormalized solve loses precision. Same contract, better conditioning.
  return solveHomographyNormalized(quad, [
    { x: 0, y: 0 },
    { x: widthPx, y: 0 },
    { x: widthPx, y: heightPx },
    { x: 0, y: heightPx },
  ]);
}

// =========================================================
// Normalized DLT (Hartley normalization)
// =========================================================

/** Multiply two row-major 3x3 matrices. */
export function multiply3(a: Matrix3, b: Matrix3): Matrix3 {
  const out = new Array<number>(9).fill(0);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out as unknown as Matrix3;
}

/**
 * Hartley normalization: translate the centroid to the origin and scale so
 * the mean distance from it is sqrt(2). Returns the normalized points and
 * the matrix that maps original -> normalized coordinates.
 */
export function normalizePoints(points: readonly Point[]): {
  points: Point[];
  transform: Matrix3;
} | null {
  if (points.length === 0 || !points.every(isFinitePoint)) return null;
  const n = points.length;
  const cx = points.reduce((sum, p) => sum + p.x, 0) / n;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / n;
  const meanDistance =
    points.reduce((sum, p) => sum + Math.hypot(p.x - cx, p.y - cy), 0) / n;
  if (!Number.isFinite(meanDistance) || meanDistance < EPSILON) return null;
  const scale = Math.SQRT2 / meanDistance;
  const transform: Matrix3 = [
    scale, 0, -scale * cx,
    0, scale, -scale * cy,
    0, 0, 1,
  ];
  return {
    points: points.map((p) => ({
      x: (p.x - cx) * scale,
      y: (p.y - cy) * scale,
    })),
    transform,
  };
}

/**
 * Four-point homography solved in normalized coordinates and denormalized
 * back (H = T_dest^-1 * H_norm * T_src). Phone photos routinely reach
 * 4000+ px, where the unnormalized 8x8 system loses precision; this path
 * keeps the same public contract (null on refusal) with better accuracy.
 */
export function solveHomographyNormalized(
  source: readonly Point[],
  destination: readonly Point[],
): Matrix3 | null {
  if (source.length !== 4 || destination.length !== 4) return null;
  const src = normalizePoints(source);
  const dst = normalizePoints(destination);
  if (!src || !dst) return null;
  const hNorm = solveHomography(src.points, dst.points);
  if (!hNorm) return null;
  const dstInv = invertHomography(dst.transform);
  if (!dstInv) return null;
  const result = multiply3(dstInv, multiply3(hNorm, src.transform));
  if (!result.every((value) => Number.isFinite(value))) return null;
  // Reject the same degeneracies the plain solver rejects: collinear quads
  // collapse to a matrix that cannot map an interior point.
  const det = determinant3(result);
  if (!Number.isFinite(det) || Math.abs(det) < EPSILON) return null;
  return result;
}

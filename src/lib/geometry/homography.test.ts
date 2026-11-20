import { describe, it, expect } from "vitest";
import {
  IDENTITY,
  applyHomography,
  applyHomographyToPolygon,
  determinant3,
  invertHomography,
  rectifyingHomography,
  solveHomography,
  solveLinearSystem,
  type Matrix3,
  type Point,
} from "./homography";

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

/** Compare two homographies up to their arbitrary overall scale. */
function expectSameProjective(actual: Matrix3, expected: Matrix3) {
  const norm = (m: Matrix3) => {
    const pivot = m.find((value) => Math.abs(value) > 1e-12) ?? 1;
    return m.map((value) => value / pivot);
  };
  const a = norm(actual);
  const b = norm(expected);
  a.forEach((value, i) => expect(value).toBeCloseTo(b[i], 8));
}

describe("solveLinearSystem", () => {
  it("solves a system with a unique solution", () => {
    const solution = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    );
    expect(solution).not.toBeNull();
    expect(solution![0]).toBeCloseTo(1, 12);
    expect(solution![1]).toBeCloseTo(3, 12);
  });

  it("returns null for a singular system", () => {
    expect(
      solveLinearSystem(
        [
          [1, 2],
          [2, 4],
        ],
        [3, 6],
      ),
    ).toBeNull();
  });

  it("pivots rather than dividing by a zero leading entry", () => {
    const solution = solveLinearSystem(
      [
        [0, 2],
        [3, 1],
      ],
      [4, 5],
    );
    expect(solution).not.toBeNull();
    expect(solution![0]).toBeCloseTo(1, 12);
    expect(solution![1]).toBeCloseTo(2, 12);
  });
});

describe("solveHomography", () => {
  it("returns the identity for four points mapped to themselves", () => {
    const h = solveHomography(square, square);
    expect(h).not.toBeNull();
    expectSameProjective(h!, IDENTITY);
  });

  it("recovers a known perspective matrix from its own point pairs", () => {
    const truth: Matrix3 = [2, 0.5, 10, 0.3, 1.5, 20, 0.001, 0.002, 1];
    const source: Point[] = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
      { x: 0, y: 300 },
    ];
    const destination = source.map((p) => applyHomography(truth, p)!);
    const solved = solveHomography(source, destination);
    expect(solved).not.toBeNull();
    expectSameProjective(solved!, truth);
  });

  it("reproduces every source point at its destination", () => {
    const destination: Point[] = [
      { x: 3, y: 5 },
      { x: 120, y: 2 },
      { x: 118, y: 96 },
      { x: 6, y: 101 },
    ];
    const h = solveHomography(square, destination)!;
    square.forEach((point, i) => {
      const mapped = applyHomography(h, point)!;
      expect(mapped.x).toBeCloseTo(destination[i].x, 6);
      expect(mapped.y).toBeCloseTo(destination[i].y, 6);
    });
  });

  it("refuses fewer than four correspondences", () => {
    expect(solveHomography(square.slice(0, 3), square.slice(0, 3))).toBeNull();
  });

  it("refuses collinear corners instead of returning a distorted matrix", () => {
    const collinear: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    expect(solveHomography(collinear, square)).toBeNull();
  });

  it("refuses non-finite input", () => {
    const bad = [...square];
    bad[2] = { x: Number.NaN, y: 10 };
    expect(solveHomography(bad, square)).toBeNull();
  });
});

describe("rectifyingHomography", () => {
  it("flattens a photographed trapezoid onto an exact rectangle", () => {
    // A wall shot from the left: the near edge is tall, the far edge shorter.
    const quad: Point[] = [
      { x: 40, y: 30 },
      { x: 360, y: 70 },
      { x: 360, y: 250 },
      { x: 40, y: 320 },
    ];
    const h = rectifyingHomography(quad, 1000, 700)!;
    const corners = applyHomographyToPolygon(h, quad)!;
    expect(corners[0].x).toBeCloseTo(0, 6);
    expect(corners[0].y).toBeCloseTo(0, 6);
    expect(corners[1].x).toBeCloseTo(1000, 6);
    expect(corners[1].y).toBeCloseTo(0, 6);
    expect(corners[2].x).toBeCloseTo(1000, 6);
    expect(corners[2].y).toBeCloseTo(700, 6);
    expect(corners[3].x).toBeCloseTo(0, 6);
    expect(corners[3].y).toBeCloseTo(700, 6);
  });

  it("keeps a point inside the quad inside the rectangle", () => {
    const quad: Point[] = [
      { x: 40, y: 30 },
      { x: 360, y: 70 },
      { x: 360, y: 250 },
      { x: 40, y: 320 },
    ];
    const h = rectifyingHomography(quad, 1000, 700)!;
    const centre = applyHomography(h, { x: 200, y: 168 })!;
    expect(centre.x).toBeGreaterThan(0);
    expect(centre.x).toBeLessThan(1000);
    expect(centre.y).toBeGreaterThan(0);
    expect(centre.y).toBeLessThan(700);
  });

  it("refuses a zero-sized target rectangle", () => {
    expect(rectifyingHomography(square, 0, 500)).toBeNull();
    expect(rectifyingHomography(square, 500, -1)).toBeNull();
  });
});

describe("invertHomography", () => {
  it("inverts a perspective matrix so a point round-trips", () => {
    const h = solveHomography(square, [
      { x: 3, y: 5 },
      { x: 120, y: 2 },
      { x: 118, y: 96 },
      { x: 6, y: 101 },
    ])!;
    const inverse = invertHomography(h)!;
    const there = applyHomography(h, { x: 7, y: 4 })!;
    const back = applyHomography(inverse, there)!;
    expect(back.x).toBeCloseTo(7, 8);
    expect(back.y).toBeCloseTo(4, 8);
  });

  it("returns null for a singular matrix", () => {
    const singular: Matrix3 = [1, 2, 3, 2, 4, 6, 0, 0, 1];
    expect(determinant3(singular)).toBeCloseTo(0, 12);
    expect(invertHomography(singular)).toBeNull();
  });
});

describe("applyHomography", () => {
  it("returns null for a point on the horizon", () => {
    // w = x, so x = 0 is at infinity.
    const horizon: Matrix3 = [1, 0, 0, 0, 1, 0, 1, 0, 0];
    expect(applyHomography(horizon, { x: 0, y: 5 })).toBeNull();
    expect(applyHomography(horizon, { x: 2, y: 5 })).not.toBeNull();
  });

  it("maps a whole polygon, or nothing if any vertex fails", () => {
    const horizon: Matrix3 = [1, 0, 0, 0, 1, 0, 1, 0, 0];
    expect(applyHomographyToPolygon(horizon, square)).toBeNull();
    expect(applyHomographyToPolygon(IDENTITY, square)).toEqual(square);
  });
});

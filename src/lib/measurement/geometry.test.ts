import { describe, it, expect } from "vitest";
import {
  wallAreaM2,
  ceilingAreaM2,
  floorAreaM2,
  singleSurfaceAreaM2,
  fenceDimensionAreaM2,
  rectangularAreaM2,
  openingAreaM2,
  netAreaM2,
  tilesRequired,
  cartonsFromTileCount,
  cartonsFromCoverage,
  applyWasteMargin,
  roundForDisplay,
} from "@/lib/measurement/geometry";

describe("wallAreaM2", () => {
  it("calculates perimeter × height for room with both dims", () => {
    expect(wallAreaM2(4, 3, 2.5)).toBe(35);
  });
  it("falls back to 2×length×height when width omitted", () => {
    expect(wallAreaM2(4, undefined, 2.5)).toBe(20);
  });
  it("returns 0 for zero height", () => expect(wallAreaM2(4, 3, 0)).toBe(0));
  it("returns 0 for zero length", () => expect(wallAreaM2(0, 3, 2.5)).toBe(0));
  it("falls back when width is 0 or negative", () => {
    expect(wallAreaM2(4, 0, 2.5)).toBe(20);
    expect(wallAreaM2(4, -1, 2.5)).toBe(20);
  });
});

describe("ceilingAreaM2", () => {
  it("calculates length × width", () => expect(ceilingAreaM2(4, 3)).toBe(12));
  it("returns 0 without width", () =>
    expect(ceilingAreaM2(4, undefined)).toBe(0));
  it("returns 0 for zero length", () => expect(ceilingAreaM2(0, 3)).toBe(0));
  it("returns 0 for negative width", () =>
    expect(ceilingAreaM2(4, -1)).toBe(0));
});

describe("floorAreaM2", () => {
  it("same as ceiling area", () => expect(floorAreaM2(4, 3)).toBe(12));
  it("returns 0 without width", () =>
    expect(floorAreaM2(4, undefined)).toBe(0));
});

describe("singleSurfaceAreaM2", () => {
  it("calculates length × height", () =>
    expect(singleSurfaceAreaM2(5, 3)).toBe(15));
  it("returns 0 for zero length", () =>
    expect(singleSurfaceAreaM2(0, 3)).toBe(0));
  it("returns 0 for zero height", () =>
    expect(singleSurfaceAreaM2(5, 0)).toBe(0));
});

describe("fenceDimensionAreaM2", () => {
  it("calculates partition area × count", () => {
    expect(fenceDimensionAreaM2(10, 2, 5)).toBe(100);
  });
  it("uses minimum 1 partition", () => {
    expect(fenceDimensionAreaM2(10, 2, 0)).toBe(20);
  });
});

describe("rectangularAreaM2", () => {
  it("calculates length × width", () =>
    expect(rectangularAreaM2(4, 3)).toBe(12));
  it("returns 0 without width", () =>
    expect(rectangularAreaM2(4, undefined)).toBe(0));
  it("returns 0 for zero length", () =>
    expect(rectangularAreaM2(0, 3)).toBe(0));
});

describe("openingAreaM2", () => {
  it("calculates width × height × count", () => {
    expect(openingAreaM2(0.9, 2.1, 2)).toBeCloseTo(3.78, 4);
  });
  it("returns 0 for zero dimensions", () => {
    expect(openingAreaM2(0, 2, 1)).toBe(0);
    expect(openingAreaM2(1, 0, 1)).toBe(0);
  });
  it("returns 0 for zero count", () => expect(openingAreaM2(1, 1, 0)).toBe(0));
});

describe("netAreaM2", () => {
  it("subtracts opening area from gross", () => {
    expect(netAreaM2(100, 20)).toBe(80);
  });
  it("never returns negative", () => {
    expect(netAreaM2(10, 50)).toBe(0);
  });
});

describe("tilesRequired", () => {
  it("calculates area / tileArea", () => {
    expect(tilesRequired(36, 0.36)).toBe(100);
  });
  it("returns 0 for zero tile area", () => {
    expect(tilesRequired(36, 0)).toBe(0);
  });
  it("returns 0 for zero area", () => {
    expect(tilesRequired(0, 0.36)).toBe(0);
  });
});

describe("cartonsFromTileCount", () => {
  it("rounds up to whole cartons", () => {
    expect(cartonsFromTileCount(105, 10)).toBe(11);
  });
  it("exact division returns exact count", () => {
    expect(cartonsFromTileCount(100, 10)).toBe(10);
  });
  it("returns 0 for zero tilesPerCarton", () => {
    expect(cartonsFromTileCount(100, 0)).toBe(0);
  });
});

describe("cartonsFromCoverage", () => {
  it("rounds up to whole cartons", () => {
    expect(cartonsFromCoverage(36, 3.6)).toBe(10);
  });
  it("returns 0 for zero coverage", () => {
    expect(cartonsFromCoverage(36, 0)).toBe(0);
  });
});

describe("applyWasteMargin", () => {
  it("applies 10% margin", () => {
    expect(applyWasteMargin(100, 10)).toBeCloseTo(110, 5);
  });
  it("applies 0% margin unchanged", () => {
    expect(applyWasteMargin(100, 0)).toBeCloseTo(100, 5);
  });
  it("clamps negative margin to 0", () => {
    expect(applyWasteMargin(100, -10)).toBeCloseTo(100, 5);
  });
  it("clamps margin over 100 to 100", () => {
    expect(applyWasteMargin(100, 150)).toBeCloseTo(200, 5);
  });
});

describe("roundForDisplay", () => {
  it("rounds to 2 decimals", () => {
    expect(roundForDisplay(3.14159, 2)).toBe(3.14);
  });
  it("rounds to 0 decimals", () => {
    expect(roundForDisplay(3.14159, 0)).toBe(3);
  });
  it("returns 0 for NaN", () => {
    expect(roundForDisplay(NaN, 2)).toBe(0);
  });
  it("returns 0 for Infinity", () => {
    expect(roundForDisplay(Infinity, 2)).toBe(0);
  });
  it("defaults to 2 decimals", () => {
    expect(roundForDisplay(3.14159)).toBe(3.14);
  });
});

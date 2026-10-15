import { describe, expect, it } from "vitest";
import { calculatePackagedQuantity, escapeCsvCell } from "./packaging-engine";

describe("calculatePackagedQuantity", () => {
  it("rounds fractional demand up to a whole package", () => {
    expect(calculatePackagedQuantity(2.1, { packageSize: 1 })).toMatchObject({
      packageCount: 3,
      orderQuantity: 3,
      surplusQuantity: 0.8999999999999999,
    });
  });

  it("applies a minimum order quantity before package rounding", () => {
    expect(calculatePackagedQuantity(3, { packageSize: 2, minimumOrderQuantity: 5 })).toMatchObject({
      packageCount: 3,
      orderQuantity: 6,
      surplusQuantity: 3,
    });
  });

  it("returns a clear unconfigured result instead of assuming package sizes", () => {
    expect(calculatePackagedQuantity(7)).toMatchObject({
      orderQuantity: null,
      status: "package_size_required",
    });
  });

  it("rejects invalid quantities and rules", () => {
    expect(() => calculatePackagedQuantity(-1)).toThrow(RangeError);
    expect(() => calculatePackagedQuantity(1, { packageSize: 0 })).toThrow(RangeError);
    expect(() => calculatePackagedQuantity(1, { packageSize: 2, minimumOrderQuantity: -1 })).toThrow(RangeError);
  });
});

describe("escapeCsvCell", () => {
  it("escapes quotes, commas, and line breaks for RFC 4180 exports", () => {
    expect(escapeCsvCell('A "supplier", Ltd')).toBe('"A ""supplier"", Ltd"');
    expect(escapeCsvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
  });
});

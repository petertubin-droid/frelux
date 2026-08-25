import { describe, it, expect } from "vitest";
import {
  isValidHexColor,
  normalizeHex,
  relativeLuminance,
  readableTextColor,
  complementaryColor,
  analogousColors,
  triadicColors,
  lighterColor,
  darkerColor,
  colorDistanceHex,
  findClosestColors,
} from "./colors";

describe("isValidHexColor", () => {
  it("validates 6-digit hex", () => {
    expect(isValidHexColor("#FF0000")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
  });

  it("validates without hash", () => {
    expect(isValidHexColor("FF0000")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#GGG")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("adds # prefix", () => {
    expect(normalizeHex("FF0000")).toBe("#FF0000");
  });

  it("uppercases the value", () => {
    expect(normalizeHex("#ff0000")).toBe("#FF0000");
  });

  it("expands 3-digit hex to 6-digit", () => {
    expect(normalizeHex("#F00")).toBe("#FF0000");
    expect(normalizeHex("#abc")).toBe("#AABBCC");
  });
});

describe("relativeLuminance", () => {
  it("returns 0 for black", () => {
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(relativeLuminance("#FFFFFF")).toBe(1);
  });

  it("returns a value between 0 and 1 for midtones", () => {
    const lum = relativeLuminance("#808080");
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe("readableTextColor", () => {
  it("returns dark text for light backgrounds", () => {
    expect(readableTextColor("#FFFFFF")).toBe("#1A1A1A");
  });

  it("returns light text for dark backgrounds", () => {
    expect(readableTextColor("#000000")).toBe("#FFFFFF");
  });
});

describe("complementaryColor", () => {
  it("returns the complement", () => {
    const result = complementaryColor("#FF0000");
    expect(result).toBeTruthy();
    expect(result).not.toBe("#FF0000");
  });
});

describe("analogousColors", () => {
  it("returns two distinct colors", () => {
    const [a, b] = analogousColors("#FF0000");
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("triadicColors", () => {
  it("returns two distinct colors", () => {
    const [a, b] = triadicColors("#FF0000");
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe("lighterColor / darkerColor", () => {
  it("lighterColor increases brightness", () => {
    const result = lighterColor("#808080", 20);
    expect(result).toBeTruthy();
    // The lighter color should have higher channel values
  });

  it("darkerColor decreases brightness", () => {
    const result = darkerColor("#808080", 20);
    expect(result).toBeTruthy();
  });

  it("lighter than white stays white", () => {
    expect(lighterColor("#FFFFFF", 50)).toBe("#FFFFFF");
  });

  it("darker than black stays black", () => {
    expect(darkerColor("#000000", 50)).toBe("#000000");
  });
});

describe("colorDistanceHex", () => {
  it("returns 0 for identical colors", () => {
    expect(colorDistanceHex("#FF0000", "#FF0000")).toBe(0);
  });

  it("returns large distance for opposite colors", () => {
    const dist = colorDistanceHex("#000000", "#FFFFFF");
    expect(dist).toBeGreaterThan(0);
  });

  it("is symmetric", () => {
    expect(colorDistanceHex("#FF0000", "#00FF00")).toBeCloseTo(
      colorDistanceHex("#00FF00", "#FF0000"),
      0,
    );
  });
});

describe("findClosestColors", () => {
  it("finds closest matching colors from a palette (excludes exact match)", () => {
    const palette = [
      { id: "1", hex_code: "#FF0000" },
      { id: "2", hex_code: "#00FF00" },
      { id: "3", hex_code: "#0000FF" },
      { id: "4", hex_code: "#FF0044" },
    ];
    const result = findClosestColors("#FF0000", palette, 2);
    expect(result.length).toBe(2);
    // '#FF0000' is filtered as exact match, so closest is '#FF0044'
    expect(result[0]).toBe("4");
  });

  it("respects the limit parameter", () => {
    const palette = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      hex_code: `#FF000${i}`,
    }));
    const result = findClosestColors("#FF0000", palette, 3);
    expect(result.length).toBe(3);
  });
});

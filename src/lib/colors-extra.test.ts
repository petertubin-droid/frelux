import { describe, it, expect, beforeEach } from "vitest";
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
} from "./colors";

beforeEach(() => {
  // No state between tests
});

describe("isValidHexColor", () => {
  it("accepts 6-digit hex with and without #", () => {
    expect(isValidHexColor("#FF0000")).toBe(true);
    expect(isValidHexColor("FF0000")).toBe(true);
    expect(isValidHexColor("#ff0000")).toBe(true);
  });

  it("accepts 3-digit hex", () => {
    expect(isValidHexColor("#F00")).toBe(true);
    expect(isValidHexColor("F00")).toBe(true);
  });

  it("rejects invalid input", () => {
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor("#GGGGGG")).toBe(false);
    expect(isValidHexColor("#FF00")).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("normalizes a 6-digit hex to uppercase with #", () => {
    expect(normalizeHex("#ff0000")).toBe("#FF0000");
    expect(normalizeHex("ff0000")).toBe("#FF0000");
  });

  it("expands 3-digit hex to 6-digit", () => {
    expect(normalizeHex("#F00")).toBe("#FF0000");
    expect(normalizeHex("abc")).toBe("#AABBCC");
  });

  it("falls back to #CCCCCC for invalid input", () => {
    expect(normalizeHex("invalid")).toBe("#CCCCCC");
    expect(normalizeHex("")).toBe("#CCCCCC");
  });
});

describe("relativeLuminance", () => {
  it("returns a high value for white", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1.0, 1);
  });

  it("returns a low value for black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0.0, 1);
  });

  it("returns a mid-range value for a mid-tone gray", () => {
    const lum = relativeLuminance("#808080");
    expect(lum).toBeGreaterThan(0.1);
    expect(lum).toBeLessThan(0.5);
  });
});

describe("readableTextColor", () => {
  it("returns dark text for light backgrounds", () => {
    expect(readableTextColor("#FFFFFF")).toBe("#1A1A1A");
    expect(readableTextColor("#FFFF00")).toBe("#1A1A1A");
  });

  it("returns white text for dark backgrounds", () => {
    expect(readableTextColor("#000000")).toBe("#FFFFFF");
    expect(readableTextColor("#000033")).toBe("#FFFFFF");
  });
});

describe("color relationships", () => {
  it("complementaryColor rotates 180 degrees", () => {
    // Red's complement is cyan-ish
    const comp = complementaryColor("#FF0000");
    expect(comp).not.toBe("#FF0000");
    expect(isValidHexColor(comp)).toBe(true);
  });

  it("analogousColors returns two distinct colors", () => {
    const [a, b] = analogousColors("#FF0000");
    expect(a).not.toBe("#FF0000");
    expect(b).not.toBe("#FF0000");
    expect(a).not.toBe(b);
  });

  it("triadicColors returns two distinct colors", () => {
    const [a, b] = triadicColors("#FF0000");
    expect(a).not.toBe(b);
  });

  it("lighterColor brightens the color", () => {
    const lighter = lighterColor("#333333", 20);
    const origLum = relativeLuminance("#333333");
    const newLum = relativeLuminance(lighter);
    expect(newLum).toBeGreaterThan(origLum);
  });

  it("darkerColor darkens the color", () => {
    const darker = darkerColor("#CCCCCC", 20);
    const origLum = relativeLuminance("#CCCCCC");
    const newLum = relativeLuminance(darker);
    expect(newLum).toBeLessThan(origLum);
  });
});

describe("colorDistanceHex", () => {
  it("returns 0 for identical colors", () => {
    expect(colorDistanceHex("#FF0000", "#FF0000")).toBe(0);
  });

  it("returns a positive value for different colors", () => {
    expect(colorDistanceHex("#FF0000", "#00FF00")).toBeGreaterThan(0);
  });

  it("is symmetric", () => {
    const a = colorDistanceHex("#FF0000", "#00FF00");
    const b = colorDistanceHex("#00FF00", "#FF0000");
    expect(a).toBeCloseTo(b, 5);
  });

  it("max distance is between black and white", () => {
    expect(colorDistanceHex("#000000", "#FFFFFF")).toBeGreaterThan(
      colorDistanceHex("#FF0000", "#00FF00"),
    );
  });
});

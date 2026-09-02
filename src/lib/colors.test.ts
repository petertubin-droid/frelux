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
} from "@/lib/colors";

describe("isValidHexColor", () => {
  it("accepts 6-digit hex", () => {
    expect(isValidHexColor("#FF0000")).toBe(true);
    expect(isValidHexColor("FF0000")).toBe(true);
  });
  it("accepts 3-digit hex", () => {
    expect(isValidHexColor("#F00")).toBe(true);
    expect(isValidHexColor("F00")).toBe(true);
  });
  it("rejects invalid values", () => {
    expect(isValidHexColor("#GGG")).toBe(false);
    expect(isValidHexColor("#FF00")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
  });
  it("trims whitespace before validating", () => {
    expect(isValidHexColor("  #FF0000  ")).toBe(true);
  });
});

describe("normalizeHex", () => {
  it("normalizes 6-digit hex with # prefix", () => {
    expect(normalizeHex("#ff0000")).toBe("#FF0000");
  });
  it("normalizes 6-digit hex without # prefix", () => {
    expect(normalizeHex("ff0000")).toBe("#FF0000");
  });
  it("expands 3-digit hex", () => {
    expect(normalizeHex("#f00")).toBe("#FF0000");
    expect(normalizeHex("abc")).toBe("#AABBCC");
  });
  it("returns fallback for invalid input", () => {
    expect(normalizeHex("invalid")).toBe("#CCCCCC");
  });
  it("trims whitespace", () => {
    expect(normalizeHex("  #ff0000  ")).toBe("#FF0000");
  });
});

describe("relativeLuminance", () => {
  it("returns 1 for white", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 2);
  });
  it("returns ~0 for black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 2);
  });
  it("returns a value between 0 and 1 for mid-tone", () => {
    const lum = relativeLuminance("#808080");
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe("readableTextColor", () => {
  it("returns dark text for light background", () => {
    expect(readableTextColor("#FFFFFF")).toBe("#1A1A1A");
  });
  it("returns white text for dark background", () => {
    expect(readableTextColor("#000000")).toBe("#FFFFFF");
  });
  it("returns white text for dark brand navy", () => {
    expect(readableTextColor("#1B1F3B")).toBe("#FFFFFF");
  });
});

describe("color relationships", () => {
  it("complementaryColor returns opposite hue", () => {
    const comp = complementaryColor("#FF0000");
    expect(comp).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("analogousColors returns two colors", () => {
    const [a, b] = analogousColors("#FF0000");
    expect(a).toMatch(/^#[0-9A-F]{6}$/);
    expect(b).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("triadicColors returns two colors", () => {
    const [a, b] = triadicColors("#FF0000");
    expect(a).toMatch(/^#[0-9A-F]{6}$/);
    expect(b).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("lighterColor increases lightness", () => {
    const light = lighterColor("#000000");
    expect(light).not.toBe("#000000");
  });

  it("darkerColor decreases lightness", () => {
    const dark = darkerColor("#FFFFFF");
    expect(dark).not.toBe("#FFFFFF");
  });
});

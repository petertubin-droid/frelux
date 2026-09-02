import { describe, it, expect } from "vitest";
import {
  isValidHexColor,
  normalizeHex,
  relativeLuminance,
  readableTextColor,
} from "@/lib/colors";

describe("isValidHexColor", () => {
  it("validates 6-digit hex", () => {
    expect(isValidHexColor("#FF0000")).toBe(true);
    expect(isValidHexColor("FF0000")).toBe(true);
  });

  it("validates 3-digit hex", () => {
    expect(isValidHexColor("#F00")).toBe(true);
    expect(isValidHexColor("F00")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isValidHexColor("#GGG")).toBe(false);
    expect(isValidHexColor("not-a-color")).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("normalizes 6-digit hex with #", () => {
    expect(normalizeHex("#ff0000")).toBe("#FF0000");
  });

  it("normalizes 6-digit hex without #", () => {
    expect(normalizeHex("ff0000")).toBe("#FF0000");
  });

  it("expands 3-digit hex", () => {
    expect(normalizeHex("#f00")).toBe("#FF0000");
    expect(normalizeHex("abc")).toBe("#AABBCC");
  });

  it("returns fallback for invalid", () => {
    expect(normalizeHex("invalid")).toBe("#CCCCCC");
  });
});

describe("relativeLuminance", () => {
  it("returns 1 for white", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 2);
  });

  it("returns 0 for black", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 2);
  });

  it("returns mid-range for gray", () => {
    const lum = relativeLuminance("#808080");
    expect(lum).toBeGreaterThan(0.1);
    expect(lum).toBeLessThan(0.5);
  });
});

describe("readableTextColor", () => {
  it("returns dark text for light background", () => {
    expect(readableTextColor("#FFFFFF")).toBe("#1A1A1A");
  });

  it("returns light text for dark background", () => {
    expect(readableTextColor("#000000")).toBe("#FFFFFF");
  });
});

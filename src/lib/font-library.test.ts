import { describe, it, expect } from "vitest";
import {
  FONT_LIBRARY,
  FONT_CATEGORIES,
  DEFAULT_TYPOGRAPHY,
  getFont,
  fontStack,
} from "@/lib/font-library";

describe("font-library — FONT_LIBRARY", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(FONT_LIBRARY)).toBe(true);
    expect(FONT_LIBRARY.length).toBeGreaterThan(0);
  });

  it("each font has family, name, and category", () => {
    for (const font of FONT_LIBRARY) {
      expect(font.family).toBeTruthy();
      expect(font.name).toBeTruthy();
      expect(font.category).toBeTruthy();
    }
  });

  it("has unique family names", () => {
    const families = FONT_LIBRARY.map((f) => f.family);
    const unique = new Set(families);
    expect(unique.size).toBe(families.length);
  });
});

describe("font-library — FONT_CATEGORIES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(FONT_CATEGORIES)).toBe(true);
    expect(FONT_CATEGORIES.length).toBeGreaterThan(0);
  });
});

describe("font-library — DEFAULT_TYPOGRAPHY", () => {
  it("is a defined object", () => {
    expect(DEFAULT_TYPOGRAPHY).toBeDefined();
    expect(typeof DEFAULT_TYPOGRAPHY).toBe("object");
  });
});

describe("font-library — getFont", () => {
  it("returns font for existing family", () => {
    const firstFont = FONT_LIBRARY[0];
    const result = getFont(firstFont.family);
    expect(result).toBeDefined();
    expect(result?.family).toBe(firstFont.family);
  });

  it("returns undefined for non-existent family", () => {
    expect(getFont("NonExistentFontXYZ")).toBeUndefined();
  });
});

describe("font-library — fontStack", () => {
  it("returns a CSS font stack string for known font", () => {
    const firstFont = FONT_LIBRARY[0];
    const stack = fontStack(firstFont.family);
    expect(typeof stack).toBe("string");
    expect(stack.length).toBeGreaterThan(0);
  });

  it("returns a fallback for unknown font", () => {
    const stack = fontStack("NonExistentFontXYZ");
    expect(typeof stack).toBe("string");
    expect(stack.length).toBeGreaterThan(0);
  });
});

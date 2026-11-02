import { describe, it, expect } from "vitest";
import { getIcon, ICON_MAP } from "./icon-map";
import { BookOpen, Palette, Calculator } from "lucide-react";

describe("icon-map", () => {
  it("returns mapped Lucide icon when name exists", () => {
    expect(getIcon("Palette")).toBe(Palette);
    expect(getIcon("Calculator")).toBe(Calculator);
  });

  it("falls back to BookOpen when name is null, undefined, or unmapped", () => {
    expect(getIcon(null)).toBe(BookOpen);
    expect(getIcon(undefined)).toBe(BookOpen);
    expect(getIcon("")).toBe(BookOpen);
    expect(getIcon("NonExistentIcon")).toBe(BookOpen);
  });

  it("exports ICON_MAP containing registered icons", () => {
    expect(ICON_MAP.BookOpen).toBe(BookOpen);
    expect(Object.keys(ICON_MAP).length).toBeGreaterThan(10);
  });
});

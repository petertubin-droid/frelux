import { describe, it, expect } from "vitest";
import { findClosestColors } from "./color-matcher";
import type { DbPaintColor } from "@/types/database";

function makeColor(
  id: string,
  name: string,
  r: number,
  g: number,
  b: number,
): DbPaintColor {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    hex_code:
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase(),
    rgb_r: r,
    rgb_g: g,
    rgb_b: b,
    hsl_h: 0,
    hsl_s: 0,
    hsl_l: 0,
    color_family_id: null,
    category_id: null,
    recommended_usage: [],
    finish_compatibility: [],
    is_interior: true,
    is_exterior: false,
    popularity_score: 0,
    is_featured: false,
    is_trending: false,
    display_order: 0,
    is_active: true,
    image_url: null,
    created_at: "",
    updated_at: "",
  };
}

describe("findClosestColors", () => {
  const sampleColors: DbPaintColor[] = [
    makeColor("1", "Red", 255, 0, 0),
    makeColor("2", "Green", 0, 255, 0),
    makeColor("3", "Blue", 0, 0, 255),
    makeColor("4", "Dark Red", 139, 0, 0),
    makeColor("5", "Orange", 255, 165, 0),
  ];

  it("returns results sorted by similarity (closest first)", () => {
    const results = findClosestColors({ r: 255, g: 0, b: 0 }, sampleColors, 3);
    expect(results.length).toBe(3);
    expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
    expect(results[1].distance).toBeLessThanOrEqual(results[2].distance);
  });

  it("exact match has highest similarity", () => {
    const results = findClosestColors({ r: 255, g: 0, b: 0 }, sampleColors, 5);
    expect(results[0].color.name).toBe("Red");
    expect(results[0].similarity).toBe(100);
  });

  it("respects maxResults", () => {
    const results = findClosestColors(
      { r: 128, g: 128, b: 128 },
      sampleColors,
      2,
    );
    expect(results.length).toBe(2);
  });

  it("returns empty array for empty color list", () => {
    const results = findClosestColors({ r: 128, g: 128, b: 128 }, [], 5);
    expect(results.length).toBe(0);
  });

  it("similarity is between 0 and 100", () => {
    const results = findClosestColors(
      { r: 128, g: 128, b: 128 },
      sampleColors,
      5,
    );
    results.forEach((r) => {
      expect(r.similarity).toBeGreaterThanOrEqual(0);
      expect(r.similarity).toBeLessThanOrEqual(100);
    });
  });
});

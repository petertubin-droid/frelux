import { describe, expect, it } from "vitest";
import { RESEARCHED_TYPOLOGIES } from "../researched-typologies";
import { WALL_FINISHING_LIBRARY_MARKETS, getWallFinishingCandidates } from "../knowledge-library";

describe("researched wall-finishing typology registry", () => {
  it("covers all 32 selector markets with at least one researched candidate", () => {
    const covered = new Set(RESEARCHED_TYPOLOGIES.map((t) => t.marketCode));
    for (const mk of WALL_FINISHING_LIBRARY_MARKETS) {
      expect(covered, `market ${mk.code} has no researched candidates`).toContain(mk.code);
    }
    expect(covered).toEqual(new Set(WALL_FINISHING_LIBRARY_MARKETS.map((m) => m.code)));
  });

  it("has no duplicate titles within a market and no collisions with the verified catalog", () => {
    const seen = new Set<string>();
    const catalog = new Set(getWallFinishingCandidates().map((c) => `${c.marketCode}::${c.title.toLowerCase()}`));
    for (const t of RESEARCHED_TYPOLOGIES) {
      const key = `${t.marketCode}::${t.title.toLowerCase()}`;
      expect(seen, `duplicate researched title: ${key}`).not.toContain(key);
      expect(catalog, `researched title already in verified catalog: ${key}`).not.toContain(key);
      seen.add(key);
    }
  });

  it("uses only valid topic types and categories", () => {
    const types = new Set(["wall_system", "finish_assembly"]);
    const cats = new Set(["ceiling", "board_system", "cladding", "leveling", "paint", "exterior", "decorative", "wet_area", "repair_prep", "traditional", "wallpaper"]);
    for (const t of RESEARCHED_TYPOLOGIES) {
      expect(types).toContain(t.topicType);
      expect(cats).toContain(t.category);
      expect(t.title.length).toBeGreaterThan(5);
    }
  });

  it("documents the expanded library size (research pass 2026-10-17)", () => {
    expect(RESEARCHED_TYPOLOGIES).toHaveLength(195);
    const existingTitles = getWallFinishingCandidates().length;
    expect(existingTitles).toBe(140);
    // Expanded registry target: (140 verified + 195 researched candidates) x 5
    expect((existingTitles + RESEARCHED_TYPOLOGIES.length) * 5).toBe(1675);
  });
});

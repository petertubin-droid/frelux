import { describe, it, expect, beforeEach } from "vitest";
import {
  ACHIEVEMENTS,
  trackCalculation,
  trackColorView,
  trackColorFavorite,
  trackProjectSave,
  trackShare,
  trackVisit,
  getAchievements,
  getNewlyUnlocked,
} from "@/lib/achievements";

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

describe("achievements — ACHIEVEMENTS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(ACHIEVEMENTS)).toBe(true);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it("each achievement has id, title, description, icon, threshold, and category", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(a.threshold).toBeGreaterThan(0);
      expect(a.category).toBeTruthy();
    }
  });

  it("has unique IDs", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("achievements — trackCalculation", () => {
  it("returns an array (may be empty)", () => {
    const result = trackCalculation("paint");
    expect(Array.isArray(result)).toBe(true);
  });

  it("unlocks first_calc on first calculation", () => {
    const unlocked = trackCalculation("paint");
    expect(unlocked.length).toBeGreaterThan(0);
    expect(unlocked[0].id).toBe("first_calc");
  });

  it("does not re-unlock the same achievement", () => {
    trackCalculation("paint"); // unlock first_calc
    const unlocked = trackCalculation("paint"); // second call
    expect(unlocked.length).toBe(0);
  });
});

describe("achievements — trackColorView", () => {
  it("returns an array", () => {
    expect(Array.isArray(trackColorView())).toBe(true);
  });
});

describe("achievements — trackColorFavorite", () => {
  it("returns an array", () => {
    expect(Array.isArray(trackColorFavorite())).toBe(true);
  });
});

describe("achievements — trackProjectSave", () => {
  it("returns an array", () => {
    expect(Array.isArray(trackProjectSave())).toBe(true);
  });
});

describe("achievements — trackShare", () => {
  it("returns an array", () => {
    expect(Array.isArray(trackShare())).toBe(true);
  });
});

describe("achievements — trackVisit", () => {
  it("returns an array", () => {
    expect(Array.isArray(trackVisit())).toBe(true);
  });
});

describe("achievements — getAchievements", () => {
  it("returns object with unlocked and stats", () => {
    const result = getAchievements();
    expect(result).toHaveProperty("unlocked");
    expect(result).toHaveProperty("stats");
    expect(Array.isArray(result.unlocked)).toBe(true);
    expect(typeof result.stats).toBe("object");
  });

  it("stats have expected fields", () => {
    const result = getAchievements();
    expect(result.stats).toHaveProperty("totalCalculations");
    expect(result.stats).toHaveProperty("paintCalcs");
    expect(result.stats).toHaveProperty("colorsViewed");
  });
});

describe("achievements — getNewlyUnlocked", () => {
  it("returns an array", () => {
    expect(Array.isArray(getNewlyUnlocked())).toBe(true);
  });

  it("returns empty after check (already consumed)", () => {
    trackCalculation("paint");
    getNewlyUnlocked(); // consume
    const second = getNewlyUnlocked();
    expect(second.length).toBe(0);
  });
});

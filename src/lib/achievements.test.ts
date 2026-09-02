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
  type UsageStats,
} from "@/lib/achievements";

describe("achievements", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exports achievement definitions", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
    expect(ACHIEVEMENTS[0]).toHaveProperty("id");
    expect(ACHIEVEMENTS[0]).toHaveProperty("title");
    expect(ACHIEVEMENTS[0]).toHaveProperty("threshold");
  });

  it("all achievements have unique ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("trackCalculation increments totalCalculations and type counter", () => {
    trackCalculation("paint");
    const { stats } = getAchievements();
    expect(stats.totalCalculations).toBe(1);
    expect(stats.paintCalcs).toBe(1);
  });

  it("trackCalculation unlocks first_calc on first calc", () => {
    const unlocked = trackCalculation("paint");
    expect(unlocked.some((a) => a.id === "first_calc")).toBe(true);
  });

  it("trackCalculation unlocks calc_5 at 5 calcs", () => {
    let unlocked: typeof ACHIEVEMENTS = [];
    for (let i = 0; i < 5; i++) unlocked = trackCalculation("paint");
    expect(unlocked.some((a) => a.id === "calc_5")).toBe(true);
  });

  it("trackColorView increments colorsViewed", () => {
    trackColorView();
    const { stats } = getAchievements();
    expect(stats.colorsViewed).toBe(1);
  });

  it("trackColorFavorite increments colorsFavorited", () => {
    trackColorFavorite();
    const { stats } = getAchievements();
    expect(stats.colorsFavorited).toBe(1);
  });

  it("trackProjectSave increments projectsSaved", () => {
    trackProjectSave();
    const { stats } = getAchievements();
    expect(stats.projectsSaved).toBe(1);
  });

  it("trackProjectSave unlocks project_saver at 3 saves", () => {
    let unlocked: typeof ACHIEVEMENTS = [];
    for (let i = 0; i < 3; i++) unlocked = trackProjectSave();
    expect(unlocked.some((a) => a.id === "project_saver")).toBe(true);
  });

  it("trackShare increments projectsShared", () => {
    trackShare();
    const { stats } = getAchievements();
    expect(stats.projectsShared).toBe(1);
  });

  it("trackVisit increments totalVisits", () => {
    trackVisit();
    const { stats } = getAchievements();
    expect(stats.totalVisits).toBeGreaterThanOrEqual(1);
  });

  it("getAchievements returns unlocked and stats", () => {
    trackCalculation("paint");
    const result = getAchievements();
    expect(result.unlocked).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.unlocked.length).toBeGreaterThan(0);
  });

  it("getNewlyUnlocked returns empty after clearing", () => {
    localStorage.clear();
    expect(getNewlyUnlocked()).toEqual([]);
  });

  it("trackCalculation with ai type increments aiAssistants", () => {
    trackCalculation("ai");
    const { stats } = getAchievements();
    expect(stats.aiAssistants).toBe(1);
  });

  it("trackCalculation with ai unlocks ai_pioneer", () => {
    const unlocked = trackCalculation("ai");
    expect(unlocked.some((a) => a.id === "ai_pioneer")).toBe(true);
  });

  it("does not double-unlock achievements already earned", () => {
    trackCalculation("paint");
    const unlocked = trackCalculation("paint");
    expect(unlocked.some((a) => a.id === "first_calc")).toBe(false);
  });
});

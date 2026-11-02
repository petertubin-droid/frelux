import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AchievementBadges } from "@/components/ui/AchievementBadges";

vi.mock("@/lib/achievements", () => ({
  ACHIEVEMENTS: [
    { id: "first-calc", name: "First Calculation", description: "Run your first calculation", icon: "🧮" },
    { id: "ten-calc", name: "Ten Calculations", description: "Run 10 calculations", icon: "🏆" },
  ],
  getAchievements: vi.fn(() => ({
    unlocked: [
      { id: "first-calc", name: "First Calculation", description: "Run your first calculation", icon: "🧮", unlockedAt: "2026-09-01" },
    ],
    stats: {
      totalCalculations: 5,
      totalSaves: 2,
      totalShares: 1,
      streakDays: 3,
    },
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AchievementBadges", () => {
  it("renders in compact mode with count", () => {
    render(<AchievementBadges compact />);
    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("renders full mode with title", () => {
    render(<AchievementBadges />);
    expect(screen.getByText("Achievements")).toBeTruthy();
  });

  it("shows unlocked count badge", () => {
    render(<AchievementBadges />);
    expect(screen.getByText(/1\/2 unlocked/i)).toBeTruthy();
  });

  it("shows stats in full mode", () => {
    render(<AchievementBadges />);
    expect(screen.getByText("Calculations")).toBeTruthy();
  });
});

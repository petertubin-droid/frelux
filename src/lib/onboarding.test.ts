import { describe, it, expect, beforeEach } from "vitest";
import {
  isOnboardingComplete,
  completeOnboarding,
  resetOnboarding,
  TOUR_STEPS,
} from "@/lib/onboarding";

beforeEach(() => {
  localStorage.clear();
});

describe("onboarding", () => {
  it("returns false when not completed", () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it("returns true after completeOnboarding", () => {
    completeOnboarding();
    expect(isOnboardingComplete()).toBe(true);
  });

  it("returns false after resetOnboarding", () => {
    completeOnboarding();
    resetOnboarding();
    expect(isOnboardingComplete()).toBe(false);
  });

  it("TOUR_STEPS is a non-empty array", () => {
    expect(Array.isArray(TOUR_STEPS)).toBe(true);
    expect(TOUR_STEPS.length).toBeGreaterThan(0);
  });

  it("each tour step has required fields", () => {
    for (const step of TOUR_STEPS) {
      expect(step.target).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
    }
  });
});

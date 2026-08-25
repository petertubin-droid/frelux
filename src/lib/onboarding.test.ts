import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isOnboardingComplete,
  completeOnboarding,
  resetOnboarding,
  TOUR_STEPS,
} from "./onboarding";

beforeEach(() => {
  localStorage.clear();
});

describe("isOnboardingComplete", () => {
  it("returns false when no flag is stored", () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it("returns true after completeOnboarding is called", () => {
    completeOnboarding();
    expect(isOnboardingComplete()).toBe(true);
  });

  it("returns false after resetOnboarding", () => {
    completeOnboarding();
    resetOnboarding();
    expect(isOnboardingComplete()).toBe(false);
  });

  it("does not throw when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    expect(isOnboardingComplete()).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("TOUR_STEPS", () => {
  it("defines at least 4 tour steps with content", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const step of TOUR_STEPS) {
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.target).toBeTruthy();
      expect(step.icon).toBeTruthy();
    }
  });

  it("has a CTA on at least the first and last steps", () => {
    expect(TOUR_STEPS[0].cta).toBeTruthy();
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].cta).toBeTruthy();
  });
});

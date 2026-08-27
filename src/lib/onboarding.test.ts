import { describe, it, expect, beforeEach } from "vitest";
import {
  isOnboardingComplete,
  completeOnboarding,
  resetOnboarding,
  TOUR_STEPS,
} from "./onboarding";

describe("onboarding", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isOnboardingComplete returns false when not set", () => {
    expect(isOnboardingComplete()).toBe(false);
  });

  it("completeOnboarding sets flag", () => {
    completeOnboarding();
    expect(isOnboardingComplete()).toBe(true);
  });

  it("resetOnboarding clears flag", () => {
    completeOnboarding();
    expect(isOnboardingComplete()).toBe(true);
    resetOnboarding();
    expect(isOnboardingComplete()).toBe(false);
  });

  it("TOUR_STEPS has 6 steps", () => {
    expect(TOUR_STEPS.length).toBe(6);
  });

  it("TOUR_STEPS each step has required fields", () => {
    for (const step of TOUR_STEPS) {
      expect(step.target).toBeTruthy();
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.icon).toBeTruthy();
    }
  });

  it("TOUR_STEPS first step is welcome", () => {
    expect(TOUR_STEPS[0].title).toContain("Welcome");
  });

  it("TOUR_STEPS last step is quick access", () => {
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].title).toContain("Quick Access");
  });
});

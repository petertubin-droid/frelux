import { describe, it, expect } from "vitest";
import {
  VERIFICATION_STATE_LABELS,
  VERIFICATION_STATE_DESCRIPTIONS,
  VERIFICATION_STATE_COLORS,
  VERIFICATION_STATE_VERIFIED,
  VERIFICATION_STATE_REQUIRES_ACTION,
  canTransition,
  transitionVerificationState,
  buildVerificationBadge,
  AI_CONFIDENCE_LABELS,
  type VerificationState,
} from "./verification-states";

describe("measurement/verification-states", () => {
  it("VERIFICATION_STATE_LABELS has all states", () => {
    expect(
      Object.keys(VERIFICATION_STATE_LABELS).length,
    ).toBeGreaterThanOrEqual(5);
    expect(typeof Object.values(VERIFICATION_STATE_LABELS)[0]).toBe("string");
  });

  it("VERIFICATION_STATE_DESCRIPTIONS has all states", () => {
    expect(
      Object.keys(VERIFICATION_STATE_DESCRIPTIONS).length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("VERIFICATION_STATE_COLORS has all states", () => {
    expect(
      Object.keys(VERIFICATION_STATE_COLORS).length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("VERIFICATION_STATE_VERIFIED is boolean map", () => {
    for (const v of Object.values(VERIFICATION_STATE_VERIFIED)) {
      expect(typeof v).toBe("boolean");
    }
  });

  it("VERIFICATION_STATE_REQUIRES_ACTION is boolean map", () => {
    for (const v of Object.values(VERIFICATION_STATE_REQUIRES_ACTION)) {
      expect(typeof v).toBe("boolean");
    }
  });

  it("AI_CONFIDENCE_LABELS has all confidence levels", () => {
    expect(Object.keys(AI_CONFIDENCE_LABELS).length).toBeGreaterThanOrEqual(4);
    expect(AI_CONFIDENCE_LABELS.high).toBeTruthy();
    expect(AI_CONFIDENCE_LABELS.low).toBeTruthy();
  });

  it("canTransition returns boolean", () => {
    const states = Object.keys(
      VERIFICATION_STATE_LABELS,
    ) as VerificationState[];
    // At least some transitions should be valid
    let hasValidTransition = false;
    for (const from of states) {
      for (const to of states) {
        if (canTransition(from, to)) hasValidTransition = true;
      }
    }
    expect(hasValidTransition).toBe(true);
  });

  it("transitionVerificationState returns target if valid, original if invalid", () => {
    const states = Object.keys(
      VERIFICATION_STATE_LABELS,
    ) as VerificationState[];
    let testedValid = false;
    let _testedInvalid = false;
    for (const from of states) {
      for (const to of states) {
        const result = transitionVerificationState(from, to);
        if (canTransition(from, to)) {
          expect(result).toBe(to);
          testedValid = true;
        } else {
          expect(result).toBe(from);
          _testedInvalid = true;
        }
      }
    }
    expect(testedValid).toBe(true);
  });

  it("buildVerificationBadge creates badge with all fields", () => {
    const states = Object.keys(
      VERIFICATION_STATE_LABELS,
    ) as VerificationState[];
    const state = states[0];
    const badge = buildVerificationBadge(state);
    expect(badge.state).toBe(state);
    expect(badge.label).toBe(VERIFICATION_STATE_LABELS[state]);
    expect(badge.description).toBe(VERIFICATION_STATE_DESCRIPTIONS[state]);
    expect(badge.color).toBe(VERIFICATION_STATE_COLORS[state]);
    expect(typeof badge.isVerified).toBe("boolean");
    expect(typeof badge.requiresAction).toBe("boolean");
    expect(badge.icon).toBeTruthy();
  });
});

// =========================================================
// PREDICTIVE INTELLIGENCE, FRESHNESS + CONFIDENCE TESTS (§17)
//
// Data age can never look equivalent to current data. Every
// threshold (30d fresh / 90d stale) and the confidence formula
// (coverage×0.5 + freshness×0.3 + verified×0.2) is pinned by
// hand-calculated values, including the exact band boundaries.
// =========================================================
import { describe, it, expect } from "vitest";
import {
  FRESH_MAX_AGE_DAYS,
  STALE_MAX_AGE_DAYS,
  daysBetween,
  classifyFreshness,
  worstFreshness,
  assessConfidence,
  verifiedShareOf,
} from "./freshness";

const NOW = "2026-09-18T12:00:00.000Z";
const D = (days: number) =>
  new Date(new Date(NOW).getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe("freshness", () => {
  it("thresholds are the documented 30/90 days", () => {
    expect(FRESH_MAX_AGE_DAYS).toBe(30);
    expect(STALE_MAX_AGE_DAYS).toBe(90);
  });

  it("daysBetween: fractional, never negative, Infinity on invalid input", () => {
    expect(daysBetween(D(10), NOW)).toBeCloseTo(10, 6);
    expect(daysBetween(NOW, D(10))).toBe(0); // clamped
    expect(daysBetween("not-a-date", NOW)).toBe(Number.POSITIVE_INFINITY);
  });

  it("classifyFreshness boundaries: 30d current, 31-90 stale, 91+ outdated", () => {
    expect(classifyFreshness(null, NOW)).toBe("unavailable");
    expect(classifyFreshness(D(30), NOW)).toBe("current");
    expect(classifyFreshness(D(31), NOW)).toBe("stale");
    expect(classifyFreshness(D(90), NOW)).toBe("stale");
    expect(classifyFreshness(D(91), NOW)).toBe("outdated");
  });

  it("worstFreshness picks the most conservative across records", () => {
    expect(worstFreshness([], NOW)).toBe("unavailable");
    expect(worstFreshness([D(1), D(200), null], NOW)).toBe("unavailable");
    expect(worstFreshness([D(1), D(40)], NOW)).toBe("stale");
    expect(worstFreshness([D(1), D(2), D(3)], NOW)).toBe("current");
  });

  it("assessConfidence: hand-calculated public formula", () => {
    // coverage .8 → .40; current → .30; verified .5 → .10 → score 0.80
    let c = assessConfidence({
      coverage: 0.8,
      freshness: "current",
      verifiedShare: 0.5,
      context: "test",
    });
    expect(c.score).toBe(0.8);
    expect(c.band).toBe("high");
    expect(c.method).toContain("coverage 80% ×0.5");

    // stale freshness: .40 + .18 + .10 = 0.68 → medium
    c = assessConfidence({
      coverage: 0.8,
      freshness: "stale",
      verifiedShare: 0.5,
      context: "test",
    });
    expect(c.score).toBe(0.68);
    expect(c.band).toBe("medium");

    // outdated: .40 + .06 + .10 = 0.56 → medium
    c = assessConfidence({
      coverage: 0.8,
      freshness: "outdated",
      verifiedShare: 0.5,
      context: "test",
    });
    expect(c.score).toBe(0.56);
    expect(c.band).toBe("medium");

    // unavailable: .40 + 0 + .10 = 0.50 → medium (boundary inclusive)
    c = assessConfidence({
      coverage: 0.8,
      freshness: "unavailable",
      verifiedShare: 0.5,
      context: "test",
    });
    expect(c.score).toBe(0.5);
    expect(c.band).toBe("medium");

    // 0.75 is the high boundary
    c = assessConfidence({
      coverage: 0.9,
      freshness: "current",
      verifiedShare: 0,
      context: "test",
    });
    expect(c.score).toBe(0.75);
    expect(c.band).toBe("high");
  });

  it("assessConfidence clamps out-of-range coverage and verification", () => {
    const c = assessConfidence({
      coverage: 7,
      freshness: "current",
      verifiedShare: -3,
      context: "test",
    });
    expect(c.score).toBe(0.8); // clamped 1×0.5 + 0.3 + 0×0.2
  });

  it("verifiedShareOf counts only verified evidence kinds", () => {
    expect(verifiedShareOf([])).toBe(0);
    const ev = [
      { verification: "user_recorded" },
      { verification: "user_confirmed" },
      { verification: "system_verified" },
      { verification: "admin_verified" },
      { verification: "unverified" },
    ];
    expect(verifiedShareOf(ev)).toBeCloseTo(4 / 5, 10);
  });
});

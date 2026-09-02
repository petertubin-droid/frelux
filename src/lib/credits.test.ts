import { describe, it, expect } from "vitest";
import {
  REWARD_EVENTS,
  generateReferenceId,
  getDailyRefId,
  AI_CREDIT_COST,
  CREDITS_PER_AD,
  MAX_ADS_PER_DAY,
} from "@/lib/credits";

describe("REWARD_EVENTS", () => {
  it("has first_calc event", () => {
    expect(REWARD_EVENTS.first_calc.amount).toBe(2);
    expect(REWARD_EVENTS.first_calc.reason).toContain("first calculator");
  });

  it("has three_different_calcs event", () => {
    expect(REWARD_EVENTS.three_different_calcs.amount).toBe(5);
  });

  it("has save_estimate event", () => {
    expect(REWARD_EVENTS.save_estimate.amount).toBe(3);
  });

  it("has return_3_days event", () => {
    expect(REWARD_EVENTS.return_3_days.amount).toBe(5);
  });

  it("has streak_7_day event", () => {
    expect(REWARD_EVENTS.streak_7_day.amount).toBe(15);
  });

  it("has build_to_roof event", () => {
    expect(REWARD_EVENTS.build_to_roof.amount).toBe(10);
  });

  it("has ai_photo_estimator event", () => {
    expect(REWARD_EVENTS.ai_photo_estimator.amount).toBe(5);
  });

  it("has five_estimates event", () => {
    expect(REWARD_EVENTS.five_estimates.amount).toBe(15);
  });

  it("has referral event with highest reward", () => {
    expect(REWARD_EVENTS.referral.amount).toBe(25);
  });

  it("has achievement events", () => {
    expect(REWARD_EVENTS.ach_builder_10.amount).toBe(25);
    expect(REWARD_EVENTS.ach_estimator_25.amount).toBe(50);
    expect(REWARD_EVENTS.ach_master_5.amount).toBe(100);
  });

  it("every event has eventType, amount, and reason", () => {
    Object.entries(REWARD_EVENTS).forEach(([, e]) => {
      expect(e.eventType).toBeTruthy();
      expect(e.amount).toBeGreaterThan(0);
      expect(e.reason).toBeTruthy();
    });
  });
});

describe("generateReferenceId", () => {
  it("generates id with prefix", () => {
    const ref = generateReferenceId("calc");
    expect(ref.startsWith("calc_")).toBe(true);
  });

  it("generates unique ids", () => {
    const a = generateReferenceId("test");
    const b = generateReferenceId("test");
    expect(a).not.toBe(b);
  });
});

describe("getDailyRefId", () => {
  it("generates date-based ref id", () => {
    const date = new Date("2026-09-02T10:00:00Z");
    const ref = getDailyRefId("daily", date);
    expect(ref).toBe("daily_2026-09-02");
  });

  it("uses current date by default", () => {
    const ref = getDailyRefId("ret");
    expect(ref.startsWith("ret_")).toBe(true);
    expect(ref.length).toBe("ret_YYYY-MM-DD".length);
  });

  it("is deterministic for same date", () => {
    const date = new Date("2026-09-02T15:00:00Z");
    expect(getDailyRefId("x", date)).toBe(getDailyRefId("x", date));
  });
});

describe("AI credit constants", () => {
  it("AI_CREDIT_COST = 10", () => expect(AI_CREDIT_COST).toBe(10));
  it("CREDITS_PER_AD = 5", () => expect(CREDITS_PER_AD).toBe(5));
  it("MAX_ADS_PER_DAY = 5", () => expect(MAX_ADS_PER_DAY).toBe(5));
});

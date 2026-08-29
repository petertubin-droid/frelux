import { describe, it, expect } from "vitest";
import {
  generateReferenceId,
  getDailyRefId,
  AI_CREDIT_COST,
  CREDITS_PER_AD,
  MAX_ADS_PER_DAY,
  REWARD_EVENTS,
} from "@/lib/credits";

describe("credits — generateReferenceId", () => {
  it("generates a reference with the given prefix", () => {
    const ref = generateReferenceId("tx");
    expect(ref.startsWith("tx_")).toBe(true);
  });

  it("includes a timestamp and random component", () => {
    const ref = generateReferenceId("rw");
    const parts = ref.split("_");
    expect(parts[0]).toBe("rw");
    expect(parts.length).toBe(3);
    // Timestamp should be a number
    expect(Number.isNaN(Number(parts[1]))).toBe(false);
    // Random part should be a non-empty string
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("generates unique IDs on rapid successive calls", () => {
    const refs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      refs.add(generateReferenceId("test"));
    }
    expect(refs.size).toBe(100);
  });
});

describe("credits — getDailyRefId", () => {
  it("generates a date-based reference ID", () => {
    const date = new Date("2026-08-26T12:00:00Z");
    const ref = getDailyRefId("daily", date);
    expect(ref).toBe("daily_2026-08-26");
  });

  it("uses current date when no date provided", () => {
    const ref = getDailyRefId("login");
    const today = new Date().toISOString().split("T")[0];
    expect(ref).toBe(`login_${today}`);
  });

  it("produces the same ID for the same prefix and date", () => {
    const date = new Date("2026-01-15T06:00:00Z");
    expect(getDailyRefId("streak", date)).toBe(getDailyRefId("streak", date));
  });

  it("produces different IDs for different dates", () => {
    const d1 = new Date("2026-01-01T00:00:00Z");
    const d2 = new Date("2026-01-02T00:00:00Z");
    expect(getDailyRefId("evt", d1)).not.toBe(getDailyRefId("evt", d2));
  });
});

describe("credits — constants", () => {
  it("AI_CREDIT_COST is 10 (flat per AI tool use)", () => {
    expect(AI_CREDIT_COST).toBe(10);
  });

  it("CREDITS_PER_AD is 5", () => {
    expect(CREDITS_PER_AD).toBe(5);
  });

  it("MAX_ADS_PER_DAY is 5", () => {
    expect(MAX_ADS_PER_DAY).toBe(5);
  });

  it("two ad watches equal one AI tool use", () => {
    expect(AI_CREDIT_COST).toBe(CREDITS_PER_AD * 2);
  });
});

describe("credits — REWARD_EVENTS", () => {
  it("is a non-empty object", () => {
    expect(REWARD_EVENTS).toBeDefined();
    expect(Object.keys(REWARD_EVENTS).length).toBeGreaterThan(0);
  });

  it("each event has an amount and reason", () => {
    for (const [key, value] of Object.entries(REWARD_EVENTS)) {
      expect(key).toBeTruthy();
      const evt = value as { amount: number; reason: string };
      expect(typeof evt.amount).toBe("number");
      expect(evt.amount).toBeGreaterThan(0);
      expect(typeof evt.reason).toBe("string");
      expect(evt.reason.length).toBeGreaterThan(0);
    }
  });

  it("referral reward has the highest amount", () => {
    const amounts = Object.values(REWARD_EVENTS).map((e) => e.amount);
    expect(Math.max(...amounts)).toBe(100);
  });

  it("achievement rewards are worth more than basic rewards", () => {
    const basicMax = Math.max(
      REWARD_EVENTS.first_calc.amount,
      REWARD_EVENTS.three_different_calcs.amount,
      REWARD_EVENTS.save_estimate.amount,
    );
    const achMin = Math.min(
      REWARD_EVENTS.ach_builder_10.amount,
      REWARD_EVENTS.ach_estimator_25.amount,
      REWARD_EVENTS.ach_master_5.amount,
    );
    expect(achMin).toBeGreaterThan(basicMax);
  });
});

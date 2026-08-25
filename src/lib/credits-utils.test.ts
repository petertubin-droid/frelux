import { describe, it, expect } from "vitest";
import {
  generateReferenceId,
  getDailyRefId,
  AI_CREDIT_TIERS,
  MAX_AI_ACCESSES_PER_DAY,
  CREDITS_PER_AD,
  MAX_ADS_PER_DAY,
} from "./credits";

describe("generateReferenceId", () => {
  it("prefixes the id with the given string", () => {
    expect(generateReferenceId("AD")).toMatch(/^AD_/);
  });

  it("generates unique ids on successive calls", () => {
    const a = generateReferenceId("X");
    const b = generateReferenceId("X");
    expect(a).not.toBe(b);
  });
});

describe("getDailyRefId", () => {
  it("produces a stable id for the same day", () => {
    const date = new Date("2026-08-25T10:00:00Z");
    expect(getDailyRefId("DAILY", date)).toBe("DAILY_2026-08-25");
  });

  it("produces different ids for different days", () => {
    const day1 = getDailyRefId("DAILY", new Date("2026-08-25T10:00:00Z"));
    const day2 = getDailyRefId("DAILY", new Date("2026-08-26T10:00:00Z"));
    expect(day1).not.toBe(day2);
  });
});

describe("AI credit tier constants", () => {
  it("defines ascending tier pricing", () => {
    expect(AI_CREDIT_TIERS.length).toBe(3);
    expect(AI_CREDIT_TIERS[0]).toBeLessThan(AI_CREDIT_TIERS[1]);
    expect(AI_CREDIT_TIERS[1]).toBeLessThan(AI_CREDIT_TIERS[2]);
  });

  it("caps ad and access limits at sane positive values", () => {
    expect(MAX_AI_ACCESSES_PER_DAY).toBeGreaterThan(0);
    expect(CREDITS_PER_AD).toBeGreaterThan(0);
    expect(MAX_ADS_PER_DAY).toBeGreaterThan(0);
  });
});

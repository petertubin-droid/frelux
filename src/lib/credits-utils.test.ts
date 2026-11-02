import { describe, it, expect } from "vitest";
import {
  generateReferenceId,
  getDailyRefId,
  AI_CREDIT_COST,
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

describe("AI credit cost constants", () => {
  it("defines a flat cost per AI tool use", () => {
    expect(AI_CREDIT_COST).toBe(10);
  });

  it("caps ad limits at sane positive values", () => {
    expect(CREDITS_PER_AD).toBeGreaterThan(0);
    expect(MAX_ADS_PER_DAY).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { formatExpiry } from "@/lib/rewarded-access";

describe("rewarded-access — formatExpiry", () => {
  it("returns empty string for null", () => {
    expect(formatExpiry(null)).toBe("");
  });

  it('returns "until 11:59 PM today" for same-day expiry', () => {
    const today = new Date();
    today.setHours(23, 59, 0, 0);
    const result = formatExpiry(today.toISOString());
    expect(result).toContain("11:59 PM");
    expect(result).toContain("today");
  });

  it("returns formatted date for future expiry", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const result = formatExpiry(future.toISOString());
    expect(result).toContain("Unlocked until");
    expect(result).not.toContain("today");
    // Should contain a date-like string
    expect(result.length).toBeGreaterThan(20);
  });

  it("returns formatted date for past expiry", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const result = formatExpiry(past.toISOString());
    expect(result).toContain("Unlocked until");
    expect(result).not.toContain("today");
  });
});

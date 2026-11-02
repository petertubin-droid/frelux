import { describe, expect, it } from "vitest";
import { calculateTheoreticalLitres } from "@/lib/estimation/paint-engine";

/**
 * Regression protection for the consolidated theoretical paint litres formula.
 * paint-engine.ts is the single authoritative source; painting-engine.ts
 * imports it instead of repeating the (area x coats) / coverage math.
 */
describe("calculateTheoreticalLitres (authoritative shared formula)", () => {
  it("computes (area x coats) / coverage and rounds to 2dp at this documented stage only", () => {
    expect(calculateTheoreticalLitres(40, 1, 10)).toBe(4);
    expect(calculateTheoreticalLitres(45, 2, 10)).toBe(9);
    expect(calculateTheoreticalLitres(33.335, 1, 10)).toBe(3.33);
  });

  it("supports multiple coats and decimal quantities", () => {
    expect(calculateTheoreticalLitres(12.5, 3, 8.5)).toBe(
      Math.round(((12.5 * 3) / 8.5) * 100) / 100,
    );
  });

  it("treats zero area as zero demand, never negative", () => {
    expect(calculateTheoreticalLitres(0, 2, 10)).toBe(0);
    expect(calculateTheoreticalLitres(-5, 2, 10)).toBe(0);
  });

  it("returns 0 demand when coverage is missing or invalid (never guesses)", () => {
    expect(calculateTheoreticalLitres(40, 2, 0)).toBe(0);
    expect(calculateTheoreticalLitres(40, 2, -1)).toBe(0);
  });

  it("clamps coat counts below one to a single coat", () => {
    expect(calculateTheoreticalLitres(40, 0, 10)).toBe(4);
    expect(calculateTheoreticalLitres(40, -3, 10)).toBe(4);
  });

  it("matches the documented FRELUX formula exactly at rounding boundaries", () => {
    const area = 100.005;
    const coats = 2;
    const coverage = 13.7;
    const manual = Math.round(((area * coats) / coverage) * 100) / 100;
    expect(calculateTheoreticalLitres(area, coats, coverage)).toBe(manual);
  });
});

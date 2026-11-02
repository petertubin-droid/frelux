import { describe, it, expect } from "vitest";
import {
  calculateFreshness,
  calculateObservationConfidence,
  FRESH_THRESHOLD_DAYS,
  RECENT_THRESHOLD_DAYS,
  STALE_THRESHOLD_DAYS,
} from "./price-validator";
import type { MiPriceObservation, MiSource } from "@/types/market-intelligence";

describe("market-intelligence/price-validator", () => {
  it("exports threshold constants", () => {
    expect(FRESH_THRESHOLD_DAYS).toBe(7);
    expect(RECENT_THRESHOLD_DAYS).toBe(30);
    expect(STALE_THRESHOLD_DAYS).toBe(90);
  });

  it("calculateFreshness returns fresh for recent dates", () => {
    const now = new Date().toISOString();
    expect(calculateFreshness(now)).toBe("fresh");
  });

  it("calculateFreshness returns recent for dates within 30 days", () => {
    const date = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(date)).toBe("recent");
  });

  it("calculateFreshness returns stale for dates within 90 days", () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(date)).toBe("stale");
  });

  it("calculateFreshness returns expired for very old dates", () => {
    const date = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateFreshness(date)).toBe("expired");
  });

  it("calculateFreshness accepts Date object", () => {
    expect(calculateFreshness(new Date())).toBe("fresh");
  });

  it("calculateObservationConfidence returns high score for perfect match", () => {
    const observation = {
      match_confidence: "high" as const,
      collected_at: new Date().toISOString(),
      package_size: 20,
      currency_code: "NGN",
      market_code: "NG",
    } as MiPriceObservation;

    const source = {
      reliability_tier: 1,
      is_verified: true,
      country_code: "NG",
    } as MiSource;

    const result = calculateObservationConfidence(
      observation,
      source,
      "NGN",
      "NG",
    );
    expect(result.score).toBeGreaterThan(70);
    expect(result.confidence).toBeTruthy();
  });

  it("calculateObservationConfidence returns low score for poor match", () => {
    const observation = {
      match_confidence: "low" as const,
      collected_at: new Date(
        Date.now() - 200 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      package_size: null,
      currency_code: "USD",
      market_code: "US",
    } as MiPriceObservation;

    const source = {
      reliability_tier: 4,
      is_verified: false,
      country_code: "US",
    } as MiSource;

    const result = calculateObservationConfidence(
      observation,
      source,
      "NGN",
      "NG",
    );
    expect(result.score).toBeLessThan(30);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("calculateObservationConfidence returns reasons for low confidence", () => {
    const observation = {
      match_confidence: "low" as const,
      collected_at: new Date(
        Date.now() - 200 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      currency_code: "NGN",
      market_code: "NG",
    } as MiPriceObservation;

    const source = {
      reliability_tier: 4,
      is_verified: false,
      country_code: "NG",
    } as MiSource;

    const result = calculateObservationConfidence(
      observation,
      source,
      "NGN",
      "NG",
    );
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

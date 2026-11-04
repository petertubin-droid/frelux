import { describe, it, expect } from "vitest";
import {
  FRELUX_PRICE_NOTICE,
  freluxPriceStatus,
  priceStatusLabel,
  resolveMaterialPrice,
} from "@/lib/pricing/material-price-source";

describe("material price source", () => {
  it("marks an unverified FRELUX price as indicative and says so", () => {
    const resolved = resolveMaterialPrice({
      source: "frelux",
      customValue: null,
      freluxValue: 12500,
    });
    expect(resolved.value).toBe(12500);
    expect(resolved.status).toBe("indicative");
    expect(resolved.notice).toBe(FRELUX_PRICE_NOTICE);
    expect(resolved.needsCustomPrice).toBe(false);
  });

  it("marks a verified FRELUX price as verified", () => {
    const resolved = resolveMaterialPrice({
      source: "frelux",
      customValue: null,
      freluxValue: 12500,
      freluxVerified: true,
    });
    expect(resolved.status).toBe("verified");
  });

  it("returns no value when FRELUX holds no price, rather than zero", () => {
    const resolved = resolveMaterialPrice({
      source: "frelux",
      customValue: null,
      freluxValue: null,
    });
    expect(resolved.value).toBeNull();
    expect(resolved.status).toBe("unavailable");
    expect(resolved.needsCustomPrice).toBe(true);
  });

  it("uses the user's own figure exactly when they choose custom", () => {
    const resolved = resolveMaterialPrice({
      source: "custom",
      customValue: 18500,
      freluxValue: 12500,
    });
    expect(resolved.value).toBe(18500);
    expect(resolved.source).toBe("custom");
  });

  it("does not fall back to the FRELUX price when custom is empty", () => {
    const resolved = resolveMaterialPrice({
      source: "custom",
      customValue: null,
      freluxValue: 12500,
    });
    expect(resolved.value).toBeNull();
    expect(resolved.needsCustomPrice).toBe(true);
  });

  it("rejects a zero or a negative custom price", () => {
    expect(
      resolveMaterialPrice({
        source: "custom",
        customValue: 0,
        freluxValue: 900,
      }).value,
    ).toBeNull();
    expect(
      resolveMaterialPrice({
        source: "custom",
        customValue: -20,
        freluxValue: 900,
      }).value,
    ).toBeNull();
  });

  it("treats a missing or zero FRELUX price as unavailable", () => {
    expect(freluxPriceStatus(undefined)).toBe("unavailable");
    expect(freluxPriceStatus(0)).toBe("unavailable");
    expect(freluxPriceStatus(Number.NaN)).toBe("unavailable");
    expect(freluxPriceStatus(500)).toBe("indicative");
  });

  it("labels each status for the badge", () => {
    expect(priceStatusLabel("verified")).toBe("Verified");
    expect(priceStatusLabel("indicative")).toBe("Indicative");
    expect(priceStatusLabel("unavailable")).toBe("No price");
  });
});

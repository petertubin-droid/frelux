import { describe, expect, it } from "vitest";
import { calculateWindowBlinds } from "../window-blinds-engine";
import { BLIND_TYPES } from "@/config/window-blinds";

const base = {
  market: "NG",
  unit: "ft" as const,
  typeKey: "roller" as const,
  width: 4,
  height: 4,
  quantity: 1,
};

describe("window blind engine", () => {
  it("treats feet and metres as the same opening", () => {
    const feet = calculateWindowBlinds(base);
    const metres = calculateWindowBlinds({
      ...base,
      unit: "m",
      width: 4 * 0.3048,
      height: 4 * 0.3048,
    });
    expect(feet.geometry.areaM2).toBeCloseTo(metres.geometry.areaM2, 2);
    expect(feet.totals.total).toBeCloseTo(metres.totals.total as number, 1);
  });

  it("adds the waste allowance to the measured area", () => {
    const result = calculateWindowBlinds({ ...base, typeKey: "roman" });
    expect(result.geometry.chargeableAreaM2).toBeGreaterThan(
      result.geometry.areaM2,
    );
    expect(result.geometry.wastage).toBeGreaterThan(0.1);
  });

  it("lifts a small window to the market minimum", () => {
    const result = calculateWindowBlinds({
      ...base,
      typeKey: "wooden",
      width: 1,
      height: 1,
    });
    expect(result.minimumApplied).toBe(true);
    expect(result.perWindow).toBe(75000);
  });

  it("prices at the top of the verified band", () => {
    const roller = calculateWindowBlinds({ ...base, width: 3, height: 4 });
    expect(roller.provenance.ratePerM2).toBe(12500);
    const wooden = calculateWindowBlinds({
      ...base,
      typeKey: "wooden",
      width: 6,
      height: 4,
    });
    expect(wooden.provenance.ratePerM2).toBe(25000);
  });

  it("scales with quantity and adds fitting per window", () => {
    const one = calculateWindowBlinds(base);
    const three = calculateWindowBlinds({ ...base, quantity: 3 });
    expect(three.totals.blinds).toBeCloseTo(
      (one.totals.blinds as number) * 3,
      1,
    );
    expect(three.totals.installation).toBe(15000);
  });

  it("refuses to invent a price for a market with no book", () => {
    const result = calculateWindowBlinds({ ...base, market: "GB" });
    expect(result.status).toBe("manual_price_required");
    expect(result.totals.total).toBeNull();
    expect(result.missing).toContain("ratePerM2");
  });

  it("accepts a manual rate and then prices", () => {
    const result = calculateWindowBlinds({
      ...base,
      market: "GB",
      manualPerM2: 20000,
    });
    expect(result.status).toBe("priced");
    expect(result.totals.blinds).toBeGreaterThan(0);
  });

  it("asks for a manual rate on the one type with no local band", () => {
    const result = calculateWindowBlinds({ ...base, typeKey: "bamboo" });
    expect(result.status).toBe("manual_price_required");
  });

  it("never determines tax", () => {
    expect(calculateWindowBlinds(base).taxStatus).toBe("tax_not_determined");
  });

  it("covers every type with a sample window", () => {
    for (const type of BLIND_TYPES) {
      const result = calculateWindowBlinds({
        ...base,
        typeKey: type.key,
        width: type.sample.widthM,
        height: type.sample.heightM,
        unit: "m",
      });
      expect(result.geometry.areaM2).toBeGreaterThan(0);
      expect(Number.isFinite(result.geometry.chargeableAreaM2)).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";
import { calculateGermanFloor } from "@/lib/estimation/german-floor";

/**
 * Audit 10 of 34. Slab-on-grade conformance against site practice: the
 * concrete side follows the nominal-mix method, hardcore is bought loose
 * because fill only compacts down, and the membrane is bought with its laps.
 */
const floor = (over: Record<string, unknown> = {}) => {
  const outcome = calculateGermanFloor({
    market: "NG",
    lengthM: 10,
    widthM: 10,
    hardcoreMm: 150,
    blindingMm: 50,
    slabMm: 100,
    mixKey: "1:2:4",
    ...over,
  });
  if (!outcome.result) throw new Error(outcome.errors.join("; "));
  return outcome.result;
};

describe("German floor conformance", () => {
  it("measures each layer as area times thickness", () => {
    const r = floor();
    expect(r.areaM2).toBe(100);
    expect(r.layers.slab.cubicMetres).toBeCloseTo(10, 3);
    expect(r.layers.blinding.cubicMetres).toBeCloseTo(5, 3);
    expect(r.layers.hardcore.cubicMetres).toBeCloseTo(15, 3);
  });

  it("orders hardcore loose, because fill only compacts down", () => {
    // 15 m3 compacted, 25 per cent bulking, 5 per cent wastage.
    expect(floor().layers.hardcore.purchaseCubicMetres).toBeCloseTo(19.688, 2);
  });

  it("takes the concrete through wet, dry and mix parts", () => {
    const r = floor();
    // 10 m3 wet, 5 per cent allowance, 1.54 dry factor, 1:2:4 = 7 parts.
    expect(r.mix.dryM3).toBeCloseTo(16.17, 2);
    expect(r.mix.cementM3).toBeCloseTo(2.31, 2);
    expect(r.mix.sandM3).toBeCloseTo(4.62, 2);
    expect(r.mix.aggregateM3).toBeCloseTo(9.24, 2);
  });

  it("counts whole bags at the market pack size", () => {
    // 2.31 m3 of cement at 1440 kg/m3 is 3326 kg: 67 bags of 50 kg.
    expect(floor().cement).toEqual({ bagKg: 50, bags: 67 });
    // A 25 kg pack doubles the count for the same mass.
    expect(floor({ market: "GB" }).cement.bags).toBeGreaterThanOrEqual(133);
  });

  it("buys the membrane with its laps", () => {
    const r = floor();
    expect(r.membrane.netM2).toBeCloseTo(100, 2);
    expect(r.membrane.orderM2).toBeCloseTo(110, 2);
  });

  it("adds blinding sand to the concrete sand, allowance included", () => {
    // 5 m3 of blinding carries the same 5 per cent as every other layer, so
    // 5.25 m3 joins the 4.62 m3 of concrete sand.
    expect(floor().sand.cubicMetres).toBeCloseTo(4.62 + 5.25, 1);
  });

  it("refuses a floor with no dimensions or a negative layer", () => {
    expect(
      calculateGermanFloor({ market: "NG", lengthM: 0, widthM: 10 }).result,
    ).toBeNull();
    expect(
      calculateGermanFloor({
        market: "NG",
        lengthM: 10,
        widthM: 10,
        hardcoreMm: -1,
      }).result,
    ).toBeNull();
  });

  it("says when the cement pack size is not configured for the market", () => {
    expect(floor({ market: "ZZ" }).assumptions.join(" ")).toMatch(
      /No cement pack size is configured for ZZ/i,
    );
  });
});

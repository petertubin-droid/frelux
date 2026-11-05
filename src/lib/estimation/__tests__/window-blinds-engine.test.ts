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

import {
  calculateBlindProject,
  type BlindOpening,
} from "../window-blinds-engine";

const opening = (over: Partial<BlindOpening> = {}): BlindOpening => ({
  id: "a",
  label: "Living room",
  typeKey: "day-night",
  width: 4,
  height: 4,
  quantity: 1,
  ...over,
});

describe("window blind project", () => {
  const base = {
    market: "NG",
    unit: "ft" as const,
    grade: "standard" as const,
  };

  it("totals a mixed schedule", () => {
    const result = calculateBlindProject({
      ...base,
      openings: [
        opening({ id: "a", quantity: 3 }),
        opening({ id: "b", typeKey: "wooden", width: 6 }),
      ],
    });
    expect(result.rows).toHaveLength(2);
    expect(result.geometry.windowCount).toBe(4);
    expect(result.totals.blinds).toBeGreaterThan(
      result.rows[0].blindsTotal as number,
    );
    expect(result.status).toBe("priced");
  });

  it("applies the grade multiplier to the rate, not the minimum", () => {
    const standard = calculateBlindProject({
      ...base,
      openings: [opening({ width: 6 })],
    });
    const premium = calculateBlindProject({
      ...base,
      grade: "premium",
      openings: [opening({ width: 6 })],
    });
    expect(premium.rows[0].ratePerM2).toBeCloseTo(
      (standard.rows[0].ratePerM2 as number) * 1.4,
      1,
    );
    expect(premium.rows[0].minimumPerWindow).toBe(
      standard.rows[0].minimumPerWindow,
    );
    expect(premium.totals.total as number).toBeGreaterThan(
      standard.totals.total as number,
    );
  });

  it("holds the market minimum on every small window in the schedule", () => {
    const result = calculateBlindProject({
      ...base,
      openings: [
        opening({ width: 1, height: 1 }),
        opening({ id: "b", typeKey: "venetian-50", width: 1, height: 1 }),
      ],
    });
    expect(result.rows.every((r) => r.minimumApplied)).toBe(true);
    expect(result.rows[0].perWindow).toBe(15500);
  });

  it("asks for the motor price instead of inventing one", () => {
    const result = calculateBlindProject({
      ...base,
      openings: [opening({ motorised: true })],
    });
    expect(result.status).toBe("manual_price_required");
    expect(result.missing).toContain("motorPerWindow");
    expect(result.totals.extras).toBeNull();
  });

  it("charges an extra only to the windows that ask for it", () => {
    // Two windows in the job, one motorised and one to be stripped out.
    // The old engine charged both extras to every window, which overpriced
    // the job; each extra now follows the opening that selected it.
    const result = calculateBlindProject({
      ...base,
      openings: [
        opening({ id: "a", motorised: true }),
        opening({ id: "b", typeKey: "roller", removeOld: true }),
      ],
      extras: { motorPerWindow: 120000, removeOldPerWindow: 3000 },
    });
    expect(result.rows[0].extrasTotal).toBe(120000);
    expect(result.rows[1].extrasTotal).toBe(3000);
    expect(result.totals.extras).toBe(123000);
    expect(result.status).toBe("priced");
  });

  it("multiplies a per window extra by that opening's quantity only", () => {
    const result = calculateBlindProject({
      ...base,
      openings: [
        opening({ id: "a", motorised: true, quantity: 3 }),
        opening({ id: "b", typeKey: "roller" }),
      ],
      extras: { motorPerWindow: 120000 },
    });
    expect(result.rows[0].extrasTotal).toBe(360000);
    expect(result.rows[1].extrasTotal).toBe(0);
    expect(result.totals.extras).toBe(360000);
  });

  it("asks for the cassette price when a cassette is selected", () => {
    const result = calculateBlindProject({
      ...base,
      openings: [opening({ cassette: true })],
    });
    expect(result.status).toBe("manual_price_required");
    expect(result.missing).toContain("cassettePerWindow");
  });

  it("reports how many panels a wide opening needs", () => {
    const result = calculateBlindProject({
      ...base,
      unit: "m",
      openings: [opening({ typeKey: "roman", width: 5 })],
    });
    // Roman tops out at 2.2 m, so 5 m cannot be one piece.
    expect(result.rows[0].panels).toBe(3);
    expect(result.rows[0].panelWidthM).toBeCloseTo(1.67, 2);
    expect(result.assumptions.some((a) => /three panels/i.test(a))).toBe(true);
  });

  it("keeps a narrow opening as a single panel", () => {
    const result = calculateBlindProject({
      ...base,
      unit: "m",
      openings: [opening({ typeKey: "roller", width: 1.5 })],
    });
    expect(result.rows[0].panels).toBe(1);
    expect(result.rows[0].panelWidthM).toBeCloseTo(1.5, 2);
  });

  it("rounds the measured opening up to the next centimetre", () => {
    // 1.234 by 1.234 m is sold as 1.24 by 1.24 m, the way a shop cuts it.
    const result = calculateBlindProject({
      ...base,
      unit: "m",
      openings: [opening({ width: 1.234, height: 1.234 })],
    });
    expect(result.rows[0].widthM).toBe(1.24);
    expect(result.rows[0].heightM).toBe(1.24);
    expect(result.rows[0].areaM2).toBe(1.54);
  });

  it("adds the tax rate the user supplies and nothing when they do not", () => {
    const untaxed = calculateBlindProject({ ...base, openings: [opening()] });
    expect(untaxed.totals.tax).toBeNull();
    expect(untaxed.totals.totalInclTax).toBe(untaxed.totals.total);
    expect(untaxed.taxStatus).toBe("tax_not_determined");

    const taxed = calculateBlindProject({
      ...base,
      openings: [opening()],
      taxRatePct: 7.5,
    });
    expect(taxed.totals.tax).toBeCloseTo(
      Math.round((taxed.totals.total as number) * 0.075 * 100) / 100,
      2,
    );
    expect(taxed.totals.totalInclTax).toBeCloseTo(
      (taxed.totals.total as number) + (taxed.totals.tax as number),
      2,
    );
    expect(taxed.taxStatus).toBe("tax_applied");
  });

  it("reports a blended rate over the charged area", () => {
    const result = calculateBlindProject({
      ...base,
      openings: [opening(), opening({ id: "b", typeKey: "roman" })],
    });
    expect(result.geometry.blendedRatePerM2).toBeGreaterThan(0);
    expect(result.geometry.totalChargeableAreaM2).toBeGreaterThan(
      result.geometry.totalAreaM2,
    );
  });

  it("refuses a market with no book", () => {
    const result = calculateBlindProject({
      ...base,
      market: "US",
      openings: [opening()],
    });
    expect(result.status).toBe("manual_price_required");
    expect(result.totals.total).toBeNull();
  });
});

import { blindsBoqItems } from "../window-blinds-engine";
import {
  listEngines,
  executeEngine,
} from "@/lib/ai-foundation/engines-registry";

describe("window blind engine integration", () => {
  it("appears in the authoritative engine registry", () => {
    expect(listEngines().some((engine) => engine.id === "window_blinds")).toBe(
      true,
    );
  });

  it("runs through executeEngine and returns quantities with costs", async () => {
    const result = await executeEngine("window_blinds", {
      market: "NG",
      unit: "ft",
      grade: "standard",
      openings: [
        {
          id: "a",
          label: "Living room",
          typeKey: "day-night",
          width: 4,
          height: 4,
          quantity: 3,
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.quantities.length).toBeGreaterThan(1);
    expect(result.costs?.currency).toBe("NGN");
    expect(result.costs?.total).toBeGreaterThan(0);
  });

  it("returns no cost figure when the market has no book", async () => {
    const result = await executeEngine("window_blinds", {
      market: "US",
      unit: "ft",
      grade: "standard",
      openings: [
        {
          id: "a",
          label: "A",
          typeKey: "roller",
          width: 4,
          height: 4,
          quantity: 1,
        },
      ],
    });
    expect(result.costs).toBeNull();
    expect(result.quantities.length).toBeGreaterThan(0);
  });

  it("emits BOQ quantities without prices", () => {
    const project = calculateBlindProject({
      market: "NG",
      unit: "ft",
      grade: "premium",
      openings: [
        opening({ quantity: 2 }),
        opening({ id: "b", typeKey: "wooden", motorised: true }),
      ],
    });
    const items = blindsBoqItems({
      rows: project.rows,
      gradeLabel: project.gradeLabel,
    });
    expect(items).toHaveLength(2);
    expect(items[0].category).toBe("Window Treatments");
    expect(items[0].specification).toContain("Premium grade");
    expect(items[1].specification).toContain("motorised");
    expect(Object.keys(items[0])).not.toContain("amount");
  });
});

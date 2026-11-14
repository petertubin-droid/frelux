import { describe, expect, it } from "vitest";
import { buildSummaryRows } from "@/lib/estimation/takeoff-rows";
import {
  SAND_DENSITY_KG_M3,
  planSandPurchase,
  sandConfigFor,
  sandPurchaseLabel,
  sandRowOverrides,
  sandTonnes,
  sandVolumeLabel,
  tripCubicMetres,
} from "@/lib/materials/sand-units";

describe("sand measured in cubic metres and bought in trips", () => {
  it("keeps 1,600 kg/m³, the density the mortar takeoffs already assume", () => {
    expect(SAND_DENSITY_KG_M3).toBe(1600);
    expect(sandConfigFor("ng").densityKgM3).toBe(1600);
    expect(sandConfigFor(undefined).marketCode).toBe("NG");
    expect(sandConfigFor("ng").densityKgM3).toBe(1600);
  });

  it("converts the volume-tonnage pair a two-bedroom takeoff produced", () => {
    // 6.69 m³ of sharp sand is what a small bungalow's blockwork and render
    // needed; at 1,600 kg/m³ that is 10.70 t, so the "10 ton" printed beside it
    // was right, not a second, contradictory figure.
    expect(sandTonnes(6.69, "NG")).toBe(10.7);
    expect(sandVolumeLabel(6.69, "NG")).toBe("6.69 m³ · 10.7 t");
  });

  it("sizes the Nigerian tippers it sells sand in", () => {
    expect(tripCubicMetres(5, "NG")).toBe(3.13);
    expect(tripCubicMetres(10, "NG")).toBe(6.25);
    expect(tripCubicMetres(20, "NG")).toBe(12.5);
  });

  it("plans the smallest sensible order: a ten-tonne trip and a top-up", () => {
    const plan = planSandPurchase(6.69, "NG");
    expect(plan).not.toBeNull();
    expect(plan!.trips).toHaveLength(1);
    expect(plan!.trips[0]).toMatchObject({ tonnes: 10, count: 1 });
    expect(plan!.tripVolumeM3).toBe(6.25);
    expect(plan!.topUpM3).toBe(0.44);
    expect(plan!.totalM3).toBe(6.69);
    expect(plan!.surplusM3).toBe(0);
    expect(sandPurchaseLabel(6.69, "NG")).toBe(
      "1 × 10-tonne trip (6.25 m³) + 0.44 m³ top-up (0.7 t)",
    );
  });

  it("mixes trip sizes for a volume bigger than one tipper", () => {
    const plan = planSandPurchase(30, "NG")!;
    expect(plan.trips.map((t) => [t.tonnes, t.count])).toEqual([
      [20, 2],
      [5, 1],
    ]);
    expect(plan.totalM3).toBe(30);
    expect(plan.surplusM3).toBe(0);
  });

  it("buys a single trip when the volume matches it exactly", () => {
    const plan = planSandPurchase(12.5, "NG")!;
    expect(plan.trips).toHaveLength(1);
    expect(plan.trips[0]).toMatchObject({ tonnes: 20, count: 1 });
    expect(plan.topUpM3).toBe(0);
    expect(plan.surplusM3).toBe(0);
  });

  it("tops up in bags when the job is smaller than any trip", () => {
    const plan = planSandPurchase(1, "NG")!;
    expect(plan.trips).toHaveLength(0);
    expect(plan.topUpM3).toBe(1);
    expect(sandPurchaseLabel(1, "NG")).toBe("1 m³ top-up (1.6 t)");
  });

  it("shows no trip plan in markets whose trip sizes are unconfirmed", () => {
    // Guessing a delivery size for a market we have not researched would be
    // worse than showing the volume and weight alone.
    expect(sandConfigFor("GB").trips).toEqual([]);
    expect(planSandPurchase(6.69, "GB")).toBeNull();
    expect(sandPurchaseLabel(6.69, "GB")).toBeNull();
    expect(sandVolumeLabel(6.69, "GB")).toBe("6.69 m³ · 10.7 t");
  });

  it("replaces the raw volume row and absorbs the separate weight row", () => {
    const rows = buildSummaryRows(
      {
        mortarVolumeM3Net: 4.2,
        sandVolumeM3: 6.69,
        sandWeightTonnes: 10.7,
        waterLiters: 380,
      },
      { sandVolumeM3: "Sand volume (m³)" },
      sandRowOverrides("NG"),
    );
    expect(rows).toEqual([
      { label: "Mortar Volume M3 Net", value: "4.2" },
      { label: "Sand volume", value: "6.69 m³ · 10.7 t" },
      {
        label: "Buy sand",
        value: "1 × 10-tonne trip (6.25 m³) + 0.44 m³ top-up (0.7 t)",
      },
      { label: "Water Liters", value: "380" },
    ]);
  });
});

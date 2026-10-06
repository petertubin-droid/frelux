// =========================================================
// Wall Finishing engine tests — the four mandated country
// cases (NG block+render+paint, US timber+drywall+paint, UK
// masonry+skim+paint, IN brick+plaster+putty+paint) plus
// openings, volume mixes, cost, transparency and validation.
// =========================================================

import { describe, expect, it } from "vitest";
import type { WallFinProjectSpec, WallSpec } from "@/types/wallfinishing";
import { getAssembly } from "../assemblies";
import { getWallSystem } from "../wall-systems";
import { resolveWallFinCountry } from "../resolver";
import { calculateOpeningAreas } from "../openings";
import {
  calculateLayerQuantity,
  calculateWallAreas,
  mixComponentQuantity,
  roundPurchaseQuantity,
  MORTAR_DRY_FACTOR,
  CEMENT_BAG_VOLUME_M3,
} from "../quantity-engine";
import { calculateLayerCost } from "../cost-engine";
import { checkCompatibility } from "../compatibility";
import { buildChecklist } from "../checklists";
import {
  estimateWallFinishingProject,
  type WallFinResolutionContext,
} from "../index";
import { WALLFIN_COUNTRY_PROFILES } from "../countries";

// ─── fixtures ───────────────────────────────────

/** One 4 m × 3 m interior wall with a door + window. */
function testWall(partial?: Partial<WallSpec>): WallSpec {
  return {
    id: "w1",
    label: "Test wall",
    lengthM: 4,
    heightM: 3,
    surface: "interior",
    wallSystemId: "ng-sandcrete-block",
    assemblyId: "ng-interior-block-paint",
    openings: [
      {
        id: "d1",
        type: "door",
        widthM: 0.9,
        heightM: 2.1,
        quantity: 1,
        revealDepthM: 0,
        deduct: true,
      },
      {
        id: "win1",
        type: "window",
        widthM: 1.2,
        heightM: 1.2,
        quantity: 1,
        revealDepthM: 0,
        deduct: true,
      },
    ],
    excludedAreaM2: 0,
    ...partial,
  };
}

/** Simple price context: fixed prices per role, all one currency. */
function priceContext(
  prices: Record<string, number>,
  labour: Record<string, number> = {},
  currency = "USD",
): WallFinResolutionContext {
  return {
    currency,
    resolvePrice: (role) => ({
      materialName: `${role}-material`,
      unitPrice: prices[role] ?? null,
      packUnits: null,
      purchaseLabel: null,
      currency,
      resolvedMarket: "NG",
      priceSource: "test",
      scanSource: null,
      priceDate: "2026-10-06",
      isManualPrice: false,
      unpriced: prices[role] === undefined,
    }),
    resolveLabour: (task) =>
      labour[task] === undefined
        ? null
        : {
            taskKey: task,
            method: "per-m2",
            rate: labour[task],
            currency,
            outputPerWorkerDay: null,
            sourceReference: "test",
            effectiveDate: "2026-10-06",
            isEstimate: true,
          },
  };
}

// ─── country profiles ───────────────────────────

describe("wall-finishing country profiles", () => {
  it("covers the seven initial markets with multiple systems each", () => {
    expect(WALLFIN_COUNTRY_PROFILES.map((p) => p.code)).toEqual([
      "NG",
      "US",
      "GB",
      "DE",
      "IN",
      "CA",
      "AU",
    ]);
    for (const p of WALLFIN_COUNTRY_PROFILES) {
      expect(p.wallSystemIds.length).toBeGreaterThanOrEqual(2);
      expect(p.templateNotice).toMatch(/not a building code/i);
    }
  });

  it("resolves any worldwide market to a native or inherited template", () => {
    expect(resolveWallFinCountry("NG").native).toBe(true);
    const gh = resolveWallFinCountry("GH");
    expect(gh.native).toBe(false);
    expect(gh.profile.code).toBe("NG");
    expect(gh.inheritedNotice).toContain("GH");
    const nz = resolveWallFinCountry("NZ");
    expect(nz.profile.code).toBe("AU");
  });
});

// ─── areas & openings ───────────────────────────

describe("wall areas", () => {
  it("computes gross − openings = net and adds reveals", () => {
    const wall = testWall({
      openings: [
        {
          id: "d1",
          type: "door",
          widthM: 0.9,
          heightM: 2.1,
          quantity: 1,
          revealDepthM: 0.15,
          deduct: true,
        },
      ],
    });
    const r = calculateWallAreas(wall);
    expect(r.ok).toBe(true);
    expect(r.grossAreaM2).toBe(12);
    // 0.9 × 2.1 = 1.89
    expect(r.openingAreaM2).toBeCloseTo(1.89, 2);
    expect(r.netAreaM2).toBeCloseTo(10.11, 2);
    // perimeter 2 × (0.9 + 2.1) = 6 m × 0.15 m reveal = 0.9 m²
    expect(r.revealAreaM2).toBeCloseTo(0.9, 2);
    expect(r.finishingAreaM2).toBeCloseTo(11.01, 2);
  });

  it("refuses invalid dimensions instead of guessing", () => {
    const r = calculateWallAreas(testWall({ lengthM: -4 }));
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/length must be a positive number/);
  });

  it("warns on malformed openings but keeps the rest", () => {
    const r = calculateOpeningAreas([
      {
        id: "x",
        type: "custom",
        widthM: -1,
        heightM: 2,
        quantity: 1,
        revealDepthM: 0,
        deduct: true,
      },
    ]);
    expect(r.openingAreaM2).toBe(0);
    expect(r.warnings[0]).toMatch(/invalid dimensions/);
  });
});

// ─── the four mandated country cases ────────────

describe("Nigeria: block + render + putty + paint", () => {
  it("prices render as volumetric cement + sand components", () => {
    const assembly = getAssembly("ng-interior-block-paint")!;
    const render = assembly.layers.find((l) => l.id === "ng-int-render")!;
    const qty = calculateLayerQuantity({
      layer: render,
      areaM2: 10,
      includeOptional: true,
    });
    // 10 m² × 0.015 m = 0.15 m³ wet → base stores the DRY volume 0.1995
    expect(qty.baseQuantity).toBeCloseTo(0.15 * MORTAR_DRY_FACTOR, 3);
    const comps = mixComponentQuantity(qty.baseQuantity, render.mix!);
    const cement = comps.find((c) => c.component.role === "concrete-mix")!;
    const sand = comps.find((c) => c.component.role === "sand")!;
    // dry 0.1995 m³; cement share 1/5 = 0.0399 m³ ÷ 0.035 = 1.14 bags
    expect(cement.quantity).toBeCloseTo(
      (0.15 * MORTAR_DRY_FACTOR * 0.2) / CEMENT_BAG_VOLUME_M3,
      3,
    );
    expect(sand.quantity).toBeCloseTo(0.15 * MORTAR_DRY_FACTOR * 0.8, 3);
  });

  it("runs the full NG project with prices and labour", async () => {
    const spec: WallFinProjectSpec = {
      name: "NG living room",
      countryCode: "NG",
      region: "Lagos",
      buildingType: "residential",
      rooms: [
        {
          id: "r1",
          name: "Living room",
          lengthM: 4,
          widthM: 4,
          heightM: 3,
          isWetArea: false,
          walls: [testWall({ openings: [] })],
        },
      ],
      extraCosts: [],
      contingencyPercent: 10,
    };
    const ctx = priceContext(
      {
        "concrete-mix": 9000,
        sand: 8000,
        "joint-filler": 7000,
        sandpaper: 50,
        primer: 600,
        "interior-paint": 850,
      },
      {
        wallfin_rendering: 1500,
        wallfin_putty: 600,
        wallfin_sanding: 200,
        wallfin_priming: 300,
        wallfin_painting: 700,
      },
      "NGN",
    );
    const result = await estimateWallFinishingProject(spec, ctx);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.currency).toBe("NGN");
    expect(result.rooms[0].walls[0].netAreaM2).toBe(12);
    // 12 × 2 ÷ 10 = 2.4 L base, +10% = 2.64 → purchase 3 L
    const paint = result.rooms[0].walls[0].layers.find(
      (l) => l.layerTemplateId === "ng-int-paint",
    )!;
    expect(paint.baseQuantity).toBeCloseTo(2.4, 3);
    expect(paint.purchaseQuantity).toBe(3);
    expect(result.cost.contingency).toBeGreaterThan(0);
    expect(result.cost.total).toBeGreaterThan(result.cost.subtotal);
  });
});

describe("USA: timber frame + drywall + paint", () => {
  it("uses tape + compound + primer + paint sequence with US coverages", () => {
    const assembly = getAssembly("us-interior-drywall-paint")!;
    expect(assembly.layers.map((l) => l.id)).toEqual([
      "us-int-tape",
      "us-int-compound",
      "us-int-sand",
      "us-int-primer",
      "us-int-paint",
    ]);
    const paint = assembly.layers.find((l) => l.id === "us-int-paint")!;
    // 100 m² × 2 ÷ 37 m²/gal = 5.405 gal
    const qty = calculateLayerQuantity({
      layer: paint,
      areaM2: 100,
      includeOptional: true,
    });
    expect(qty.baseQuantity).toBeCloseTo(5.405, 2);
    expect(qty.purchaseQuantity).toBe(6);
  });

  it("warns when an interior-only role lands on an exterior wall", () => {
    const compat = checkCompatibility("interior-paint", "exterior", [
      "drywall",
    ]);
    expect(compat.ok).toBe(false);
    expect(compat.warnings[0]).toMatch(/interior-only/);
  });
});

describe("United Kingdom: masonry + skim plaster + paint", () => {
  it("skim coverage matches Thistle MultiFinish (10.5 m² per 25 kg bag)", () => {
    const assembly = getAssembly("gb-interior-block-skim-paint")!;
    const skim = assembly.layers.find((l) => l.id === "gb-int-skim")!;
    const qty = calculateLayerQuantity({
      layer: skim,
      areaM2: 42,
      includeOptional: true,
    });
    expect(qty.baseQuantity).toBeCloseTo(4, 1); // 42 ÷ 10.5
    // +12% waste = 4.48 → 5 whole bags
    expect(qty.purchaseQuantity).toBe(5);
  });

  it("marks undercoat plaster as optional (plasterer decides)", () => {
    const assembly = getAssembly("gb-interior-block-skim-paint")!;
    expect(
      assembly.layers.find((l) => l.id === "gb-int-undercoat")!.optional,
    ).toBe(true);
    expect(assembly.layers.find((l) => l.id === "gb-int-skim")!.optional).toBe(
      false,
    );
  });

  it("supports the UK mist-coat step", () => {
    const assembly = getAssembly("gb-interior-block-skim-paint")!;
    const mist = assembly.layers.find((l) => l.id === "gb-int-mist")!;
    expect(mist.materialRole).toBe("mist-coat");
  });
});

describe("India: brick/block + plaster + putty + paint", () => {
  it("prices Birla putty at 35 m² per 40 kg bag per coat", () => {
    const assembly = getAssembly("in-interior-brick-paint")!;
    const putty = assembly.layers.find((l) => l.id === "in-int-putty")!;
    const qty = calculateLayerQuantity({
      layer: putty,
      areaM2: 70,
      includeOptional: true,
    });
    // 70 × 2 ÷ 35 = 4 bags base
    expect(qty.baseQuantity).toBeCloseTo(4, 3);
    // +10% waste = 4.4 → 5 whole bags
    expect(qty.purchaseQuantity).toBe(5);
  });

  it("runs the full IN project end to end", async () => {
    const spec: WallFinProjectSpec = {
      name: "IN bedroom",
      countryCode: "IN",
      region: "Mumbai",
      buildingType: "residential",
      rooms: [
        {
          id: "r1",
          name: "Bedroom",
          lengthM: 3.5,
          widthM: 3,
          heightM: 3,
          isWetArea: false,
          walls: [
            testWall({
              wallSystemId: "in-brick-block-plaster",
              assemblyId: "in-interior-brick-paint",
              openings: [],
            }),
          ],
        },
      ],
      extraCosts: [{ id: "e1", label: "Scaffolding", amount: 2000 }],
      contingencyPercent: 5,
    };
    const ctx = priceContext(
      {
        "concrete-mix": 380,
        sand: 1200,
        "joint-filler": 720,
        primer: 137.5,
        "interior-paint": 95,
      },
      {
        wallfin_rendering: 120,
        wallfin_putty: 60,
        wallfin_priming: 25,
        wallfin_painting: 80,
      },
      "INR",
    );
    const result = await estimateWallFinishingProject(spec, ctx);
    expect(result.ok).toBe(true);
    expect(result.cost.equipment).toBe(2000);
    expect(result.cost.contingency).toBeGreaterThan(0);
    // the layer table keeps full transparency
    const wall = result.rooms[0].walls[0];
    expect(wall.checklists.length).toBeGreaterThan(0);
    expect(wall.layers.every((l) => l.steps.length > 0)).toBe(true);
  });
});

// ─── cost engine ────────────────────────────────

describe("cost engine", () => {
  it("computes material + labour with transparency steps", () => {
    const cost = calculateLayerCost({
      quantity: 8,
      purchaseUnit: "litre",
      price: {
        materialName: "Emulsion",
        unitPrice: 10,
        packUnits: null,
        purchaseLabel: null,
        currency: "USD",
        resolvedMarket: "NG",
        priceSource: "test",
        scanSource: null,
        priceDate: "2026-10-06",
        isManualPrice: false,
        unpriced: false,
      },
      labour: {
        taskKey: "wallfin_painting",
        method: "per-m2",
        rate: 5,
        currency: "USD",
        outputPerWorkerDay: null,
        sourceReference: "test",
        effectiveDate: "2026-10-06",
        isEstimate: true,
      },
      areaM2: 36,
      layerName: "Emulsion",
    });
    expect(cost.materialCost).toBe(80);
    expect(cost.labourCost).toBe(180);
    expect(cost.errors).toHaveLength(0);
    expect(cost.labourSteps.some((s) => s.detail.includes("36 m² × 5"))).toBe(
      true,
    );
  });

  it("refuses unpriced layers instead of guessing", () => {
    const cost = calculateLayerCost({
      quantity: 2,
      purchaseUnit: "bag",
      price: {
        materialName: null,
        unitPrice: null,
        packUnits: null,
        purchaseLabel: null,
        currency: "USD",
        resolvedMarket: null,
        priceSource: null,
        scanSource: null,
        priceDate: null,
        isManualPrice: false,
        unpriced: true,
      },
      labour: null,
      areaM2: 10,
      layerName: "Putty",
    });
    expect(cost.materialCost).toBeNull();
    expect(cost.errors[0]).toMatch(/no verified price/);
    expect(cost.errors[1]).toMatch(/no labour rate configured/);
  });
});

// ─── transparency & rounding ─────────────────────

describe("calculation transparency (prompt example)", () => {
  it("shows 36 × 2 ÷ 10 = 7.2 L, waste 10% → 7.92 L → purchase 8 L", () => {
    const assembly = getAssembly("ng-interior-block-paint")!;
    const paint = assembly.layers.find((l) => l.id === "ng-int-paint")!;
    const qty = calculateLayerQuantity({
      layer: paint,
      areaM2: 36,
      includeOptional: true,
    });
    expect(qty.baseQuantity).toBeCloseTo(7.2, 3);
    expect(qty.adjustedQuantity).toBeCloseTo(7.92, 2);
    expect(qty.purchaseQuantity).toBe(8);
    expect(
      qty.steps.some((s) => s.detail.includes("36 m² × 2 coats ÷ 10")),
    ).toBe(true);
    expect(qty.steps.some((s) => s.label === "Waste allowance")).toBe(true);
    expect(qty.steps.some((s) => s.label === "Purchase quantity")).toBe(true);
  });
});

describe("purchase rounding", () => {
  it("rounds up per unit family, never under-buys", () => {
    expect(roundPurchaseQuantity(7.92, "litre")).toBe(8);
    expect(roundPurchaseQuantity(4.1, "50 kg bag")).toBe(5);
    expect(roundPurchaseQuantity(2.55, "roll (150 m)")).toBe(3);
    expect(roundPurchaseQuantity(1.204, "m³")).toBe(1.3);
  });
});

// ─── overrides & validation ─────────────────────

describe("manual overrides", () => {
  it("respects user coverage/coats overrides and flags them", () => {
    const assembly = getAssembly("ng-interior-block-paint")!;
    const paint = assembly.layers.find((l) => l.id === "ng-int-paint")!;
    const qty = calculateLayerQuantity({
      layer: paint,
      areaM2: 20,
      includeOptional: true,
      overrides: { coverageRateM2PerUnit: 12, coats: 3 },
    });
    // 20 × 3 ÷ 12 = 5 L
    expect(qty.baseQuantity).toBeCloseTo(5, 3);
    expect(qty.overridden).toContain("coverage");
    expect(qty.overridden).toContain("coats");
  });

  it("refuses invalid coverage instead of producing zero silently", () => {
    const assembly = getAssembly("ng-interior-block-paint")!;
    const paint = assembly.layers.find((l) => l.id === "ng-int-paint")!;
    const qty = calculateLayerQuantity({
      layer: paint,
      areaM2: 20,
      includeOptional: true,
      overrides: { coverageRateM2PerUnit: 0 },
    });
    expect(qty.purchaseQuantity).toBe(0);
    expect(qty.surfaceWarning).toMatch(/coverage rate missing or invalid/);
  });

  it("refuses thickness outside the valid range", () => {
    const assembly = getAssembly("ng-interior-block-paint")!;
    const render = assembly.layers.find((l) => l.id === "ng-int-render")!;
    const qty = calculateLayerQuantity({
      layer: render,
      areaM2: 20,
      includeOptional: true,
      overrides: { thicknessMm: 50 },
    });
    expect(qty.purchaseQuantity).toBe(0);
    expect(qty.surfaceWarning).toMatch(/outside the valid range/);
  });
});

// ─── wall systems & checklists ───────────────────

describe("wall systems catalogue", () => {
  it("supports multiple systems per country with substrate tags", () => {
    const ng = getWallSystem("ng-sandcrete-block")!;
    expect(ng.substrates).toContain("block");
    const us = getWallSystem("us-timber-stud-drywall")!;
    expect(us.substrates).toEqual(["timber", "drywall"]);
  });
});

describe("quality checklists", () => {
  it("builds category-appropriate checklists starting not-started", () => {
    const assembly = getAssembly("gb-interior-block-skim-paint")!;
    const skim = assembly.layers.find((l) => l.id === "gb-int-skim")!;
    const checklist = buildChecklist(skim);
    expect(checklist.items.every((i) => i.status === "not-started")).toBe(true);
    expect(checklist.items.some((i) => i.label.includes("Pinholes"))).toBe(
      true,
    );
    const paint = assembly.layers.find((l) => l.id === "gb-int-paint")!;
    const paintList = buildChecklist(paint);
    expect(
      paintList.items.some((i) => i.label.includes("Final inspection")),
    ).toBe(true);
  });
});

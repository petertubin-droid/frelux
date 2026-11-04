// =========================================================
// Finishes: unit equivalence at the calculator boundary
//
// The complaint behind this suite: international visitors (and Nigerian
// visitors, who measure rooms in feet) reported wrong material quantities
// from the finishes calculators. The cause was not the arithmetic inside
// the engines, which work in metres, but the pages: the wall finish and
// tyrolene estimators only ever accepted metres, so a room typed as
// 13.1 "feet" became 13.1 metres.
//
// These tests pin the contract the pages now honour: the same physical room
// entered in either unit must produce the same material quantities.
// =========================================================

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WallFinProjectSpec, WallSpec } from "@/types/wallfinishing";
import type { WallFinResolutionContext } from "@/lib/wallfinishing";
import { estimateWallFinishingProject } from "@/lib/wallfinishing";
import { unitToMeters } from "@/lib/utils";

const FEET = 0.3048;

function priceContext(): WallFinResolutionContext {
  const currency = "NGN";
  return {
    currency,
    resolvePrice: (role) => ({
      materialName: `${role}-material`,
      unitPrice: 1000,
      packUnits: null,
      purchaseLabel: null,
      currency,
      resolvedMarket: "NG",
      priceSource: "test",
      scanSource: null,
      priceDate: "2026-11-05",
      isManualPrice: false,
      unpriced: false,
    }),
    resolveLabour: (task) => ({
      taskKey: task,
      method: "per-m2" as const,
      rate: 700,
      currency,
      outputPerWorkerDay: null,
      sourceReference: "test",
      effectiveDate: "2026-11-05",
    }),
  } as WallFinResolutionContext;
}

/** A 4 m × 3.5 m room, 3 m high, one door and one window on wall A. */
function spec(
  lengthM: number,
  widthM: number,
  heightM: number,
): WallFinProjectSpec {
  const openings = [
    {
      id: "d1",
      type: "door" as const,
      widthM: 0.9,
      heightM: 2.1,
      quantity: 1,
      revealDepthM: 0,
      deduct: true,
    },
    {
      id: "w1",
      type: "window" as const,
      widthM: 1.2,
      heightM: 1.2,
      quantity: 1,
      revealDepthM: 0,
      deduct: true,
    },
  ];
  const wall = (
    id: string,
    length: number,
    withOpenings: boolean,
  ): WallSpec => ({
    id,
    label: id,
    lengthM: length,
    heightM,
    surface: "interior",
    wallSystemId: "ng-sandcrete-block",
    assemblyId: "ng-interior-block-paint",
    openings: withOpenings ? openings : [],
    excludedAreaM2: 0,
  });
  return {
    name: "Equivalence room",
    countryCode: "NG",
    region: "Lagos",
    buildingType: "residential",
    rooms: [
      {
        id: "r1",
        name: "Living room",
        lengthM,
        widthM,
        heightM,
        isWetArea: false,
        walls: [
          wall("A", lengthM, true),
          wall("B", widthM, false),
          wall("C", lengthM, false),
          wall("D", widthM, false),
        ],
      },
    ],
    extraCosts: [],
    contingencyPercent: 0,
  };
}

/** Material purchase quantities keyed by layer, for an apples-to-apples diff. */
function purchases(
  result: Awaited<ReturnType<typeof estimateWallFinishingProject>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const room of result.rooms) {
    for (const wall of room.walls) {
      for (const layer of wall.layers) {
        const key = `${layer.layerTemplateId}`;
        out[key] = (out[key] ?? 0) + layer.purchaseQuantity;
      }
    }
  }
  return out;
}

const metric = { length: 4, width: 3.5, height: 3 };

describe("wall finishing: same room, either unit", () => {
  it("matches material quantities when the room is entered in feet", async () => {
    const ctx = priceContext();
    const inMetres = await estimateWallFinishingProject(
      spec(metric.length, metric.width, metric.height),
      ctx,
    );

    // The visitor types feet; the page converts once, exactly as the
    // WallFinishEstimator buildSpec does.
    const feet = {
      length: unitToMeters(13.1, "feet"),
      width: unitToMeters(11.5, "feet"),
      height: unitToMeters(9.8, "feet"),
    };
    const inFeet = await estimateWallFinishingProject(
      spec(feet.length, feet.width, feet.height),
      ctx,
    );

    expect(inMetres.ok).toBe(true);
    expect(inFeet.ok).toBe(true);

    // 13.1 / 11.5 / 9.8 ft are the displayed defaults for the 4 / 3.5 / 3 m
    // room, so areas agree within the rounding of one displayed decimal.
    const areaM = inMetres.rooms[0].walls.reduce((t, w) => t + w.netAreaM2, 0);
    const areaF = inFeet.rooms[0].walls.reduce((t, w) => t + w.netAreaM2, 0);
    expect(Math.abs(areaF - areaM) / areaM).toBeLessThan(0.02);

    const qm = purchases(inMetres);
    const qf = purchases(inFeet);
    for (const key of Object.keys(qm)) {
      expect(qf[key]).toBeDefined();
      // A purchase rounds up to whole packs, so allow one pack of drift.
      expect(Math.abs(qf[key] - qm[key])).toBeLessThanOrEqual(1);
    }
  });

  it("is not off by the feet-to-metres factor", async () => {
    const ctx = priceContext();
    const metres = await estimateWallFinishingProject(spec(4, 3.5, 3), ctx);
    const misreadAsMetres = await estimateWallFinishingProject(
      spec(13.1, 11.5, 9.8),
      ctx,
    );
    const areaM = metres.rooms[0].walls.reduce((t, w) => t + w.netAreaM2, 0);
    const areaWrong = misreadAsMetres.rooms[0].walls.reduce(
      (t, w) => t + w.netAreaM2,
      0,
    );
    // The page used to produce this 10x error for imperial visitors.
    expect(areaWrong / areaM).toBeGreaterThan(9);
  });
});

describe("finishes pages convert at the calculator boundary", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("wall finish converts entered dimensions before the engine runs", () => {
    const src = read("src/pages/WallFinishEstimator.tsx");
    expect(src).toContain("resolveMarketRoomUnit");
    expect(src).toMatch(/const L = unitToMeters\(n\(r\.lengthM\), unit\)/);
    expect(src).toContain("unitShortLabel(unit)");
  });

  it("tyrolene converts partition dimensions before the engine runs", () => {
    const src = read("src/pages/TyroleneEstimator.tsx");
    expect(src).toContain("resolveMarketRoomUnit");
    expect(src).toContain("width: unitToMeters(pt.width, dimUnit)");
    expect(src).toContain("height: unitToMeters(pt.height, dimUnit)");
  });

  it("keeps the feet constant honest", () => {
    expect(unitToMeters(1, "feet")).toBeCloseTo(FEET, 12);
    expect(unitToMeters(12, "feet")).toBeCloseTo(3.6576, 10);
  });
});

describe("tile sizes accept imperial input", () => {
  const src = readFileSync(
    join(process.cwd(), "src/pages/TileCalculator.tsx"),
    "utf8",
  );

  it("converts inches to the millimetres the engine uses", () => {
    expect(src).toContain(
      'const [sizeUnit, setSizeUnit] = useState<"mm" | "in">',
    );
    expect(src).toContain("Math.round(value * 25.4)");
    expect(src).toContain("Math.round((mm / 25.4) * 10) / 10");
  });

  it("shows the size in the visitor's unit in results and assumptions", () => {
    expect(src).toContain("tileSizeLabel");
    expect(src).not.toContain("${input.tileWidthMm}×${input.tileHeightMm}mm");
  });

  it("a 12 x 24 inch tile is a 305 x 610 mm tile", () => {
    const toMm = (inches: number) => Math.round(inches * 25.4);
    expect(toMm(12)).toBe(305);
    expect(toMm(24)).toBe(610);
    // and the same tile reads back as its inch label
    expect(Math.round((305 / 25.4) * 10) / 10).toBe(12);
    expect(Math.round((610 / 25.4) * 10) / 10).toBe(24);
  });
});

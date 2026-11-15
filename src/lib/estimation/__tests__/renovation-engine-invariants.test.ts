/**
 * Invariants for the renovation engine.
 *
 * The targeted tests prove named numbers. These prove the promises that have to
 * hold for every input a page, an import or a fuzzer can throw at it: no NaN, no
 * negative quantity, unique ids, net quantities with a stated buy figure, no
 * money, no tax rate, and the same answer every time.
 */
import { describe, expect, it } from "vitest";

import {
  DOOR_LEAF_WIDTH_M,
  FEET_TO_METRES,
  calculateRenovation,
  renovationScopeRegister,
  renovationTotalsByUnit,
  roomMetrics,
  type RenovationProjectInput,
  type RenovationRoomInput,
  type RenovationRoomUse,
} from "@/lib/estimation/renovation-engine";

const USES: RenovationRoomUse[] = [
  "living",
  "bedroom",
  "kitchen",
  "bathroom",
  "wc",
  "corridor",
  "stair",
  "balcony",
  "store",
  "other",
];
const SURFACES = [
  "smooth",
  "new_plaster",
  "screeded",
  "textured",
  "rough",
  "banana",
] as const;
const FINISHES = ["paint", "render", "tiles", "wallpaper", "none"] as const;

/** A small deterministic generator: same seed, same cases, every run. */
function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildProject(seed: number): RenovationProjectInput {
  const random = makeRandom(seed);
  const pick = <T>(rows: readonly T[]): T =>
    rows[Math.floor(random() * rows.length) % rows.length];
  const maybe = (chance: number) => random() < chance;
  const number = (min: number, max: number) =>
    Math.round((min + random() * (max - min)) * 10) / 10;

  const roomCount = 1 + Math.floor(random() * 4);
  const rooms: RenovationRoomInput[] = [];
  for (let i = 0; i < roomCount; i += 1) {
    rooms.push({
      id: maybe(0.1) ? "living" : `room-${i}`,
      use: pick(USES),
      length: number(1.5, 9),
      width: number(1.5, 9),
      height: number(2.1, 4),
      unit: maybe(0.3) ? "ft" : "m",
      doorCount: Math.floor(random() * 3),
      openingAreaM2: maybe(0.5) ? number(0.5, 4) : undefined,
      layout: maybe(0.3) ? "complex_diagonal" : "standard_residential",
      existing: {
        wallFinish: pick(FINISHES),
        floorFinish: pick(["tiles", "screed", "none"] as const),
        ceilingFinish: pick(["pop", "plasterboard", "none"] as const),
      },
      work: {
        stripOut: { wallFinish: maybe(0.4), floorFinish: maybe(0.4) },
        plaster: maybe(0.4) ? { patchesOnly: maybe(0.3) } : false,
        screed: maybe(0.3),
        tiling: maybe(0.5)
          ? ({
              floor: true,
              walls: maybe(0.5),
              tileWidthMm: 600,
              tileHeightMm: 300,
              tilesPerBox: 4,
              adhesiveCoverageM2PerBag: 4,
            } as const)
          : undefined,
        ceiling: maybe(0.3)
          ? { type: pick(["plasterboard", "pvc", "pop"] as const) }
          : false,
        paint: maybe(0.7)
          ? {
              walls: true,
              ceiling: maybe(0.6),
              coats: 1 + Math.floor(random() * 4),
              surface: maybe(0.5) ? (pick(SURFACES) as never) : undefined,
            }
          : false,
        electrical: maybe(0.5)
          ? { socketPoints: Math.floor(random() * 6) }
          : undefined,
        plumbing: maybe(0.3) ? { basinPoints: 1 } : undefined,
        joinery: maybe(0.3) ? { doors: 1, windows: 1 } : undefined,
        demolishPartitions: maybe(0.2) ? { areaM2: number(1, 8) } : undefined,
      },
    });
  }

  return {
    marketCode: maybe(0.1) ? "zz" : "NG",
    currencyCode: maybe(0.2) ? "ngn" : "NGN",
    yearBuilt: maybe(0.3) ? 1985 : 2015,
    occupied: maybe(0.5),
    floorLevel: Math.floor(random() * 4),
    approvals: { required: maybe(0.5) },
    contingencyPercent: maybe(0.5) ? number(0, 30) : undefined,
    debrisContainerM3: maybe(0.5) ? 6 : undefined,
    defaults: { coverageM2PerLitre: 10, plasterThicknessMm: 13 },
    rooms,
  };
}

const PROJECTS = Array.from({ length: 60 }, (_, index) =>
  buildProject(index + 1),
);

describe("renovation engine invariants", () => {
  it("never returns a NaN, an infinity or a negative quantity", () => {
    for (const project of PROJECTS) {
      const result = calculateRenovation(project);
      for (const row of result.lines) {
        if (row.quantity !== null) {
          expect(Number.isFinite(row.quantity)).toBe(true);
          expect(row.quantity).toBeGreaterThanOrEqual(0);
        }
        if (row.quantityWithWaste !== null) {
          expect(Number.isFinite(row.quantityWithWaste)).toBe(true);
          expect(row.quantityWithWaste).toBeGreaterThanOrEqual(
            row.quantity ?? 0,
          );
        }
        expect(row.wastePercent).toBeGreaterThanOrEqual(0);
        expect(row.basis.length).toBeGreaterThan(0);
        expect(row.description.length).toBeGreaterThan(0);
      }
      expect(Number.isFinite(result.debris.inPlaceVolumeM3)).toBe(true);
      expect(Number.isFinite(result.debris.looseVolumeM3)).toBe(true);
      expect(result.debris.looseVolumeM3).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps every line id unique, even when room ids repeat", () => {
    for (const project of PROJECTS) {
      const ids = calculateRenovation(project).lines.map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("states a buy figure that matches net plus its own waste percentage", () => {
    for (const project of PROJECTS) {
      for (const row of calculateRenovation(project).lines) {
        if (row.quantity === null || row.quantityWithWaste === null) continue;
        const stated = row.quantity * (1 + row.wastePercent / 100);
        // The buy figure is derived from the exact quantity while the net
        // figure is rounded for display, so the two can differ by up to half a
        // display step (litres are shown to a tenth) plus one percent.
        expect(Math.abs(row.quantityWithWaste - stated)).toBeLessThanOrEqual(
          // Half a display step (0.05 for litres) carried through the waste
          // factor is 0.055, so 0.06 is the honest floor.
          Math.max(0.06, stated * 0.01),
        );
      }
    }
  });

  it("carries no money and no tax rate anywhere in the result", () => {
    for (const project of PROJECTS) {
      const result = calculateRenovation(project);
      const text = JSON.stringify(result);
      expect(text).not.toMatch(/"(price|rate|amount|total|net|gross)"\s*:/);
      expect(text).not.toMatch(/taxRate|vatRate|gstRate|taxPercent/i);
      for (const row of result.lines) {
        expect([
          "labour",
          "material",
          "plant",
          "preliminaries",
          "statutory",
          "allowance",
        ]).toContain(row.costClass);
        expect([
          "works",
          "materials",
          "statutory",
          "zero_rated",
          "exempt",
        ]).toContain(row.taxClass);
      }
      expect(result.currencyCode ?? "").toMatch(/^[A-Z]{3}$|^$/);
    }
  });

  it("gives the same answer twice", () => {
    for (const project of PROJECTS.slice(0, 20)) {
      expect(calculateRenovation(project)).toEqual(
        calculateRenovation(project),
      );
    }
  });

  it("totals agree with the lines they came from", () => {
    for (const project of PROJECTS.slice(0, 20)) {
      const result = calculateRenovation(project);
      const net = renovationTotalsByUnit(result);
      for (const bucket of net) {
        const sum = result.lines
          .filter((row) => row.unit === bucket.unit && row.quantity !== null)
          .reduce((total, row) => total + (row.quantity ?? 0), 0);
        expect(bucket.quantity).toBeCloseTo(sum, 1);
      }
      const withWaste = renovationTotalsByUnit(result, "metric", {
        includeWaste: true,
      });
      expect(withWaste.length).toBeGreaterThan(0);
    }
  });

  it("exports rows no spreadsheet would execute", () => {
    for (const project of PROJECTS.slice(0, 20)) {
      const register = renovationScopeRegister(calculateRenovation(project), {
        system: "imperial",
      });
      for (const row of register) {
        expect(row.description).not.toMatch(/^[=+\-@\t\r]/);
        expect(row.basis).not.toMatch(/^[=+\-@\t\r]/);
        expect(row.room).not.toMatch(/^[=+\-@\t\r]/);
        expect(row.tradeLabel.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("geometry crosses systems without drift", () => {
  it("matches the formulae in metres and in feet", () => {
    const random = makeRandom(99);
    for (let i = 0; i < 40; i += 1) {
      const length = 2 + random() * 8;
      const width = 2 + random() * 8;
      const height = 2.2 + random() * 1.8;
      const doors = Math.floor(random() * 3);

      const metric = roomMetrics({
        id: `m-${i}`,
        use: "living",
        length,
        width,
        height,
        doorCount: doors,
      });
      const imperial = roomMetrics({
        id: `f-${i}`,
        use: "living",
        length: length / FEET_TO_METRES,
        width: width / FEET_TO_METRES,
        height: height / FEET_TO_METRES,
        doorCount: doors,
        unit: "ft",
      });

      expect(metric.floorAreaM2).toBeCloseTo(length * width, 1);
      expect(metric.wallAreaGrossM2).toBeCloseTo(
        2 * (length + width) * height,
        1,
      );
      expect(metric.skirtingLengthM).toBeCloseTo(
        Math.max(0, 2 * (length + width) - doors * DOOR_LEAF_WIDTH_M),
        1,
      );
      // The same room in feet measures the same in metres, to a millimetre.
      expect(imperial.floorAreaM2).toBeCloseTo(metric.floorAreaM2, 2);
      expect(imperial.wallAreaGrossM2).toBeCloseTo(metric.wallAreaGrossM2, 2);
      expect(imperial.skirtingLengthM).toBeCloseTo(metric.skirtingLengthM, 2);
      expect(imperial.unit).toBe("ft");
    }
  });

  it("survives zero, negative and absurd dimensions without inventing numbers", () => {
    const cases: Array<Partial<RenovationRoomInput>> = [
      { length: 0, width: 0, height: 0 },
      { length: -3, width: -3, height: -3 },
      { length: Number.NaN, width: Number.NaN, height: Number.NaN },
      { length: Number.POSITIVE_INFINITY, width: 4, height: 2.4 },
      { length: 1e6, width: 1e6, height: 1e6 },
      { length: 0.001, width: 0.001, height: 0.001 },
    ];
    for (const [index, dimensions] of cases.entries()) {
      const result = calculateRenovation({
        marketCode: "NG",
        approvals: { required: false },
        rooms: [
          {
            id: `edge-${index}`,
            use: "living",
            length: 4,
            width: 3,
            height: 2.4,
            ...dimensions,
            work: { paint: { walls: true } },
          },
        ],
      });
      for (const row of result.lines) {
        if (row.quantity === null) continue;
        expect(Number.isFinite(row.quantity)).toBe(true);
        expect(row.quantity).toBeGreaterThanOrEqual(0);
      }
      const broken =
        (dimensions.length ?? 0) <= 0 || !Number.isFinite(dimensions.length);
      if (broken) {
        expect(result.readiness.status).toBe("incomplete");
        expect(result.readiness.blockers.length).toBeGreaterThan(0);
      }
    }
  });
});

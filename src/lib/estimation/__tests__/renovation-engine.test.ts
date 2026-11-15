import { describe, expect, it } from "vitest";
import {
  ACCESS_FACTOR_BOUNDS,
  DEFAULT_PLASTER_THICKNESS_MM,
  DOOR_LEAF_WIDTH_M,
  FEET_TO_METRES,
  PAINT_WASTAGE_BOUNDS,
  PAINT_WASTAGE_PERCENT,
  calculateRenovation,
  renovationLabourFactor,
  renovationScopeRegister,
  roomMetrics,
  type RenovationProjectInput,
} from "@/lib/estimation/renovation-engine";
import {
  MORTAR_DRY_VOLUME_FACTOR,
  resolveLayoutWastePercent,
  resolvePaintSurfaceFactor,
} from "@/lib/estimation/site-conditions";
import {
  RENOVATION_TRADE_LABELS,
  RENOVATION_TRADE_ORDER,
  convertRenovationQuantity,
  renovationTotalsByUnit,
  groupRenovationByTrade,
  resolveRenovationPaintSurface,
} from "@/lib/estimation/renovation-engine";

/** A plain 4 m by 5 m room, 2.4 m high, with 2 m2 of openings and one door. */
function baseRoom(
  overrides: Partial<RenovationProjectInput["rooms"][number]> = {},
) {
  return {
    id: "living",
    use: "living" as const,
    length: 4,
    width: 5,
    height: 2.4,
    openingAreaM2: 2,
    doorCount: 1,
    ...overrides,
  };
}

function baseProject(
  overrides: Partial<RenovationProjectInput> = {},
): RenovationProjectInput {
  return {
    marketCode: "NG",
    rooms: [baseRoom()],
    ...overrides,
  };
}

function findLine(result: ReturnType<typeof calculateRenovation>, id: string) {
  const found = result.lines.find((row) => row.id === id);
  if (!found) throw new Error(`missing line ${id}`);
  return found;
}

describe("room geometry", () => {
  it("derives areas, perimeter and skirting from the dimensions", () => {
    const metrics = roomMetrics(baseRoom());
    expect(metrics.floorAreaM2).toBe(20);
    expect(metrics.perimeterM).toBe(18);
    expect(metrics.wallAreaGrossM2).toBe(43.2);
    expect(metrics.wallAreaNetM2).toBe(41.2);
    expect(metrics.ceilingAreaM2).toBe(20);
    expect(metrics.skirtingLengthM).toBe(18 - DOOR_LEAF_WIDTH_M);
  });

  it("converts feet to metres before measuring", () => {
    const metrics = roomMetrics(
      baseRoom({ unit: "ft", length: 10, width: 10, height: 8 }),
    );
    expect(metrics.floorAreaM2).toBe(Math.round(3.048 * 3.048 * 1000) / 1000);
    expect(metrics.wallAreaGrossM2).toBe(
      Math.round(2 * (3.048 + 3.048) * (8 * FEET_TO_METRES) * 1000) / 1000,
    );
  });

  it("caps openings at the wall area instead of producing a negative wall", () => {
    const metrics = roomMetrics(baseRoom({ openingAreaM2: 999 }));
    expect(metrics.wallAreaNetM2).toBe(0);
    expect(metrics.openingAreaM2).toBe(metrics.wallAreaGrossM2);
  });
});

describe("paint", () => {
  it("measures area in application metres and litres from the stated coverage", () => {
    const result = calculateRenovation(
      baseProject({
        defaults: { coverageM2PerLitre: 10 },
        rooms: [baseRoom({ work: { paint: { walls: true, coats: 2 } } })],
      }),
    );
    const area = findLine(result, "living-paint-walls");
    expect(area.quantity).toBe(82.4); // 41.2 m2 x 2 coats
    expect(area.unit).toBe("m2");

    const litres = findLine(result, "living-paint-walls-litres");
    // Quantities are net; the loss is stated as waste and repeated alongside.
    expect(litres.quantity).toBeCloseTo(Math.round((82.4 / 10) * 10) / 10, 1);
    expect(litres.wastePercent).toBe(PAINT_WASTAGE_PERCENT);
    expect(litres.quantityWithWaste).toBeCloseTo(8.24 * 1.1, 2);
    expect(litres.unit).toBe("L");
  });

  it("charges more paint for fresh plaster than for a repaint", () => {
    const fresh = calculateRenovation(
      baseProject({
        defaults: { coverageM2PerLitre: 10 },
        rooms: [
          baseRoom({
            work: { paint: { walls: true, surface: "new_plaster" } },
          }),
        ],
      }),
    );
    const repaint = calculateRenovation(
      baseProject({
        defaults: { coverageM2PerLitre: 10 },
        rooms: [
          baseRoom({ work: { paint: { walls: true, surface: "smooth" } } }),
        ],
      }),
    );
    const freshLitres =
      findLine(fresh, "living-paint-walls-litres").quantity ?? 0;
    const repaintLitres =
      findLine(repaint, "living-paint-walls-litres").quantity ?? 0;
    expect(freshLitres).toBeGreaterThan(repaintLitres);
    // Litres move inversely to coverage: bare plaster covers 0.75 of the
    // sealed rate, so it needs 1.15 / 0.75 times the paint.
    expect(freshLitres / repaintLitres).toBeCloseTo(
      resolvePaintSurfaceFactor("smooth") /
        resolvePaintSurfaceFactor("new_plaster"),
      1,
    );
  });

  it("refuses to invent litres when coverage is unknown", () => {
    const result = calculateRenovation(
      baseProject({ rooms: [baseRoom({ work: { paint: true } })] }),
    );
    expect(result.lines.some((row) => row.unit === "L")).toBe(false);
    expect(result.readiness.status).toBe("incomplete");
    expect(result.readiness.blockers.join(" ")).toMatch(/coverage/i);
    expect(result.warnings.join(" ")).toMatch(
      /paint coverage was not configured/i,
    );
  });

  it("keeps the paint waste inside its stated bounds", () => {
    expect(PAINT_WASTAGE_PERCENT).toBeGreaterThanOrEqual(
      PAINT_WASTAGE_BOUNDS.min,
    );
    expect(PAINT_WASTAGE_PERCENT).toBeLessThanOrEqual(PAINT_WASTAGE_BOUNDS.max);
  });
});

describe("tiling", () => {
  it("adds the layout waste for the stated complexity", () => {
    const result = calculateRenovation(
      baseProject({
        rooms: [
          baseRoom({
            layout: "complex_diagonal",
            work: { tiling: { floor: true } },
          }),
        ],
      }),
    );
    const waste = resolveLayoutWastePercent("complex_diagonal");
    expect(waste).toBe(14);
    const row = findLine(result, "living-tile-floor");
    expect(row.quantity).toBe(20); // measured net
    expect(row.wastePercent).toBe(waste);
    expect(row.quantityWithWaste).toBe(22.8); // 20 m2 x 1.14
    expect(row.basis).toMatch(/buy 22\.8 m2/);
  });

  it("rounds tiles and boxes up once from the area to buy", () => {
    const result = calculateRenovation(
      baseProject({
        rooms: [
          baseRoom({
            work: {
              tiling: {
                floor: true,
                tileWidthMm: 600,
                tileHeightMm: 600,
                tilesPerBox: 4,
              },
            },
          }),
        ],
      }),
    );
    const area = findLine(result, "living-tile-floor").quantityWithWaste ?? 0;
    const tileArea = 0.6 * 0.6;
    const tiles = findLine(result, "living-tile-floor-count").quantity ?? 0;
    const boxes = findLine(result, "living-tile-floor-boxes").quantity ?? 0;
    expect(tiles).toBe(Math.ceil(area / tileArea));
    expect(boxes).toBe(Math.ceil(tiles / 4));
  });

  it("warns instead of guessing when the tile size is missing", () => {
    const result = calculateRenovation(
      baseProject({ rooms: [baseRoom({ work: { tiling: { floor: true } } })] }),
    );
    expect(result.lines.some((row) => row.unit === "box")).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/tile size was not given/i);
  });
});

describe("strip out and waste", () => {
  it("measures arisings, applies bulking and converts to container loads", () => {
    const result = calculateRenovation(
      baseProject({
        debrisContainerM3: 8,
        rooms: [
          baseRoom({
            existing: { floorFinish: "tiles", wallFinish: "tiles" },
            work: { stripOut: { floorFinish: true, wallFinish: true } },
          }),
        ],
      }),
    );
    // Floor 20 m2 x 12 mm plus wall 41.2 m2 x 12 mm.
    expect(result.debris.inPlaceVolumeM3).toBeCloseTo(0.7344, 3);
    expect(result.debris.bulkingFactor).toBeCloseTo(1.35, 2);
    expect(result.debris.looseVolumeM3).toBeCloseTo(0.9914, 3);
    const containers = findLine(result, "project-waste-containers");
    expect(containers.quantity).toBe(
      Math.ceil(result.debris.looseVolumeM3 / (8 * 0.85)),
    );
  });

  it("warns when no container capacity is stated", () => {
    const result = calculateRenovation(
      baseProject({
        rooms: [
          baseRoom({
            existing: { floorFinish: "tiles" },
            work: { stripOut: { floorFinish: true } },
          }),
        ],
      }),
    );
    expect(findLine(result, "project-strip-out-arisings").unit).toBe("m3");
    expect(result.warnings.join(" ")).toMatch(/container capacity/i);
  });

  it("flags asbestos before strip out in an older building", () => {
    const result = calculateRenovation(
      baseProject({
        yearBuilt: 1985,
        rooms: [
          baseRoom({
            existing: { ceilingFinish: "pop" },
            work: { stripOut: { ceiling: true } },
          }),
        ],
      }),
    );
    expect(result.flags).toContain("asbestos_survey_before_strip_out");
    expect(result.assumptions.join(" ")).toMatch(/asbestos survey/i);
  });

  it("does not raise the asbestos flag for a recent building", () => {
    const result = calculateRenovation(
      baseProject({
        yearBuilt: 2018,
        rooms: [
          baseRoom({
            existing: { ceilingFinish: "pop" },
            work: { stripOut: { ceiling: true } },
          }),
        ],
      }),
    );
    expect(result.flags).not.toContain("asbestos_survey_before_strip_out");
  });
});

describe("wet trades", () => {
  it("applies the shared dry volume factor and expands the mix", () => {
    const result = calculateRenovation(
      baseProject({ rooms: [baseRoom({ work: { plaster: true } })] }),
    );
    const area = findLine(result, "living-plaster").quantity ?? 0;
    const wet = area * (DEFAULT_PLASTER_THICKNESS_MM / 1000);
    const dry = wet * MORTAR_DRY_VOLUME_FACTOR;
    const mortar = findLine(result, "living-plaster-mortar");
    expect(mortar.quantity).toBeCloseTo(Math.round(dry * 1000) / 1000, 2);

    const bags = findLine(result, "living-plaster-concrete-mix").quantity ?? 0;
    const expectedBags = (dry * (1 / 5)) / (50 / 1440);
    expect(bags).toBeCloseTo(Math.round(expectedBags * 1000) / 1000, 2);
    expect(findLine(result, "living-plaster-concrete-mix").unit).toBe(
      "50 kg bag",
    );
    expect(findLine(result, "living-plaster-sand").quantity).toBeCloseTo(
      Math.round(dry * (4 / 5) * 1000) / 1000,
      2,
    );
  });

  it("marks making good as a convention, not a measurement", () => {
    const result = calculateRenovation(
      baseProject({
        rooms: [
          baseRoom({
            existing: { wallFinish: "tiles" },
            work: { stripOut: { wallFinish: true } },
          }),
        ],
      }),
    );
    const makeGood = findLine(result, "living-make-good");
    expect(makeGood.provenance).toBe("derived_convention");
    expect(makeGood.flags).toContain("verify_patch_extent_on_site");
  });

  it("uses the room's own thickness override for screed", () => {
    const result = calculateRenovation(
      baseProject({
        rooms: [baseRoom({ work: { screed: { thicknessMm: 75 } } })],
      }),
    );
    const volume = findLine(result, "living-screed-volume").quantity ?? 0;
    expect(volume).toBeCloseTo(
      Math.round(20 * 0.075 * MORTAR_DRY_VOLUME_FACTOR * 1000) / 1000,
      2,
    );
  });
});

describe("occupancy and access", () => {
  it("adds documented penalties and stays inside the clamp", () => {
    const factor = renovationLabourFactor({
      occupied: true,
      floorLevel: 5,
      liftAvailable: false,
    });
    expect(factor.factor).toBe(1.3);
    expect(factor.factor).toBeGreaterThanOrEqual(ACCESS_FACTOR_BOUNDS.min);
    expect(factor.factor).toBeLessThanOrEqual(ACCESS_FACTOR_BOUNDS.max);
    expect(factor.reasons.length).toBe(3);
  });

  it("adds no penalty when the property is empty and work is at ground level", () => {
    const factor = renovationLabourFactor({
      occupied: false,
      floorLevel: 0,
      liftAvailable: false,
    });
    expect(factor.factor).toBe(1);
    expect(factor.unknowns).toEqual([]);
  });

  it("records that occupancy was not stated rather than assuming it", () => {
    const factor = renovationLabourFactor({});
    expect(factor.factor).toBe(1);
    expect(factor.unknowns.join(" ")).toMatch(/occupancy was not stated/i);
  });

  it("adds protection only for occupied work, and says where the area came from", () => {
    const occupied = calculateRenovation(
      baseProject({
        occupied: true,
        rooms: [baseRoom({ work: { paint: true } })],
        defaults: { coverageM2PerLitre: 10 },
      }),
    );
    const protection = findLine(occupied, "project-protection");
    expect(protection.quantity).toBe(20);
    expect(protection.provenance).toBe("derived_convention");

    const empty = calculateRenovation(baseProject({ occupied: false }));
    expect(empty.lines.some((row) => row.id === "project-protection")).toBe(
      false,
    );
  });
});

describe("allowances and readiness", () => {
  it("never prices an approval, only flags it", () => {
    const result = calculateRenovation(
      baseProject({ approvals: { required: true } }),
    );
    const approvals = findLine(result, "project-approvals");
    expect(approvals.quantity).toBe(1);
    expect(approvals.provenance).toBe("unverified_allowance");
    expect(approvals.flags).toContain("verify_fee_with_authority");
  });

  it("blocks when the approval requirement is unstated", () => {
    const result = calculateRenovation(baseProject());
    expect(result.readiness.blockers.join(" ")).toMatch(
      /approval requirement/i,
    );
  });

  it("carries contingency only when the user sets it", () => {
    const withContingency = calculateRenovation(
      baseProject({
        approvals: { required: false },
        contingencyPercent: 10,
        defaults: { coverageM2PerLitre: 10 },
        rooms: [baseRoom({ work: { paint: true } })],
      }),
    );
    const line = findLine(withContingency, "project-contingency");
    expect(line.quantity).toBe(10);
    expect(line.unit).toBe("%");

    const without = calculateRenovation(
      baseProject({ approvals: { required: false } }),
    );
    expect(without.lines.some((row) => row.id === "project-contingency")).toBe(
      false,
    );
    expect(without.warnings.join(" ")).toMatch(/no contingency has been set/i);
  });

  it("reports an empty project as incomplete rather than as zero cost", () => {
    const result = calculateRenovation({ marketCode: "NG", rooms: [] });
    expect(result.readiness.status).toBe("incomplete");
    expect(result.readiness.blockers.join(" ")).toMatch(/no rooms/i);
    expect(result.lines).toEqual([]);
  });

  it("blocks a room with no measurable dimensions", () => {
    const result = calculateRenovation(
      baseProject({ rooms: [baseRoom({ length: 0 })] }),
    );
    expect(result.readiness.status).toBe("incomplete");
    expect(result.readiness.blockers.join(" ")).toMatch(/cannot be zero/i);
  });

  it("names a two letter market as required", () => {
    const result = calculateRenovation({ marketCode: "", rooms: [] });
    expect(result.readiness.blockers.join(" ")).toMatch(/market code/i);
  });
});

describe("honesty of the output", () => {
  const fullProject: RenovationProjectInput = {
    marketCode: "NG",
    currencyCode: "NGN",
    occupied: true,
    floorLevel: 2,
    approvals: { required: true, note: "structural opening" },
    yearBuilt: 1998,
    contingencyPercent: 10,
    debrisContainerM3: 8,
    defaults: {
      coverageM2PerLitre: 10,
      tileWidthMm: 600,
      tileHeightMm: 600,
      tilesPerBox: 4,
      adhesiveCoverageM2PerBag: 5,
    },
    rooms: [
      baseRoom({
        existing: {
          wallFinish: "tiles",
          floorFinish: "tiles",
          ceilingFinish: "pop",
          wallCondition: "new_plaster",
        },
        work: {
          stripOut: { wallFinish: true, floorFinish: true, ceiling: true },
          plaster: true,
          screed: true,
          tiling: { floor: true, walls: true, skirting: true },
          paint: { walls: true, ceiling: true, coats: 2 },
          ceiling: { type: "plasterboard" },
          joinery: { doors: 2, wardrobeRunM: 3 },
          electrical: { lightPoints: 4, socketPoints: 6, switchPoints: 2 },
          plumbing: { basinPoints: 1, wcPoints: 1 },
        },
      }),
      baseRoom({
        id: "kitchen",
        use: "kitchen",
        length: 3,
        width: 3.5,
        height: 2.4,
        doorCount: 1,
        existing: { floorFinish: "vinyl", wallFinish: "paint" },
        work: {
          stripOut: { floorFinish: true },
          paint: true,
          joinery: { kitchenRunM: 4 },
          electrical: { socketPoints: 4 },
          plumbing: { sinkPoints: 1 },
        },
      }),
    ],
  };

  it("contains no money fields anywhere in the result", () => {
    const result = calculateRenovation(fullProject);
    const forbidden =
      /^(price|unitPrice|rate|amount|total|subtotal|cost|taxAmount|gross)/i;
    const seen: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (value === null || typeof value !== "object") return;
      for (const [key, child] of Object.entries(
        value as Record<string, unknown>,
      )) {
        const next = `${path}.${key}`;
        if (forbidden.test(key) && key !== "costClass") {
          // quantitiesByUnit totals are unit sums, not money.
          if (!path.endsWith(".quantitiesByUnit")) seen.push(next);
        }
        walk(child, next);
      }
    };
    walk(result, "result");
    expect(seen).toEqual([]);
  });

  it("classifies every line for tax without ever stating a rate", () => {
    const result = calculateRenovation(fullProject);
    expect(result.lines.length).toBeGreaterThan(20);
    for (const row of result.lines) {
      expect([
        "works",
        "materials",
        "professional_fees",
        "statutory",
      ]).toContain(row.taxClass);
      expect(row).not.toHaveProperty("taxAmount");
      expect(row).not.toHaveProperty("taxRate");
      expect(row.unit).not.toMatch(/currency|NGN|USD|GBP/);
    }
    expect(result.currencyCode).toBe("NGN");
  });

  it("gives every line a basis string a surveyor can read", () => {
    const result = calculateRenovation(fullProject);
    for (const row of result.lines) {
      expect(row.basis.length).toBeGreaterThan(10);
      expect(row.description.length).toBeGreaterThan(3);
    }
  });

  it("is deterministic across runs", () => {
    const first = calculateRenovation(fullProject);
    const second = calculateRenovation(fullProject);
    expect(second).toEqual(first);
  });

  it("exports a quantities only register", () => {
    const result = calculateRenovation(fullProject);
    const register = renovationScopeRegister(result);
    expect(register).toHaveLength(result.lines.length);
    for (const row of register) {
      expect(Object.keys(row).sort()).toEqual(
        [
          "basis",
          "description",
          "provenance",
          "quantity",
          "quantityWithWaste",
          "room",
          "trade",
          "tradeLabel",
          "unit",
          "wastePercent",
        ].sort(),
      );
    }
  });

  it("reaches complete_for_pricing only when nothing is blocked or warned", () => {
    const clean = calculateRenovation({
      marketCode: "NG",
      occupied: true,
      approvals: { required: false },
      contingencyPercent: 10,
      defaults: { coverageM2PerLitre: 10 },
      rooms: [baseRoom({ work: { paint: true } })],
    });
    expect(clean.readiness.status).toBe("complete_for_pricing");
    expect(clean.readiness.blockers).toEqual([]);
    expect(clean.warnings).toEqual([]);
  });

  it("flags a wet area whose waterproofing has not been measured", () => {
    const result = calculateRenovation(
      baseProject({
        defaults: { coverageM2PerLitre: 10 },
        rooms: [
          baseRoom({
            id: "bath",
            use: "bathroom",
            existing: { floorFinish: "tiles" },
            work: {
              tiling: { floor: true, walls: true },
              plumbing: { showerPoints: 1 },
            },
          }),
        ],
      }),
    );
    expect(result.flags).toContain("wet_area_waterproofing_unmeasured");
  });

  it("sums quantities by unit without mixing units", () => {
    const result = calculateRenovation(fullProject);
    const m2 = result.lines
      .filter((row) => row.unit === "m2")
      .reduce((sum, row) => sum + (row.quantity ?? 0), 0);
    expect(result.quantitiesByUnit.m2).toBeCloseTo(
      Math.round(m2 * 1000) / 1000,
      2,
    );
    expect(Object.keys(result.quantitiesByUnit)).not.toContain("NGN");
  });
});

describe("trade grouping", () => {
  it("orders trades conventionally and never averages different units", () => {
    const result = calculateRenovation({
      marketCode: "NG",
      approvals: { required: false },
      contingencyPercent: 5,
      defaults: {
        coverageM2PerLitre: 10,
        tileWidthMm: 600,
        tileHeightMm: 600,
        tilesPerBox: 4,
      },
      rooms: [
        baseRoom({
          existing: { floorFinish: "tiles" },
          work: {
            stripOut: { floorFinish: true },
            tiling: { floor: true },
            paint: true,
          },
        }),
      ],
    });
    const groups = groupRenovationByTrade(result);
    const order = groups.map((group) => group.trade);
    expect(order[0]).toBe("preliminaries");
    expect(order).toContain("strip_out");
    expect(order.indexOf("strip_out")).toBeLessThan(order.indexOf("tiling"));
    expect(order.indexOf("tiling")).toBeLessThan(order.indexOf("painting"));
    expect(order[order.length - 1]).toBe("contingency");

    const tiling = groups.find((group) => group.trade === "tiling");
    const units = tiling?.quantities.map((row) => row.unit) ?? [];
    expect(new Set(units).size).toBe(units.length);

    const totalItems = groups.reduce((sum, group) => sum + group.itemCount, 0);
    expect(totalItems).toBe(result.lines.length);
    for (const trade of order) {
      expect(RENOVATION_TRADE_ORDER).toContain(trade);
    }
  });
});

describe("paint surface resolution", () => {
  it("maps the old porosity names onto the shared surface table", () => {
    expect(resolveRenovationPaintSurface("raw_plaster")).toMatchObject({
      key: "new_plaster",
      factor: 0.75,
      recognised: true,
    });
    expect(resolveRenovationPaintSurface("repaint")).toMatchObject({
      key: "smooth",
      factor: 1.15,
      recognised: true,
    });
    expect(resolveRenovationPaintSurface(null)).toMatchObject({
      key: null,
      factor: 1,
      recognised: true,
    });
  });

  it("reports an unknown surface instead of silently assuming one", () => {
    const unknown = resolveRenovationPaintSurface("glitter");
    expect(unknown.recognised).toBe(false);
    expect(unknown.factor).toBe(1);

    const result = calculateRenovation({
      marketCode: "NG",
      approvals: { required: false },
      defaults: { coverageM2PerLitre: 10 },
      rooms: [
        baseRoom({
          // Deliberately outside the union: a form or import can send anything.
          work: { paint: { walls: true, surface: "glitter" as never } },
        }),
      ],
    });
    expect(result.warnings.join(" ")).toMatch(/is not a known surface/i);
  });
});

describe("global input handling", () => {
  it("converts an imperial opening area instead of treating it as square metres", () => {
    // 10 ft x 10 ft room, 8 ft high, 20 sq ft of openings entered in sq ft.
    const metrics = roomMetrics({
      id: "us-room",
      use: "living",
      length: 10,
      width: 10,
      height: 8,
      unit: "ft",
      openingArea: 20,
    });
    const openingM2 = 20 * FEET_TO_METRES * FEET_TO_METRES;
    expect(metrics.openingAreaM2).toBeCloseTo(openingM2, 3);
    expect(metrics.wallAreaNetM2).toBeCloseTo(
      metrics.wallAreaGrossM2 - openingM2,
      2,
    );
  });

  it("still reads a legacy opening area stated in square metres", () => {
    const metrics = roomMetrics({
      id: "us-room",
      use: "living",
      length: 10,
      width: 10,
      height: 8,
      unit: "ft",
      openingAreaM2: 2,
    });
    expect(metrics.openingAreaM2).toBe(2);
  });

  it("keeps line ids unique when a room id is repeated", () => {
    const result = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [
          baseRoom({ work: { paint: { walls: true } } }),
          baseRoom({ work: { paint: { walls: true } } }),
        ],
      }),
    );
    const ids = result.lines.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith("living#2-"))).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/used more than once/i);
  });

  it("warns when the market is not in the registry but still measures", () => {
    const unknown = calculateRenovation(
      baseProject({ marketCode: "zz", approvals: { required: false } }),
    );
    expect(unknown.marketCode).toBe("ZZ");
    expect(unknown.warnings.join(" ")).toMatch(
      /not in the FRELUX market registry/i,
    );
    expect(unknown.flags).toContain("market_not_in_registry");

    const known = calculateRenovation(
      baseProject({ marketCode: "ng", approvals: { required: false } }),
    );
    expect(known.warnings.join(" ")).not.toMatch(/market registry/i);
  });

  it("normalises currency and rejects a non ISO code honestly", () => {
    const good = calculateRenovation(
      baseProject({ currencyCode: "ngn", approvals: { required: false } }),
    );
    expect(good.currencyCode).toBe("NGN");
    expect(good.warnings.join(" ")).not.toMatch(/ISO 4217/i);

    const bad = calculateRenovation(
      baseProject({ currencyCode: "Naira", approvals: { required: false } }),
    );
    expect(bad.warnings.join(" ")).toMatch(/ISO 4217/i);
  });
});

describe("making good is not one thing", () => {
  it("renders behind hacked tiles but only prepares a stripped painted wall", () => {
    const tiles = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [
          baseRoom({
            existing: { wallFinish: "tiles" },
            work: { stripOut: { wallFinish: true } },
          }),
        ],
      }),
    );
    expect(
      tiles.lines.some((row) => row.id === "living-make-good-mortar"),
    ).toBe(true);
    expect(tiles.lines.some((row) => row.id === "living-make-good-prep")).toBe(
      false,
    );

    const painted = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [
          baseRoom({
            existing: { wallFinish: "paint" },
            work: { stripOut: { wallFinish: true } },
          }),
        ],
      }),
    );
    expect(
      painted.lines.some((row) => row.id === "living-make-good-prep"),
    ).toBe(true);
    expect(
      painted.lines.some((row) => row.id === "living-make-good-mortar"),
    ).toBe(false);
    expect(
      painted.lines.some((row) => row.id === "living-make-good-concrete-mix"),
    ).toBe(false);
  });
});

describe("tiles, partitions and windows", () => {
  it("buys adhesive for the area actually bought, waste included", () => {
    const result = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [
          baseRoom({
            work: {
              tiling: { floor: true, adhesiveCoverageM2PerBag: 5 },
            },
          }),
        ],
      }),
    );
    const area = findLine(result, "living-tile-floor").quantityWithWaste ?? 0;
    const bags = findLine(result, "living-tile-floor-adhesive").quantity ?? 0;
    expect(bags).toBe(Math.ceil(area / 5));
    expect(bags).toBe(5); // 22 m2 bought at 5 m2 per bag
  });

  it("adds partition debris and asks for the structural check", () => {
    const result = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [
          baseRoom({
            work: { demolishPartitions: { areaM2: 6, thicknessMm: 100 } },
          }),
        ],
      }),
    );
    const row = findLine(result, "living-partition-removal");
    expect(row.quantity).toBe(6);
    expect(row.flags).toContain("confirm_partition_is_non_loadbearing");
    expect(result.debris.inPlaceVolumeM3).toBeCloseTo(0.6, 3);
    expect(result.warnings.join(" ")).toMatch(/non load bearing/i);
  });

  it("counts window replacements", () => {
    const result = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [baseRoom({ work: { joinery: { windows: 2 } } })],
      }),
    );
    const row = findLine(result, "living-joinery-windows");
    expect(row.quantity).toBe(2);
    expect(row.flags).toContain("verify_window_schedule");
  });

  it("says that patching after first fix is not measured", () => {
    const result = calculateRenovation(
      baseProject({
        approvals: { required: false },
        rooms: [baseRoom({ work: { electrical: { socketPoints: 4 } } })],
      }),
    );
    expect(result.flags).toContain("service_chases_patching_not_measured");
    expect(result.assumptions.join(" ")).toMatch(/not measured/i);
  });
});

describe("paint surface follows the work, not the old wall", () => {
  it("prices freshly plastered walls at the bare plaster rate", () => {
    const painted = (surface?: "smooth") =>
      calculateRenovation(
        baseProject({
          approvals: { required: false },
          defaults: { coverageM2PerLitre: 10 },
          rooms: [
            baseRoom({
              existing: { wallFinish: "tiles" },
              work: {
                stripOut: { wallFinish: true },
                paint: surface ? { walls: true, surface } : { walls: true },
              },
            }),
          ],
        }),
      );

    const auto = painted();
    const asRepaint = painted("smooth");
    const autoLitres =
      findLine(auto, "living-paint-walls-litres").quantity ?? 0;
    const repaintLitres =
      findLine(asRepaint, "living-paint-walls-litres").quantity ?? 0;

    expect(autoLitres).toBeGreaterThan(repaintLitres);
    expect(autoLitres / repaintLitres).toBeCloseTo(
      resolvePaintSurfaceFactor("smooth") /
        resolvePaintSurfaceFactor("new_plaster"),
      1,
    );
    expect(findLine(auto, "living-paint-walls-litres").flags).toContain(
      "surface_new_plaster",
    );
    expect(auto.assumptions.join(" ")).toMatch(
      /fresh plaster coverage factor/i,
    );
  });
});

describe("imperial presentation", () => {
  it("converts quantities for display without touching the measurement", () => {
    expect(convertRenovationQuantity(20, "m2", "imperial")).toEqual({
      quantity: 215.28,
      unit: "sq ft",
    });
    expect(convertRenovationQuantity(18, "m", "imperial")).toEqual({
      quantity: 59.06,
      unit: "ft",
    });
    expect(convertRenovationQuantity(1, "m3", "imperial").unit).toBe("cu ft");
    expect(convertRenovationQuantity(10, "L", "imperial").unit).toBe("US gal");
    expect(convertRenovationQuantity(4, "nr", "imperial")).toEqual({
      quantity: 4,
      unit: "nr",
    });
    expect(convertRenovationQuantity(20, "m2", "metric")).toEqual({
      quantity: 20,
      unit: "m2",
    });
  });

  it("offers the register in either system with the same arithmetic", () => {
    const result = calculateRenovation(
      baseProject({ approvals: { required: false } }),
    );
    const metric = renovationScopeRegister(result);
    const imperial = renovationScopeRegister(result, { system: "imperial" });
    expect(imperial).toHaveLength(metric.length);
    for (let i = 0; i < metric.length; i += 1) {
      expect(imperial[i].basis).toBe(metric[i].basis);
      expect(imperial[i].tradeLabel).toBe(
        RENOVATION_TRADE_LABELS[metric[i].trade],
      );
    }
    const metricArea = metric.find((row) => row.unit === "m2");
    const imperialArea = imperial.find((row) => row.unit === "sq ft");
    if (metricArea && imperialArea && metricArea.quantity !== null) {
      expect(imperialArea.quantity).toBeGreaterThan(metricArea.quantity);
    }
  });

  it("totals by unit in the requested system", () => {
    const result = calculateRenovation(
      baseProject({ approvals: { required: false } }),
    );
    const metric = renovationTotalsByUnit(result);
    const imperial = renovationTotalsByUnit(result, "imperial");
    expect(metric.some((row) => row.unit === "m2")).toBe(true);
    expect(imperial.some((row) => row.unit === "sq ft")).toBe(true);
    expect(imperial.some((row) => row.unit === "m2")).toBe(false);
  });

  it("states that the labour factor never scales a quantity", () => {
    const factor = renovationLabourFactor({ occupied: true, floorLevel: 4 });
    expect(factor.appliesTo).toBe("labour_only");
  });
});

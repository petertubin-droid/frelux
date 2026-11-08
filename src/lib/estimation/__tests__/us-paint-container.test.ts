/**
 * A US paint price row is quoted per gallon. The engine's fallback container
 * used to be the market's LARGEST pack (a five gallon pail), so one can's
 * price was charged for five cans of paint. These tests pin the container to
 * the can on the shelf and prove both paint engines read the same shelf.
 *
 * A 10 x 12 ft room, 8 ft high, one door, one window, two coats:
 *   wall = 2 x (3.048 + 3.6576) x 2.4384 = 32.68 m2 gross
 *   deductions 0.9144 x 2.1336 + 1.2192 x 1.2192 = 3.44 m2
 *   net  = 29.24 m2 -> 2 coats at 10 m2/L = 5.85 litres
 *   a 1 gal can holds 3.7854 litres, so 2 cans
 */
import { describe, expect, it } from "vitest";
import {
  LITRES_PER_US_GALLON,
  resolvePaintPackLitres,
  paintPackLabel,
  paintPackNoun,
} from "@/lib/estimation/paint-packaging";
import {
  calculateTheoreticalLitres,
  getPackSizeLitres,
} from "@/lib/estimation/paint-engine";
import { roundUpToWholeUnit } from "@/lib/measurement/geometry";
import {
  calculateRoom,
  type PaintingRoomInput,
} from "@/lib/estimation/painting-engine";
import type {
  EstimationCalcRule,
  EstimationPrice,
  EstimationProduct,
  EstimationProductQuality,
} from "@/types/estimation";

const packRule = (litres: number): EstimationCalcRule =>
  ({
    id: "r",
    rule_key: "pack_size_bucket_litres",
    calculator_type: "painting",
    rule_value: { litres },
    rule_status: "verified_frelux",
    description: "",
    is_active: true,
    created_at: "",
    updated_at: "",
  }) as EstimationCalcRule;

const product = (pack: number | null): EstimationProduct =>
  ({
    id: "p",
    name: "Behr Premium Plus Interior",
    standard_pack_size: pack,
  }) as unknown as EstimationProduct;

const quality: EstimationProductQuality = {
  id: "q",
  product_id: "p",
  name: "Standard",
  coverage: 10,
  coverage_unit: "m2_per_liter",
} as unknown as EstimationProductQuality;

const usPrice: EstimationPrice = {
  id: "pr",
  price_type: "quality",
  ref_id: "q",
  price: 39.2,
  currency: "USD",
} as unknown as EstimationPrice;

const room: PaintingRoomInput = {
  room_id: "r1",
  room_name: "Bedroom",
  length: 10,
  breadth: 12,
  height: 8,
  unit: "feet",
  doors: [{ quantity: 1, width: 3, height: 7 }],
  windows: [{ quantity: 1, width: 4, height: 4 }],
  doors_unknown: false,
  windows_unknown: false,
  product_id: "p",
  quality_id: "q",
  colour_condition_key: "new_unpainted",
  surface_condition_key: "new_plastered",
  coats: 2,
  include_ceiling: false,
} as unknown as PaintingRoomInput;

describe("US paint container", () => {
  it("defaults to the gallon can, not the five gallon pail", () => {
    expect(resolvePaintPackLitres("US")).toBeCloseTo(LITRES_PER_US_GALLON, 9);
    expect(resolvePaintPackLitres("PR")).toBeCloseTo(LITRES_PER_US_GALLON, 9);
    expect(resolvePaintPackLitres("NG")).toBe(20);
    expect(resolvePaintPackLitres("GB")).toBe(20);
  });

  it("names it the way the shelf does", () => {
    expect(paintPackLabel(LITRES_PER_US_GALLON, "US")).toBe("1 gal");
    expect(paintPackNoun(LITRES_PER_US_GALLON, "US")).toBe("can");
  });

  it("lets a product row's own container win over the default", () => {
    expect(
      getPackSizeLitres(product(18.92705892), packRule(20), "US"),
    ).toBeCloseTo(18.92705892, 6);
  });

  it("ignores the metric bucket rule in a gallon market", () => {
    // The rule is a single global row written as 20 litres.
    expect(getPackSizeLitres(null, packRule(20), "US")).toBeCloseTo(
      LITRES_PER_US_GALLON,
      9,
    );
  });

  it("charges for the cans the job actually needs", () => {
    const net = 29.24;
    const litres = calculateTheoreticalLitres(net, 2, 10);
    expect(litres).toBe(5.85);
    const cans = roundUpToWholeUnit(litres / LITRES_PER_US_GALLON);
    expect(cans).toBe(2);
    // Two cans of real paint, not one can's price for a pail.
    expect(cans * usPrice.price).toBeCloseTo(78.4, 2);
  });

  it("makes both paint engines read the same shelf", () => {
    const result = calculateRoom(room, {
      product: product(null),
      quality,
      price: usPrice,
      ceilingRule: null,
      packSizeRule: packRule(20),
      roundingRule: null,
      colourConditions: [],
      surfaceConditions: [],
      marketCode: "US",
    });
    const step = result.calculation_steps.find(
      (s) => s.label === "Bucket Size",
    );
    expect(step?.value).toBe("1 gal can");
    expect(result.customer_summary.practical_purchase).toMatch(/gal cans/);
  });

  it("still quotes the metric bucket to a Nigerian room", () => {
    const result = calculateRoom(room, {
      product: product(null),
      quality,
      price: { ...usPrice, price: 25000, currency: "NGN" },
      ceilingRule: null,
      packSizeRule: packRule(20),
      roundingRule: null,
      colourConditions: [],
      surfaceConditions: [],
      marketCode: "NG",
    });
    const step = result.calculation_steps.find(
      (s) => s.label === "Bucket Size",
    );
    expect(step?.value).toBe("20 L bucket");
  });
});

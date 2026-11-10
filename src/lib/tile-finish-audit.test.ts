import { describe, expect, it } from "vitest";
import { calculateTile } from "./pop-tile-calc";
import {
  DEFAULT_CONDUIT_WIRING_RULES,
  calculateConduitWiring,
} from "@/lib/estimation/conduit-wiring-engine";
import type { TileCalcInput } from "@/types";

const base: TileCalcInput = {
  surfaceType: "floor",
  method: "traditional",
  length: 4,
  width: 3, // 12 m²
  height: 3,
  tileWidthMm: 600,
  tileHeightMm: 600,
  tilesPerBox: 4,
  tilePricePerBox: 18000,
  adhesiveCoverageRate: 0,
  adhesivePricePerBag: 7000,
  cementCoverageRate: 5,
  cementPricePerBag: 9000,
  cementPackageSize: 1,
  sandCoverageRate: 0,
  sandPricePerBag: 70000,
  sandPackageSize: 1,
  sandUnitCubicMetres: 6.25,
  bedThicknessMm: 25,
  groutCoverageRate: 10,
  groutPricePerKg: 2500,
  spacerCoverageRate: 50,
  spacerPricePerPack: 500,
  spacerPackageSize: 1,
  wasteMargin: 0,
  labourRatePerSqm: 2000,
  unit: "meters",
};

describe("pack rounding does not invent a unit", () => {
  it("orders 3 adhesive bags for an exact 4.2 / 1.4 quotient", () => {
    // 4.2 / 1.4 is 3.0000000000000004 in binary floating point, so a plain
    // Math.ceil ordered a fourth bag.
    const r = calculateTile(
      {
        ...base,
        method: "adhesive",
        length: 4.2,
        width: 1,
        adhesiveCoverageRate: 1.4,
      },
      [],
      "NGN",
      "₦",
    );
    expect(r.adhesiveNeeded).toBe(3);
  });

  it("does not add a box for an exact tile count", () => {
    // 12 m² of 0.6 x 0.6 tiles is 33.33, so 34 tiles and 9 boxes of 4.
    const r = calculateTile({ ...base }, [], "NGN", "₦");
    expect(r.tilesNeeded).toBe(34);
    expect(r.boxesNeeded).toBe(9);
  });
});

describe("adhesive bags, not kilograms", () => {
  it("converts the notch-table mass into bags", () => {
    const r = calculateTile(
      { ...base, method: "adhesive", adhesiveNotchMm: 6 },
      [],
      "NGN",
      "₦",
    );
    expect(r.adhesiveMassKg).toBeCloseTo(51, 6);
    expect(r.adhesiveNeeded).toBe(3);
    expect(r.adhesiveCost).toBe(3 * base.adhesivePricePerBag);
  });

  it("uses the bag mass the user's market sells", () => {
    const r = calculateTile(
      { ...base, method: "adhesive", adhesiveNotchMm: 6, adhesiveBagKg: 25 },
      [],
      "NGN",
      "₦",
    );
    expect(r.adhesiveMassKg).toBeCloseTo(51, 6);
    expect(r.adhesiveNeeded).toBe(3); // 51 / 25 = 2.04, so 3
  });
});

describe("cement and sand come from one mortar bed", () => {
  it("sizes both from the bed volume", () => {
    // 12 m² at 25 mm is 0.3 m³ wet, 0.399 m³ dry, so cement 0.0798 m³
    // (2.30 bags of 50 kg, so 3) and sand 0.3192 m³.
    const r = calculateTile({ ...base }, [], "NGN", "₦");
    expect(r.bedVolumeM3).toBeCloseTo(0.3, 6);
    expect(r.cementNeeded).toBe(3);
    expect(r.sandVolumeM3).toBeCloseTo(0.3192, 4);
    expect(r.sandNeeded).toBe(1);
  });

  it("moves cement when the bed is thicker", () => {
    // A 50 mm bed is twice the volume: 0.6 m³ wet, 0.798 dry, cement
    // 0.1596 m³ = 4.60 bags, so 5. The old coverage-rate path returned the
    // same 3 bags at either thickness.
    const thick = calculateTile(
      { ...base, bedThicknessMm: 50 },
      [],
      "NGN",
      "₦",
    );
    expect(thick.bedVolumeM3).toBeCloseTo(0.6, 6);
    expect(thick.cementNeeded).toBe(5);
  });

  it("falls back to the coverage rate when no bed is given", () => {
    const r = calculateTile(
      { ...base, bedThicknessMm: 0, sandUnitCubicMetres: undefined, cementCoverageRate: 5 },
      [],
      "NGN",
      "₦",
    );
    // 12 m² at 5 m² per bag is 2.4, so 3 bags, and no second division by the
    // package size.
    expect(r.cementNeeded).toBe(3);
  });
});

describe("conduit rules cannot emit infinity", () => {
  it("refuses an unconfigured piece length", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 100, lighting_points: 6, socket_points: 8 },
      { ...DEFAULT_CONDUIT_WIRING_RULES, conduit_length_m: 0 },
      {},
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/piece length/i);
    expect(Number.isFinite(r.lines.length)).toBe(true);
    expect(r.lines.length).toBe(0);
  });

  it("still prices a configured run", () => {
    const r = calculateConduitWiring(
      { floor_area_m2: 100, lighting_points: 6, socket_points: 8 },
      DEFAULT_CONDUIT_WIRING_RULES,
      {},
    );
    expect(r.ok).toBe(true);
    const conduit = r.lines.find((l) => l.key === "conduit")!;
    // 100 m² x 1.8 = 180 m run, at 2.9 m per length, so 63 lengths.
    expect(conduit.quantity).toBe(63);
  });
});

/**
 * Golden vectors: what each market must resolve to.
 *
 * These six markets cover four masonry traditions, three electrical systems,
 * two bag weights and three timber conventions, so they catch a refactor that
 * quietly re-points one market at another's data. The values are the ones the
 * audit verified, locked here so a later change has to argue with a test.
 *
 * If a value genuinely changes, change it here with the reason in the commit.
 * Do not loosen an assertion to make a regression pass.
 */
import { describe, expect, it } from "vitest";
import {
  cementBagKg,
  masonryUnitsForMarket,
  unitFaceAreaM2,
} from "@/config/masonry-units";
import { timberSectionsForMarket } from "@/config/timber-sections";
import { getElectricalProfile } from "@/lib/estimation/electrical-profiles";
import { getPlumbingProfile } from "@/lib/estimation/plumbing-profiles";

interface GoldenVector {
  market: string;
  masonryKey: string;
  bagKg: number;
  timberKey: string;
  timberDepthMm: number;
  voltage: string;
  frequencyHz: number;
  /** Units per square metre of wall, rounded, joint included. */
  unitsPerM2: number;
  plumbingMaterial: string;
}

const VECTORS: GoldenVector[] = [
  {
    market: "NG",
    masonryKey: "ng-block-9",
    bagKg: 50,
    timberKey: "ng-50x200",
    timberDepthMm: 200,
    voltage: "230V single-phase / 415V 3-phase",
    frequencyHz: 50,
    unitsPerM2: 9,
    plumbingMaterial:
      "PPR (Polypropylene Random Copolymer heat fusion) or PVC pressure pipe",
  },
  {
    market: "GB",
    masonryKey: "uk-brick",
    bagKg: 25,
    timberKey: "gb-47x225",
    timberDepthMm: 225,
    voltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    unitsPerM2: 59,
    plumbingMaterial:
      "Copper pipe (BS EN 1057) or Barrier PB/PEX push-fit (BS 7291)",
  },
  {
    market: "US",
    masonryKey: "us-cmu",
    bagKg: 42.64,
    timberKey: "us-2x12",
    timberDepthMm: 286,
    voltage: "120V / 240V split-phase",
    frequencyHz: 60,
    unitsPerM2: 11,
    plumbingMaterial: "PEX-A / PEX-B tubing or Type L / M Copper (ASTM B88)",
  },
  {
    market: "CA",
    masonryKey: "ca-cmu",
    bagKg: 40,
    timberKey: "us-2x12",
    timberDepthMm: 286,
    voltage: "120V / 240V split-phase",
    frequencyHz: 60,
    unitsPerM2: 12,
    plumbingMaterial: "PEX (CSA B137.5) or Copper Type M/L",
  },
  {
    market: "AU",
    masonryKey: "au-block-190",
    bagKg: 20,
    timberKey: "au-240x45",
    timberDepthMm: 240,
    voltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    unitsPerM2: 12,
    plumbingMaterial:
      "PEX tubing (AS/NZS 2492) or Type B Copper Tube (AS 1432)",
  },
  {
    market: "AE",
    masonryKey: "ae-block-200",
    bagKg: 50,
    timberKey: "ae-75x200",
    timberDepthMm: 200,
    voltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    unitsPerM2: 12,
    plumbingMaterial:
      "PPR-C Type 3 or multi-layer PEX-Al-PEX / Copper tubes (BS EN 1057)",
  },
];

describe.each(VECTORS)("golden vector: $market", (vector) => {
  it("resolves its own masonry unit", () => {
    const units = masonryUnitsForMarket(vector.market);
    expect(units[0].key).toBe(vector.masonryKey);
    expect(units[0].substitutedFromMarket).toBeUndefined();
    expect(Math.round(1 / unitFaceAreaM2(units[0]))).toBeCloseTo(
      vector.unitsPerM2,
      0,
    );
  });

  it("uses its own cement bag weight", () => {
    expect(cementBagKg(vector.market)).toBe(vector.bagKg);
  });

  it("stocks its own deepest timber section", () => {
    const deepest = timberSectionsForMarket(vector.market)[0];
    expect(deepest.key).toBe(vector.timberKey);
    expect(deepest.depthMm).toBe(vector.timberDepthMm);
  });

  it("reports its own supply voltage and frequency", () => {
    const profile = getElectricalProfile(vector.market);
    expect(profile.nominalVoltage).toBe(vector.voltage);
    expect(profile.frequencyHz).toBe(vector.frequencyHz);
  });

  it("names its own plumbing materials", () => {
    const profile = getPlumbingProfile(vector.market);
    expect(profile.waterSupplyMaterial).toBe(vector.plumbingMaterial);
  });
});

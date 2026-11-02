// =========================================================
// Regional conformance for the four markets where FRELUX has
// real search demand: Nigeria, the United States, Australia
// and India.
//
// Every expectation here is derived by hand from published
// trade values, not read back from the code under test. The
// point is that a Nigerian user and an Indian user both get
// the number their own trade would quote, and that the two
// numbers are not accidentally the same code path.
//
// Rules of thumb used as independent anchors:
//   Nigeria   450 x 225 mm sandcrete block, 10-12 mm joint  ->  ~9 to 10 blocks/m2
//   US        nominal 8 x 8 x 16 in CMU, 3/8 in joint        ->  1.125 blocks/ft2
//   Australia 230 x 76 mm brick, 10 mm joint                 ->  48.5 bricks/m2
//   India     190 x 90 x 90 mm modular brick, 10 mm joint    ->  50 bricks/m2
// =========================================================

import { describe, expect, it } from "vitest";
import { MASONRY_MARKET_REGISTRY } from "../masonry-standalone-engine";
import {
  LITRES_PER_US_GALLON,
  getCoverageUnitLabel,
  isKnownCoverageUnit,
  normalizeCoverage,
} from "../paint-engine";
import { getConstructionTypology } from "../construction-typologies";
import { getStructuralJurisdictionScope } from "@/lib/engineering/structural-jurisdiction-scope";
import {
  AREA_TO_M2,
  VOLUME_TO_L,
  convertArea,
  convertVolume,
} from "@/lib/convert/units";

const MARKETS = ["NG", "US", "AU", "IN"] as const;
type Market = (typeof MARKETS)[number];

/** Units of the market's default masonry unit that fit in one square metre. */
function unitsPerSquareMetre(market: Market): number {
  const unit = MASONRY_MARKET_REGISTRY[market].defaultUnit;
  const moduleLengthM = (unit.lengthMm + unit.standardJointMm) / 1000;
  const moduleHeightM = (unit.heightMm + unit.standardJointMm) / 1000;
  return 1 / (moduleLengthM * moduleHeightM);
}

const SQUARE_FEET_PER_SQUARE_METRE = 1 / AREA_TO_M2.ft2;

describe("masonry counts match the local trade rule of thumb", () => {
  // A block or brick count that is wrong for the market is the single most
  // expensive estimate error, because it carries cement and sand with it.
  const published: Record<Market, { expected: number; tolerance: number }> = {
    NG: { expected: 10, tolerance: 0.1 },
    US: { expected: 1.125 * SQUARE_FEET_PER_SQUARE_METRE, tolerance: 0.02 },
    AU: { expected: 48.5, tolerance: 0.02 },
    IN: { expected: 50, tolerance: 0.01 },
  };

  for (const market of MARKETS) {
    it(`${market} lands within tolerance of the published rate`, () => {
      const actual = unitsPerSquareMetre(market);
      const { expected, tolerance } = published[market];
      const drift = Math.abs(actual - expected) / expected;
      expect(
        drift,
        `${market}: ${actual.toFixed(3)}/m2 vs published ${expected.toFixed(3)}`,
      ).toBeLessThanOrEqual(tolerance);
    });
  }

  it("India is exactly 50 bricks per square metre for a 190 x 90 brick with a 10 mm joint", () => {
    // 200 mm x 100 mm module = 0.02 m2, so 50 is exact rather than rounded.
    expect(unitsPerSquareMetre("IN")).toBeCloseTo(50, 6);
  });

  it("the US unit is a real CMU, not a metric block relabelled", () => {
    const us = MASONRY_MARKET_REGISTRY.US.defaultUnit;
    // Nominal 8 x 8 x 16 in means an actual 7-5/8 x 7-5/8 x 15-5/8 in unit.
    expect(us.lengthMm).toBeCloseTo(397, 0);
    expect(us.heightMm).toBeCloseTo(194, 0);
    expect(us.standardJointMm).toBeCloseTo(9.5, 1); // 3/8 in
  });

  it("each market counts cement in its own bag weight", () => {
    // A 20 kg Australian bag needs 2.5x the bags of a 50 kg Nigerian one for
    // the same mortar, so a shared constant would be wrong somewhere.
    expect(MASONRY_MARKET_REGISTRY.NG.cementBagWeightKg).toBe(50);
    expect(MASONRY_MARKET_REGISTRY.IN.cementBagWeightKg).toBe(50);
    expect(MASONRY_MARKET_REGISTRY.AU.cementBagWeightKg).toBe(20);
    expect(MASONRY_MARKET_REGISTRY.US.cementBagWeightKg).toBeCloseTo(42.6, 1); // 94 lb
  });
});

describe("paint coverage converts the way each market quotes it", () => {
  it("a US square-feet-per-gallon figure becomes a metric rate", () => {
    // 350 sq ft = 32.516 m2, spread over 3.785 L, is 8.59 m2/L.
    expect(normalizeCoverage(350, "ft2_per_gallon", 1)).toBeCloseTo(8.59, 1);
    // 400 sq ft/gal is the top of the usual premium range.
    expect(normalizeCoverage(400, "ft2_per_gallon", 1)).toBeCloseTo(9.82, 1);
  });

  it("regression: a US gallon figure is never read as metric coverage", () => {
    // The defect this guards against read 350 sq ft/gal as 350 m2/L, which is
    // roughly forty times the real coverage and left the buyer short of paint.
    const metric = normalizeCoverage(350, "m2_per_liter", 1);
    const us = normalizeCoverage(350, "ft2_per_gallon", 1);
    expect(us).toBeLessThan(10);
    expect(metric).toBe(350);
    expect(metric / us).toBeGreaterThan(30);
  });

  it("metric markets are unaffected by the gallon support", () => {
    // Nigeria and India quote m2/L directly; Australia quotes m2/L too.
    expect(normalizeCoverage(10, "m2_per_liter", 1)).toBe(10);
    expect(normalizeCoverage(16, "m2_per_liter", 1)).toBe(16);
    expect(normalizeCoverage(140, "ft2_per_liter", 1)).toBeCloseTo(13.01, 1); // India, sq ft per litre
  });

  it("a square-metre-per-gallon figure converts too", () => {
    expect(normalizeCoverage(35, "m2_per_gallon", 1)).toBeCloseTo(9.25, 1);
  });

  it("an unknown unit refuses instead of assuming metric", () => {
    expect(isKnownCoverageUnit("ft2_per_gallon")).toBe(true);
    expect(isKnownCoverageUnit("gal_per_room")).toBe(false);
    expect(normalizeCoverage(350, "gal_per_room", 1)).toBe(0);
  });

  it("labels are honest about the unit", () => {
    expect(getCoverageUnitLabel("ft2_per_gallon")).toContain("gallon");
    expect(LITRES_PER_US_GALLON).toBeCloseTo(3.7854, 4);
  });
});

describe("construction typology describes what each country actually builds", () => {
  it("Nigeria is sandcrete blockwork with an RC frame", () => {
    const t = getConstructionTypology("NG");
    expect(t.id).toBe("ng_sandcrete_concrete");
    expect(t.regionalCategory).toBe("west_african_masonry");
    expect(t.typicalFramingOrUnitSize).toContain("450 x 225 x 225");
  });

  it("the US is light timber frame, not masonry", () => {
    const t = getConstructionTypology("US");
    expect(t.id).toBe("us_light_timber_frame");
    expect(t.regionalCategory).toBe("north_american_timber_frame");
  });

  it("Australia is brick veneer on timber frame", () => {
    const t = getConstructionTypology("AU");
    expect(t.id).toBe("au_brick_veneer_timber");
  });

  it("India is a brick and RCC frame", () => {
    const t = getConstructionTypology("IN");
    expect(t.id).toBe("in_brick_rcc_frame");
    expect(t.regionalCategory).toBe("asian_rcc_frame");
  });

  it("every market resolves to its own typology rather than the generic fallback", () => {
    const ids = MARKETS.map((m) => getConstructionTypology(m).id);
    expect(new Set(ids).size).toBe(MARKETS.length);
    expect(ids.every((id) => !id.startsWith("general"))).toBe(true);
  });
});

/** The getter is nullable; a missing market row is a test failure, not a skip. */
function scopeFor(market: Market) {
  const scope = getStructuralJurisdictionScope(market);
  if (!scope) throw new Error(`No jurisdiction scope registered for ${market}`);
  return scope;
}

describe("design codes are named per jurisdiction", () => {
  it("the US cites ACI 318 and ASCE 7", () => {
    const scope = scopeFor("US");
    expect(scope.framework).toMatch(/ACI 318/);
    expect(scope.framework).toMatch(/ASCE 7/);
  });

  it("Australia cites AS 3600 and the AS/NZS 1170 load series", () => {
    const scope = scopeFor("AU");
    expect(scope.framework).toMatch(/AS 3600/);
    expect(scope.framework).toMatch(/AS\/NZS 1170/);
  });

  it("India cites IS 456 and IS 1893", () => {
    const scope = scopeFor("IN");
    expect(scope.framework).toMatch(/IS 456/);
    expect(scope.framework).toMatch(/IS 1893/);
  });

  it("Nigeria stays reference-only because no concrete code is mandatorily adopted", () => {
    // Nigeria has a National Building Code but no adopted design code for
    // concrete, so naming BS 8110 or Eurocode as governing would be a claim
    // the country does not make. The scope must say so instead of guessing.
    const scope = scopeFor("NG");
    expect(scope.framework).toMatch(/National Building Code/);
    expect(scope.framework).toMatch(/NIS|COREN/);
    expect(scope.calculationStatus).toBe("reference_only");
    expect(scope.localScope).toMatch(/LASBCA|state and local authority/);
  });

  it("every one of the four markets carries a verifiable source", () => {
    for (const market of MARKETS) {
      expect(scopeFor(market).verifiedSource).toMatch(/^https:\/\//);
    }
  });
});

describe("units a buyer in each market is actually quoted in", () => {
  it("US square feet and cubic yards convert exactly", () => {
    expect(convertArea(1000, "ft2", "m2")).toBeCloseTo(92.90304, 5);
    // Concrete is ordered by the cubic yard in the US: 1 yd3 = 0.764554857984 m3.
    expect(convertVolume(1, "yd3", "m3")).toBeCloseTo(0.764554858, 6);
    expect(convertVolume(1, "ft3", "m3")).toBeCloseTo(0.0283168466, 8);
  });

  it("the US gallon and the imperial gallon stay distinct", () => {
    // Confusing them is a 20% error on anything bought by the gallon.
    const usGallon = VOLUME_TO_L.gal_us;
    expect(usGallon).toBeCloseTo(3.785411784, 9);
    const imperialGallon = VOLUME_TO_L.gal_imp;
    expect(imperialGallon).toBeCloseTo(4.54609, 5);
    expect(imperialGallon).toBeGreaterThan(usGallon + 0.7);
  });

  it("metric markets round-trip without drift", () => {
    expect(convertArea(1, "m2", "ft2")).toBeCloseTo(10.7639, 3);
    const toFeet = convertArea(250, "m2", "ft2");
    expect(toFeet).not.toBeNull();
    const backToMetres = convertArea(toFeet as number, "ft2", "m2");
    expect(backToMetres).not.toBeNull();
    expect(backToMetres as number).toBeCloseTo(250, 6);
  });
});

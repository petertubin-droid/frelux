// =========================================================
// Regional conformance for the second wave of markets:
// United Kingdom, China, Canada, Mexico, the United Arab
// Emirates, Germany and Italy.
//
// Same discipline as regional-conformance.test.ts: every
// expectation is derived by hand from published trade values
// rather than read back from the code being tested.
//
// Anchors:
//   GB  215 x 65 mm facing brick, 10 mm joint           ->  60 bricks/m2 per leaf
//   CN  240 x 115 x 53 mm brick, 10 mm joint            ->  64 bricks/m2 (120 wall)
//                                                          ~128/m2 for a 240 mm wall
//   CA  390 x 190 mm CMU, 10 mm joint                   ->  12.5 blocks/m2
//   MX  tabique rojo 240 x 120 x 60 mm, 12 mm joint     ->  55 to 57 pieces/m2
//   AE  400 x 200 mm block, 10 mm joint                 ->  11.6 with joints, 12.5 nominal
//   DE  Normalformat 240 x 115 x 71 mm, 10 mm joint     ->  48 to 50 bricks/m2
//   IT  doppio UNI forato 250 x 120 x 120 mm, 10 mm     ->  30 pieces/m2
// =========================================================

import { describe, expect, it } from "vitest";
import {
  MASONRY_MARKET_REGISTRY,
  calculateMasonryTakeoff,
} from "../masonry-standalone-engine";
import { getConstructionTypology } from "../construction-typologies";
import { getStructuralJurisdictionScope } from "@/lib/engineering/structural-jurisdiction-scope";
import { isKnownCoverageUnit, normalizeCoverage } from "../paint-engine";

const MARKETS = ["GB", "CN", "CA", "MX", "AE", "DE", "IT"] as const;
type Market = (typeof MARKETS)[number];

function unitsPerM2Of(unit: {
  lengthMm: number;
  heightMm: number;
  standardJointMm: number;
}): number {
  return (
    1 /
    (((unit.lengthMm + unit.standardJointMm) / 1000) *
      ((unit.heightMm + unit.standardJointMm) / 1000))
  );
}

function scopeFor(market: Market) {
  const scope = getStructuralJurisdictionScope(market);
  if (!scope) throw new Error(`No jurisdiction scope registered for ${market}`);
  return scope;
}

describe("each new market has a real local masonry unit, not a borrowed one", () => {
  for (const market of MARKETS) {
    it(`${market} is registered with its own unit, joint and bag`, () => {
      const config = (
        MASONRY_MARKET_REGISTRY as Record<
          string,
          {
            defaultUnit: {
              name: string;
              lengthMm: number;
              heightMm: number;
              standardJointMm: number;
            };
            cementBagWeightKg: number;
            availableUnits: unknown[];
          }
        >
      )[market];
      expect(
        config,
        `${market} missing from the masonry registry`,
      ).toBeDefined();
      expect(config.defaultUnit.name.length).toBeGreaterThan(5);
      expect(config.defaultUnit.standardJointMm).toBeGreaterThan(0);
      expect(config.cementBagWeightKg).toBeGreaterThan(5);
      expect(config.availableUnits.length).toBeGreaterThan(0);
    });
  }

  it("the units are the sizes those countries actually sell", () => {
    const cfg = MASONRY_MARKET_REGISTRY as Record<
      string,
      { defaultUnit: { lengthMm: number; heightMm: number; widthMm: number } }
    >;
    // GB: 215 x 102.5 x 65 mm, the standard UK facing brick.
    expect(cfg.GB.defaultUnit.lengthMm).toBe(215);
    expect(cfg.GB.defaultUnit.heightMm).toBe(65);
    // CN: 240 x 115 x 53 mm, the standard sintered clay brick (GB/T 5101).
    expect(cfg.CN.defaultUnit.lengthMm).toBe(240);
    expect(cfg.CN.defaultUnit.heightMm).toBe(53);
    // CA: 390 x 190 x 190 mm metric CMU.
    expect(cfg.CA.defaultUnit.lengthMm).toBe(390);
    expect(cfg.CA.defaultUnit.heightMm).toBe(190);
    // MX: tabique rojo recocido, 240 x 120 x 60 mm.
    expect(cfg.MX.defaultUnit.lengthMm).toBe(240);
    expect(cfg.MX.defaultUnit.heightMm).toBe(60);
    // AE: 400 x 200 x 200 mm hollow block.
    expect(cfg.AE.defaultUnit.lengthMm).toBe(400);
    expect(cfg.AE.defaultUnit.heightMm).toBe(200);
    // DE: Normalformat 240 x 115 x 71 mm (DIN 105).
    expect(cfg.DE.defaultUnit.lengthMm).toBe(240);
    expect(cfg.DE.defaultUnit.heightMm).toBe(71);
    // IT: doppio UNI forato, 245 x 120 x 120 mm.
    expect(cfg.IT.defaultUnit.lengthMm).toBe(245);
    expect(cfg.IT.defaultUnit.heightMm).toBe(120);
  });

  it("cement is counted in the bag each country sells", () => {
    const cfg = MASONRY_MARKET_REGISTRY as Record<
      string,
      { cementBagWeightKg: number }
    >;
    expect(cfg.GB.cementBagWeightKg).toBe(25); // UK 25 kg bag
    expect(cfg.DE.cementBagWeightKg).toBe(25); // German 25 kg bag
    expect(cfg.IT.cementBagWeightKg).toBe(25); // Italian 25 kg bag
    expect(cfg.CN.cementBagWeightKg).toBe(50); // Chinese 50 kg bag
    expect(cfg.MX.cementBagWeightKg).toBe(50); // Mexican saco de 50 kg
    expect(cfg.AE.cementBagWeightKg).toBe(50); // Gulf 50 kg bag
    expect(cfg.CA.cementBagWeightKg).toBe(40); // Canadian 40 kg bag
  });
});

describe("masonry counts match the published local rate", () => {
  const cases: Record<Market, { published: number; tolerance: number }> = {
    GB: { published: 60, tolerance: 0.02 },
    CN: { published: 64, tolerance: 0.02 },
    CA: { published: 12.5, tolerance: 0.01 },
    MX: { published: 55, tolerance: 0.03 },
    AE: { published: 11.61, tolerance: 0.02 },
    DE: { published: 49, tolerance: 0.03 },
    IT: { published: 30, tolerance: 0.02 },
  };

  for (const market of MARKETS) {
    it(`${market} is within tolerance of the local trade rate`, () => {
      const actual = unitsPerM2Of(
        (
          MASONRY_MARKET_REGISTRY as Record<
            string,
            {
              defaultUnit: {
                lengthMm: number;
                heightMm: number;
                standardJointMm: number;
              };
            }
          >
        )[market].defaultUnit,
      );
      const { published, tolerance } = cases[market];
      const drift = Math.abs(actual - published) / published;
      expect(
        drift,
        `${market}: ${actual.toFixed(2)}/m2 vs published ${published}`,
      ).toBeLessThanOrEqual(tolerance);
    });
  }

  it("Canada is exactly 12.5 blocks per square metre for a 390 x 190 CMU", () => {
    expect(
      unitsPerM2Of(
        (
          MASONRY_MARKET_REGISTRY as Record<
            string,
            {
              defaultUnit: {
                lengthMm: number;
                heightMm: number;
                standardJointMm: number;
              };
            }
          >
        ).CA.defaultUnit,
      ),
    ).toBeCloseTo(12.5, 6);
  });
});

describe("a wall area is one leaf unless the caller says otherwise", () => {
  // A UK cavity wall is two leaves and a Chinese 240 mm wall shows the 115 mm
  // face twice through the thickness. Reading the area as a single leaf
  // under-counts both by half, which is the largest possible quantity error
  // in those two markets, so the engine now takes an explicit leaf count.
  const wall = {
    marketCode: "GB",
    wallLengthM: 5,
    wallHeightM: 2,
    wallCount: 1,
    wastePercent: 0,
  };

  it("one leaf is unchanged from the previous behaviour", () => {
    const one = calculateMasonryTakeoff({ ...wall, leafCount: 1 });
    expect(one.leafCount).toBe(1);
    expect(one.netWallAreaM2).toBeCloseTo(10, 6);
    // 215 + 10 by 65 + 10 is 0.016875 m2, so 59.26 bricks/m2 over 10 m2.
    expect(one.unitsPerM2).toBeCloseTo(59.26, 2);
    expect(one.unitsRequiredNet).toBe(593);
  });

  it("omitting the leaf count keeps single-leaf markets exactly as they were", () => {
    const omitted = calculateMasonryTakeoff({ ...wall });
    const explicit = calculateMasonryTakeoff({ ...wall, leafCount: 1 });
    expect(omitted.unitsRequiredNet).toBe(explicit.unitsRequiredNet);
    expect(omitted.mortarVolumeM3Net).toBeCloseTo(
      explicit.mortarVolumeM3Net,
      9,
    );
  });

  it("two leaves doubles bricks, mortar and cement together", () => {
    const one = calculateMasonryTakeoff({ ...wall, leafCount: 1 });
    const two = calculateMasonryTakeoff({ ...wall, leafCount: 2 });
    // Each leaf is rounded to a whole unit, so the doubled figure may differ
    // by one from twice the rounded single-leaf figure.
    expect(
      Math.abs(two.unitsRequiredNet - one.unitsRequiredNet * 2),
    ).toBeLessThanOrEqual(1);
    expect(two.mortarVolumeM3Net).toBeGreaterThan(one.mortarVolumeM3Net * 1.99);
    // Results are reported to three decimals, so compare at that precision.
    expect(two.mortarVolumeM3Net).toBeCloseTo(one.mortarVolumeM3Net * 2, 2);
    expect(two.mortarVolumeM3Gross).toBeCloseTo(one.mortarVolumeM3Gross * 2, 2);
  });

  it("a Chinese 240 mm wall needs about 127 bricks per square metre, not 64", () => {
    // The pressable face of a 240 brick is 115 x 53, so a 240 mm thick wall is
    // two such faces: 1/((0.115+0.01)*(0.053+0.01)) = 126.98 per m2.
    const two = calculateMasonryTakeoff({
      marketCode: "CN",
      wallLengthM: 1,
      wallHeightM: 1,
      wastePercent: 0,
      leafCount: 2,
    });
    expect(two.unitsPerM2Effective).toBeGreaterThan(125);
    expect(two.unitsPerM2Effective).toBeLessThan(129);
    expect(two.unitsRequiredNet).toBe(127);
  });

  it("an empty or nonsense leaf count cannot zero the take-off", () => {
    const safe = calculateMasonryTakeoff({ ...wall, leafCount: 0 });
    expect(safe.leafCount).toBe(1);
    expect(safe.unitsRequiredNet).toBeGreaterThan(0);
  });
});

describe("paint coverage reaches every one of the seven", () => {
  it("Canadian and UK square-feet-per-gallon rates are understood", () => {
    // Canadian paint tins are 3.78 L and quoted in sq ft, same as the US.
    expect(isKnownCoverageUnit("ft2_per_gallon")).toBe(true);
    expect(normalizeCoverage(350, "ft2_per_gallon", 1)).toBeCloseTo(8.59, 1);
  });

  it("a Mexican rendimiento of 40 m2 per 4 L bucket converts", () => {
    expect(normalizeCoverage(40, "m2_per_bucket", 4)).toBeCloseTo(10, 6);
  });

  it("German, Italian and Chinese metric rates pass through untouched", () => {
    for (const rate of [6, 8, 10, 12]) {
      expect(normalizeCoverage(rate, "m2_per_liter", 1)).toBe(rate);
    }
  });
});

describe("typology describes what each of the seven actually builds", () => {
  const expected: Record<Market, string> = {
    GB: "gb_cavity_brick_block",
    CN: "cn_rc_shearwall_aac",
    CA: "ca_light_timber_frame",
    MX: "mx_mamposteria_confinada",
    AE: "ae_aac_skeletal_frame",
    DE: "de_masonry_eurocode",
    IT: "it_poroton_laterocemento",
  };

  for (const market of MARKETS) {
    it(`${market} resolves to ${expected[market]}`, () => {
      const typology = getConstructionTypology(market);
      expect(typology.id).toBe(expected[market]);
      expect(typology.regionalCategory.length).toBeGreaterThan(3);
    });
  }

  it("the European pair share a category but not a typology", () => {
    expect(getConstructionTypology("DE").regionalCategory).toBe(
      getConstructionTypology("IT").regionalCategory,
    );
    expect(getConstructionTypology("DE").id).not.toBe(
      getConstructionTypology("IT").id,
    );
  });
});

describe("each of the seven names its own governing document", () => {
  it("the UK cites Approved Document A and the UK-adopted Eurocodes", () => {
    expect(scopeFor("GB").framework).toMatch(/Approved Document A/);
    expect(scopeFor("GB").framework).toMatch(/Eurocode/);
  });

  it("China names the revised designation, the announcement and the mandatory code", () => {
    // Verified 2026-10-31 against the announcement's own wording: MOHURD
    // Announcement 2024 No. 62, dated 24 April 2024, approved the partial
    // revision, renamed the standard and moved GB 50010-2010 to GB/T
    // 50010-2010, effective 1 August 2024.
    const scope = scopeFor("CN");
    expect(scope.framework).toMatch(/GB\/T 50010-2010/);
    expect(scope.framework).toMatch(/No\. 62/);
    expect(scope.framework).toMatch(/1 August 2024/);
    // The re-designation made the design standard recommended, so the binding
    // requirements live in the mandatory general code. A Chinese user reading
    // only GB/T 50010 would think it governs, so it must be named.
    expect(scope.framework).toMatch(/GB 55008-2021/);
    expect(scope.localScope).toMatch(/GB 55008-2021/);
    expect(scope.calculationStatus).toBe("reference_only");
  });

  it("Canada cites the National Building Code and CSA A23", () => {
    expect(scopeFor("CA").framework).toMatch(
      /National Building Code of Canada/,
    );
    expect(scopeFor("CA").framework).toMatch(/CSA A23/);
  });

  it("Mexico cites the RCDF with its Normas Tecnicas Complementarias", () => {
    expect(scopeFor("MX").framework).toMatch(
      /Reglamento de Construcciones|RCDF/,
    );
    expect(scopeFor("MX").framework).toMatch(
      /Normas T[eé]cnicas Complementarias|NTC/,
    );
  });

  it("the UAE cites the Dubai Building Code", () => {
    expect(scopeFor("AE").framework).toMatch(/Dubai Building Code/);
  });

  it("Germany cites the Musterbauordnung with Eurocode 2 and its national annex", () => {
    expect(scopeFor("DE").framework).toMatch(/Musterbauordnung|MBO/);
    expect(scopeFor("DE").framework).toMatch(/Eurocode 2|DIN EN 1992/);
  });

  it("Italy cites NTC 2018", () => {
    expect(scopeFor("IT").framework).toMatch(/NTC 2018|Norme Tecniche/);
  });

  it("all seven cite an encrypted, official source", () => {
    for (const market of MARKETS) {
      // China used to cite a provincial mirror over plain http; it now points
      // at the ministry over https, so no hardened market ships an insecure
      // citation.
      expect(scopeFor(market).verifiedSource, market).toMatch(/^https:\/\//);
    }
  });
});

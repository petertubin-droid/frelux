/**
 * German plaster / facade render engine — layered, rule-driven, global.
 *
 * "Plaster" is not one material. This engine models every calculation as a
 * system (gypsum interior, exterior render, textured Tyrolean) made of
 * ordered layers, then localises packaging, naming and units per market.
 *
 * Source discipline (verified 2026-11-19):
 *  - Gypsum consumption: Knauf MP 75, 25 kg yields 2.5-3.0 m² at 10 mm
 *    (≈8.3-10.0 kg/m²/10 mm), single coat minimum 10 mm, DIN EN 13279-1.
 *  - Exterior topcoat by grain: Baumit GranoporTop TDS — 1.5 mm ≈ 2.5 kg/m²,
 *    2 mm ≈ 2.9 kg/m², 3 mm ≈ 3.9 kg/m² (EN 15824 organic-bound renders).
 *  - Tyrolean: Cullamix TDS — ≈1 kg/m² per mm, 4-6 mm ≈ 5 m² per 25 kg.
 *  - ETICS mesh: 100 mm overlaps (ETAG 004 / EAD 040083-00-0404), i.e. +10%.
 *  - Cement backing render: delegated to the existing plastering engine so the
 *    cement/sand maths is not reproduced here.
 *
 * Honesty rules:
 *  - Every rate is a published figure with its source; manufacturer variance is
 *    stated, never hidden behind a single "exact" number.
 *  - A layer is emitted only for the selected system. Nothing is added "just in
 *    case"; optional items are listed as optional.
 *  - Gypsum in a wet zone is flagged as not suitable, not silently priced.
 */

import type { IfcModelElement } from "@/lib/bim/ifc-model-loader";
import { calculatePlasteringTakeoff } from "./plastering-standalone-engine";

export type PlasterSystem =
  "gypsum_interior" | "exterior_render" | "textured_tyrolene";

export type PlasterSubstrate =
  | "aac"
  | "clay_brick"
  | "sandcrete_block"
  | "concrete"
  | "eps_insulation"
  | "mineral_wool";

export type RenderGrainMm = 1.5 | 2 | 3;

export type PlasterRegion =
  "dach_eu" | "uk" | "north_america" | "africa" | "other";

export interface PlasterRenderInput {
  system: PlasterSystem;
  marketCode: string;
  /** Net area wins; otherwise length x height x wallCount minus openings. */
  areaM2?: number;
  lengthM?: number;
  heightM?: number;
  wallCount?: number;
  openingAreaM2?: number;
  /** External corners plus reveal perimeters, for beads. */
  externalCornerLengthM?: number;
  openingPerimeterM?: number;
  substrate?: PlasterSubstrate;
  /** Gypsum 10-15 mm; Tyrolean backing render 12-18 mm. */
  thicknessMm?: number;
  /** Exterior topcoat grain: 1.5, 2 or 3 mm. */
  grainMm?: RenderGrainMm;
  /** Tyrolean textured coat thickness, 3-5 mm. */
  texturedCoatMm?: number;
  wastePercent?: number;
  wetZone?: boolean;
  meshOverlapPercent?: number;
  beadLengthM?: number;
  bagKgOverride?: number;
}

export type PlasterUnit =
  "m2" | "kg" | "L" | "m" | "roll" | "piece" | "bag" | "pail" | "tonne";

export interface PlasterPack {
  label: string;
  packSize: number;
  packUnit: string;
  count: number;
}

export interface PlasterLayerLine {
  key: string;
  /** Regional material name (Gipsputz / veneer plaster / Tyrolene ...). */
  material: string;
  /** Declared standard, when one governs the layer. */
  standard?: string;
  quantity: number;
  unit: PlasterUnit;
  /** How the number was produced, in plain words. */
  basis: string;
  packs?: PlasterPack[];
  optional?: boolean;
}

export interface PlasterRenderResult {
  system: PlasterSystem;
  region: PlasterRegion;
  marketCode: string;
  systemLabel: string;
  standardRef: string;
  grossAreaM2: number;
  openingsDeductedM2: number;
  netAreaM2: number;
  /** Area in the market's own display unit (ft² for US/CA). */
  netAreaDisplay: { value: number; unit: string };
  layers: PlasterLayerLine[];
  accessories: PlasterLayerLine[];
  substrate: {
    key: PlasterSubstrate;
    label: string;
    primerRequired: boolean;
    primerMultiplier: number;
    note: string;
  };
  packaging: {
    bagKg: number;
    pailKg: number;
    beadLengthM: number;
    unitSystem: "metric" | "imperial";
  };
  totals: {
    plasterKg: number;
    topcoatKg: number;
    primerLitres: number;
    meshRolls: number;
    beadPieces: number;
    bags: number;
  };
  warnings: string[];
  assumptions: string[];
}

/* ------------------------------------------------------------------ */
/* Published rates                                                     */
/* ------------------------------------------------------------------ */

/** kg per m² per 10 mm of gypsum plaster (Knauf MP 75: 8.3-10.0). */
export const GYPSUM_KG_PER_M2_PER_10MM = 9.5;
export const GYPSUM_THICKNESS_RANGE_MM = { min: 10, max: 15 } as const;

/**
 * Exterior topcoat consumption by grain size (Baumit GranoporTop TDS):
 * 1.5 mm ≈ 2.5, 2 mm ≈ 2.9, 3 mm ≈ 3.9 kg/m². Manufacturer spread is real:
 * the same market lists 2.4-2.7 / 3.0-3.4 / 4.2-4.8 across products, so the
 * result states the figure as manufacturer-dependent.
 */
export const TOPCOAT_KG_PER_M2: Record<RenderGrainMm, number> = {
  1.5: 2.5,
  2: 2.9,
  3: 3.9,
};

export const TOPCOAT_KG_RANGE: Record<RenderGrainMm, [number, number]> = {
  1.5: [2.4, 2.7],
  2: [3.0, 3.4],
  3: [4.2, 4.8],
};

/** Tyrolean: ≈1 kg/m² per mm of applied thickness (Cullamix TDS). */
export const TYROLEAN_KG_PER_M2_PER_MM = 1.0;
export const TYROLEAN_COAT_RANGE_MM = { min: 3, max: 5 } as const;
export const TYROLEAN_BACKING_RANGE_MM = { min: 12, max: 18 } as const;

/** Quartz / bonding primer: manufacturer spread 0.1-0.2 L/m². */
export const PRIMER_L_PER_M2 = 0.15;
/** Protective sealer over textured render: 0.1-0.15 L/m² per coat. */
export const SEALER_L_PER_M2 = 0.12;

/** ETICS mesh: 100 mm overlaps = +10% material (ETAG 004 / EAD). */
export const MESH_OVERLAP_PERCENT = 10;
export const MESH_ROLL_M2 = 50;

export const WASTE_DEFAULT_PERCENT = 10;

/* ------------------------------------------------------------------ */
/* Regional packaging and naming                                       */
/* ------------------------------------------------------------------ */

const AFRICA_MARKETS = new Set([
  "NG",
  "GH",
  "KE",
  "ZA",
  "ET",
  "EG",
  "TZ",
  "CI",
]);

const DACH_EU_MARKETS = new Set([
  "DE",
  "AT",
  "CH",
  "FR",
  "NL",
  "PL",
  "SE",
  "IT",
  "ES",
  "TR",
]);

export function regionForMarket(marketCode: string): PlasterRegion {
  const code = (marketCode || "").trim().toUpperCase();
  if (code === "GB" || code === "IE") return "uk";
  if (code === "US" || code === "CA") return "north_america";
  if (AFRICA_MARKETS.has(code)) return "africa";
  if (DACH_EU_MARKETS.has(code)) return "dach_eu";
  return "other";
}

interface PackagingProfile {
  bagKg: number;
  /** Render pail mass, as sold in that market. */
  pailKg: number;
  pailLabel: string;
  beadLengthM: number;
  unitSystem: "metric" | "imperial";
}

/**
 * What the product is actually sold in. 25 kg bags dominate EU/UK/Africa;
 * North America sells 50 lb (22.7 kg) bags and 5-gallon / 65 lb (29.5 kg)
 * pails, so a "25 kg pail" there would be a fiction.
 */
export function packagingForRegion(region: PlasterRegion): PackagingProfile {
  switch (region) {
    case "north_america":
      return {
        bagKg: 22.7, // 50 lb
        pailKg: 29.5, // 5 US gal / 65 lb
        pailLabel: "5 gal (65 lb) pail",
        beadLengthM: 3.05, // 10 ft
        unitSystem: "imperial",
      };
    case "africa":
      return {
        bagKg: 25,
        pailKg: 25,
        pailLabel: "25 kg bag",
        beadLengthM: 2.5,
        unitSystem: "metric",
      };
    default:
      return {
        bagKg: 25,
        pailKg: 25,
        pailLabel: "25 kg pail",
        beadLengthM: 2.5,
        unitSystem: "metric",
      };
  }
}

interface SystemNaming {
  label: string;
  standard: string;
  layers: { base: string; prime: string; top?: string };
}

export function systemNaming(
  system: PlasterSystem,
  region: PlasterRegion,
): SystemNaming {
  if (system === "gypsum_interior") {
    if (region === "north_america") {
      return {
        label: "One-Coat Veneer Gypsum Plaster",
        standard: "ASTM C587 / EN 13279",
        layers: {
          base: "Veneer gypsum plaster",
          prime: "Bonding agent (Haftgrund)",
        },
      };
    }
    return {
      label: region === "dach_eu" ? "Gipsputz (Innenputz)" : "Gypsum plaster",
      standard: "DIN EN 13279-1",
      layers: {
        base:
          region === "dach_eu" ? "Gipsputz, einschichtig" : "Gypsum plaster",
        prime: "Primer / bonding agent (Haftgrund)",
      },
    };
  }

  if (system === "exterior_render") {
    if (region === "north_america") {
      return {
        label: "Acrylic / Silicone Stucco Finish",
        standard: "ASTM C926",
        layers: {
          base: "Base coat with fibreglass mesh",
          prime: "Quartz primer",
          top: "Acrylic / silicone finish coat",
        },
      };
    }
    return {
      label:
        region === "dach_eu"
          ? "Außenputz / Oberputz (Kratz- oder Reibeputz)"
          : "Exterior mineral / silicone render",
      standard: "EN 15824 (organic-bound renders)",
      layers: {
        base: "Base coat / adhesive mortar with mesh",
        prime: "Quartz primer (Putzgrund)",
        top: "Topcoat (Kratzputz / Reibeputz / silicone resin)",
      },
    };
  }

  return {
    label:
      region === "africa"
        ? "Tyrolene textured render (German finish)"
        : "Textured mineral render (Tyrolean)",
    standard: "EN 15824 / local practice",
    layers: {
      base: "Sand-cement backing render",
      prime: "Bonding slurry / primer",
      top: "Tyrolene textured coat",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Substrate behaviour                                                 */
/* ------------------------------------------------------------------ */

interface SubstrateProfile {
  label: string;
  primerRequired: boolean;
  primerMultiplier: number;
  note: string;
}

const SUBSTRATES: Record<PlasterSubstrate, SubstrateProfile> = {
  aac: {
    label: "AAC / autoclaved aerated concrete",
    primerRequired: true,
    primerMultiplier: 1.5,
    note: "High suction: a bonding primer is mandatory, otherwise the plaster dries out before it sets.",
  },
  clay_brick: {
    label: "Clay brick",
    primerRequired: false,
    primerMultiplier: 1,
    note: "Normal suction; prime only when dusty or highly absorbent.",
  },
  sandcrete_block: {
    label: "Sandcrete block",
    primerRequired: true,
    primerMultiplier: 1.2,
    note: "Variable suction between blocks: prime to even out absorption before the backing coat.",
  },
  concrete: {
    label: "Smooth concrete",
    primerRequired: true,
    primerMultiplier: 1,
    note: "Smooth, low-suction face: a bonding agent (or spatterdash) is required for adhesion.",
  },
  eps_insulation: {
    label: "EPS insulation board (ETICS)",
    primerRequired: true,
    primerMultiplier: 1,
    note: "ETICS requires the system primer before the reinforcing layer; use the board manufacturer's system.",
  },
  mineral_wool: {
    label: "Mineral wool board (ETICS)",
    primerRequired: true,
    primerMultiplier: 1.1,
    note: "ETICS requires the system primer and the board maker's approved render build-up.",
  },
};

export function substrateProfile(
  substrate: PlasterSubstrate,
): SubstrateProfile {
  return SUBSTRATES[substrate];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function ceilPacks(total: number, packSize: number): number {
  if (!(packSize > 0)) return 0;
  return Math.ceil(total / packSize);
}

function areaFromInput(input: PlasterRenderInput): {
  grossAreaM2: number;
  openingsDeductedM2: number;
  netAreaM2: number;
} {
  const openings = Math.max(0, input.openingAreaM2 ?? 0);
  if (typeof input.areaM2 === "number" && input.areaM2 > 0) {
    return {
      grossAreaM2: round(input.areaM2 + openings),
      openingsDeductedM2: round(openings),
      netAreaM2: round(input.areaM2),
    };
  }
  const length = input.lengthM ?? 0;
  const height = input.heightM ?? 0;
  const count = input.wallCount ?? 1;
  const gross = Math.max(0, length * height * count);
  return {
    grossAreaM2: round(gross),
    openingsDeductedM2: round(Math.min(openings, gross)),
    netAreaM2: round(Math.max(0, gross - openings)),
  };
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export function calculatePlasterRender(
  input: PlasterRenderInput,
): PlasterRenderResult {
  const region = regionForMarket(input.marketCode);
  const naming = systemNaming(input.system, region);
  const packaging = packagingForRegion(region);
  const substrate = substrateProfile(input.substrate ?? "clay_brick");
  const wastePercent = input.wastePercent ?? WASTE_DEFAULT_PERCENT;
  const wasteFactor = 1 + wastePercent / 100;
  const bagKg = input.bagKgOverride ?? packaging.bagKg;
  const beadLengthM = input.beadLengthM ?? packaging.beadLengthM;

  const { grossAreaM2, openingsDeductedM2, netAreaM2 } = areaFromInput(input);
  const warnings: string[] = [];
  const assumptions: string[] = [];

  if (netAreaM2 <= 0) {
    warnings.push(
      "No wall area to calculate: enter a net area, or length, height and wall count.",
    );
  }

  const layers: PlasterLayerLine[] = [];
  const accessories: PlasterLayerLine[] = [];

  /* ---- primer (all systems, mandatory on high-suction substrates) ---- */
  const primerLitres = netAreaM2 * PRIMER_L_PER_M2 * substrate.primerMultiplier;
  layers.push({
    key: "primer",
    material: naming.layers.prime,
    standard: naming.standard,
    quantity: round(primerLitres),
    unit: "L",
    basis: `${PRIMER_L_PER_M2} L/m²${substrate.primerMultiplier !== 1 ? ` × ${substrate.primerMultiplier} substrate factor` : ""}. Manufacturer spread 0.1-0.2 L/m².`,
    optional: !substrate.primerRequired,
  });
  if (substrate.primerRequired) {
    assumptions.push(`Primer is mandatory on ${substrate.label}.`);
  } else {
    assumptions.push(
      `Primer is optional on ${substrate.label}; included as a line you can drop.`,
    );
  }

  let plasterKg = 0;
  let topcoatKg = 0;
  const primerOut = primerLitres;
  let meshRolls = 0;
  let beadPieces = 0;

  /* ---- gypsum interior ---- */
  if (input.system === "gypsum_interior") {
    const thickness = input.thicknessMm ?? 10;
    if (
      thickness < GYPSUM_THICKNESS_RANGE_MM.min ||
      thickness > GYPSUM_THICKNESS_RANGE_MM.max
    ) {
      warnings.push(
        `Gypsum thickness ${thickness} mm is outside the single-coat range ${GYPSUM_THICKNESS_RANGE_MM.min}-${GYPSUM_THICKNESS_RANGE_MM.max} mm; thicker work needs a two-coat build-up.`,
      );
    }
    if (input.wetZone) {
      warnings.push(
        "Wet zone selected: standard gypsum plaster (EN 13279-1 type B/C) is not suitable in continuously wet rooms. Use a water-resistant or cement-based system, or confirm the manufacturer's wet-area approval.",
      );
    }
    const kgPerM2 = (thickness / 10) * GYPSUM_KG_PER_M2_PER_10MM;
    const total = netAreaM2 * kgPerM2 * wasteFactor;
    plasterKg = total;
    layers.push({
      key: "gypsum_plaster",
      material: naming.layers.base,
      standard: naming.standard,
      quantity: round(total),
      unit: "kg",
      basis: `${netAreaM2} m² × ${thickness} mm × ${GYPSUM_KG_PER_M2_PER_10MM} kg/m² per 10 mm × ${wastePercent}% waste. Knauf MP 75: 25 kg covers 2.5-3.0 m² at 10 mm.`,
      packs: [
        {
          label: `${bagKg} kg bag`,
          packSize: bagKg,
          packUnit: "kg",
          count: ceilPacks(total, bagKg),
        },
      ],
    });
  }

  /* ---- exterior render: base + mesh + topcoat by grain ---- */
  if (input.system === "exterior_render") {
    const grain = input.grainMm ?? 2;
    const overlap = input.meshOverlapPercent ?? MESH_OVERLAP_PERCENT;
    const meshArea = netAreaM2 * (1 + overlap / 100);
    meshRolls = Math.ceil(meshArea / MESH_ROLL_M2);
    accessories.push({
      key: "mesh",
      material: "Alkali-resistant fibreglass mesh",
      quantity: round(meshArea),
      unit: "m2",
      basis: `${netAreaM2} m² × (1 + ${overlap}% overlap). 100 mm overlaps are the ETICS requirement (ETAG 004 / EAD 040083-00-0404).`,
      packs: [
        {
          label: `${MESH_ROLL_M2} m² roll`,
          packSize: MESH_ROLL_M2,
          packUnit: "m2",
          count: meshRolls,
        },
      ],
    });

    const topcoat = netAreaM2 * TOPCOAT_KG_PER_M2[grain] * wasteFactor;
    topcoatKg = topcoat;
    const [lo, hi] = TOPCOAT_KG_RANGE[grain];
    layers.push({
      key: "topcoat",
      material: naming.layers.top ?? "Topcoat",
      standard: naming.standard,
      quantity: round(topcoat),
      unit: "kg",
      basis: `${netAreaM2} m² × ${TOPCOAT_KG_PER_M2[grain]} kg/m² at ${grain} mm grain × ${wastePercent}% waste. Manufacturer range for this grain: ${lo}-${hi} kg/m², so treat the figure as product-specific.`,
      packs: [
        {
          label: packaging.pailLabel,
          packSize: packaging.pailKg,
          packUnit: "kg",
          count: ceilPacks(topcoat, packaging.pailKg),
        },
      ],
    });

    warnings.push(
      "Base coat consumption is product-specific (adhesive mortar over insulation vs render carrier board); this engine sizes the topcoat, mesh and primer, and leaves the base coat to the chosen ETICS system.",
    );
  }

  /* ---- Tyrolean: cement backing (existing engine) + textured coat ---- */
  if (input.system === "textured_tyrolene") {
    const backing = input.thicknessMm ?? 15;
    if (
      backing < TYROLEAN_BACKING_RANGE_MM.min ||
      backing > TYROLEAN_BACKING_RANGE_MM.max
    ) {
      warnings.push(
        `Backing render ${backing} mm is outside the usual ${TYROLEAN_BACKING_RANGE_MM.min}-${TYROLEAN_BACKING_RANGE_MM.max} mm for sand-cement backing; confirm with the applicator.`,
      );
    }
    const coat = input.texturedCoatMm ?? 4;
    if (
      coat < TYROLEAN_COAT_RANGE_MM.min ||
      coat > TYROLEAN_COAT_RANGE_MM.max
    ) {
      warnings.push(
        `Textured coat ${coat} mm is outside the usual ${TYROLEAN_COAT_RANGE_MM.min}-${TYROLEAN_COAT_RANGE_MM.max} mm; coverage scales at ≈1 kg/m² per mm.`,
      );
    }

    // Cement and sand maths stays in the existing plastering engine.
    const backingResult = calculatePlasteringTakeoff({
      marketCode: input.marketCode,
      surfaceAreaM2: netAreaM2,
      applicationType: "external_render",
      thicknessMm: backing,
      coats: 1,
      mixRatio: "1:4",
      surfaceRoughness: "medium",
      wastePercent,
    });
    layers.push({
      key: "backing_render",
      material: naming.layers.base,
      standard: "1:4 cement:sand by volume",
      quantity: round(backingResult.cementWeightKg),
      unit: "kg",
      basis: `${backing} mm at 1:4 mix over ${netAreaM2} m², sized by the existing plastering engine (cement ${round(backingResult.cementWeightKg)} kg, sand ${round(backingResult.sandVolumeM3, 3)} m³).`,
      packs: [
        {
          label: `${backingResult.cementBagWeightKg} kg cement bag`,
          packSize: backingResult.cementBagWeightKg,
          packUnit: "kg",
          count: backingResult.cementBagsRequired,
        },
      ],
    });
    accessories.push({
      key: "sand",
      material: "Sharp sand",
      quantity: round(backingResult.sandVolumeM3, 3),
      unit: "m2", // replaced below with m3 display
      basis: `Sand for the ${backing} mm backing at 1:4, from the plastering engine.`,
    });
    // correct unit: sand is a volume, not an area
    accessories[accessories.length - 1].unit = "m3" as PlasterUnit;

    const textured = netAreaM2 * TYROLEAN_KG_PER_M2_PER_MM * coat * wasteFactor;
    topcoatKg = textured;
    layers.push({
      key: "tyrolene",
      material: naming.layers.top ?? "Tyrolene textured coat",
      standard: naming.standard,
      quantity: round(textured),
      unit: "kg",
      basis: `${netAreaM2} m² × ${coat} mm × 1.0 kg/m² per mm × ${wastePercent}% waste. Cullamix TDS: ≈5 m² per 25 kg at 4-6 mm.`,
      packs: [
        {
          label: packaging.pailLabel,
          packSize: packaging.pailKg,
          packUnit: "kg",
          count: ceilPacks(textured, packaging.pailKg),
        },
      ],
    });

    const sealer = netAreaM2 * SEALER_L_PER_M2;
    layers.push({
      key: "sealer",
      material: "Protective sealer / paint coat",
      quantity: round(sealer),
      unit: "L",
      basis: `${SEALER_L_PER_M2} L/m² over ${netAreaM2} m²; one coat, add a second where the surface is porous.`,
      optional: true,
    });
  }

  /* ---- beads and stop profiles ---- */
  const beadLength =
    Math.max(0, input.externalCornerLengthM ?? 0) +
    Math.max(0, input.openingPerimeterM ?? 0);
  if (beadLength > 0) {
    beadPieces = Math.ceil(beadLength / beadLengthM);
    accessories.push({
      key: "beads",
      material:
        input.system === "gypsum_interior"
          ? "Corner / stop beads"
          : "Corner, stop and drip beads",
      quantity: round(beadLength),
      unit: "m",
      basis: `${round(beadLength)} m of corners and reveals ÷ ${beadLengthM} m lengths.`,
      packs: [
        {
          label: `${beadLengthM} m length`,
          packSize: beadLengthM,
          packUnit: "m",
          count: beadPieces,
        },
      ],
    });
  } else {
    assumptions.push(
      "No corner or reveal length entered, so no beads are priced. Enter external corner heights plus window/door perimeters to include them.",
    );
  }

  if (netAreaM2 > 0 && input.system !== "gypsum_interior") {
    warnings.push(
      "Openings must be deducted from the render area before ordering: renders do not bridge openings, and reveals are measured separately.",
    );
  }

  const bags = layers
    .flatMap((l) => l.packs ?? [])
    .filter((p) => p.packUnit === "kg")
    .reduce((n, p) => n + p.count, 0);

  const imperial = packaging.unitSystem === "imperial";
  return {
    system: input.system,
    region,
    marketCode: (input.marketCode || "").toUpperCase(),
    systemLabel: naming.label,
    standardRef: naming.standard,
    grossAreaM2,
    openingsDeductedM2,
    netAreaM2,
    netAreaDisplay: imperial
      ? { value: round(netAreaM2 * 10.7639), unit: "sq ft" }
      : { value: round(netAreaM2), unit: "m²" },
    layers,
    accessories,
    substrate: {
      key: input.substrate ?? "clay_brick",
      label: substrate.label,
      primerRequired: substrate.primerRequired,
      primerMultiplier: substrate.primerMultiplier,
      note: substrate.note,
    },
    packaging: {
      bagKg,
      pailKg: packaging.pailKg,
      beadLengthM,
      unitSystem: packaging.unitSystem,
    },
    totals: {
      plasterKg: round(plasterKg),
      topcoatKg: round(topcoatKg),
      primerLitres: round(primerOut),
      meshRolls,
      beadPieces,
      bags,
    },
    warnings,
    assumptions,
  };
}

/* ------------------------------------------------------------------ */
/* Search copy per market                                              */
/* ------------------------------------------------------------------ */

export interface PlasterSearchCopy {
  title: string;
  description: string;
}

/**
 * What a contractor in each region actually types. The page is one route, so
 * its title and description follow the active market instead of shipping four
 * near-duplicate pages that compete with each other.
 */
export function plasterSearchCopy(region: PlasterRegion): PlasterSearchCopy {
  switch (region) {
    case "dach_eu":
      return {
        title:
          "Gipsputz Rechner m², Außenputz Verbrauch berechnen, Silikonharzputz Menge | FRELUX",
        description:
          "Gipsputz Rechner nach DIN EN 13279, Außenputz und Silikonharzputz Verbrauch nach EN 15824: Schichten, Gewebe, Eckenprofile und Sackgrößen für Deutschland, Österreich und die Schweiz.",
      };
    case "uk":
      return {
        title:
          "Gypsum Plaster Calculator m², Silicone Render Calculator | FRELUX",
        description:
          "Gypsum plaster and silicone render calculator in square metres: EN 13279 plaster by thickness, EN 15824 render by grain size, mesh with 100 mm overlaps, beads and 25 kg bags and pails.",
      };
    case "north_america":
      return {
        title:
          "Gypsum Plaster and Acrylic Stucco Finish Coat Calculator | FRELUX",
        description:
          "One-coat veneer gypsum plaster (ASTM C587) and acrylic or silicone stucco finish coat (ASTM C926) calculator in square feet, with 50 lb bags, 5 gallon pails and fibreglass mesh.",
      };
    case "africa":
      return {
        title:
          "German Wall Plaster Calculator Nigeria, Tyrolene and Cement Mix Calculator | FRELUX",
        description:
          "German plaster and Tyrolene calculator for Nigeria and West Africa: sand cement backing at 1:4 or 1:6, textured coat at 3 to 5 mm, cement bags, sharp sand and 25 kg Tyrolene bags.",
      };
    default:
      return {
        title: "Plaster and Render Systems Calculator | FRELUX",
        description:
          "Gypsum plaster, exterior render and Tyrolene calculator by layer: primer, plaster or topcoat, mesh, beads and sealer, packaged for the market you buy in.",
      };
  }
}

/* ------------------------------------------------------------------ */
/* BIM / 5D hook                                                       */
/* ------------------------------------------------------------------ */

export interface PlasterAreaFromModel {
  /** Area the model declares (or derives) for plastering/cladding coverings. */
  coveringAreaM2: number;
  /** Coverings that carried a usable area. */
  coveringsCounted: number;
  /** Coverings found but with no area the loader could read. */
  coveringsWithoutArea: number;
  /** Openings present in the model, which the caller must deduct if the
   *  coverings are gross rather than net. */
  openingCount: number;
  notes: string[];
}

/**
 * Sum plaster/cladding areas from an already-parsed IFC model.
 *
 * The loader reads declared IfcQuantityArea, and geometry-derived surface area
 * when nothing is declared. Neither is automatically "net of openings", so the
 * opening count is reported for the user to check rather than silently
 * subtracted.
 */
export function plasterAreasFromModel(
  elements: readonly IfcModelElement[],
): PlasterAreaFromModel {
  const notes: string[] = [];
  let coveringAreaM2 = 0;
  let coveringsCounted = 0;
  let coveringsWithoutArea = 0;

  const coverings = elements.filter((e) => e.ifcClass === "IFCCOVERING");
  for (const covering of coverings) {
    const declared = covering.quantities.find((q) => q.kind === "area");
    const derived = covering.derivedQuantities?.find((q) => q.kind === "area");
    const area = declared?.value ?? derived?.value;
    if (typeof area === "number" && area > 0) {
      coveringAreaM2 += area;
      coveringsCounted += 1;
    } else {
      coveringsWithoutArea += 1;
    }
  }

  const openingCount = elements.filter(
    (e) => e.ifcClass === "IFCDOOR" || e.ifcClass === "IFCWINDOW",
  ).length;

  if (coverings.length === 0) {
    notes.push(
      "No IfcCovering elements found: the model does not carry plaster/render areas, so enter the net area manually.",
    );
  }
  if (coveringsWithoutArea > 0) {
    notes.push(
      `${coveringsWithoutArea} covering(s) carry no readable area and are excluded rather than estimated.`,
    );
  }
  if (openingCount > 0) {
    notes.push(
      `${openingCount} opening(s) (doors/windows) are present. If the coverings are gross, deduct the openings before ordering.`,
    );
  }
  if (coverings.length > 0) {
    notes.push(
      "Only IfcCovering is read for plaster areas; wall areas without coverings are not counted.",
    );
  }

  return {
    coveringAreaM2: round(coveringAreaM2),
    coveringsCounted,
    coveringsWithoutArea,
    openingCount,
    notes,
  };
}

/**
 * Assembly library.
 *
 * An assembly turns one measured quantity into the materials it consumes. Every
 * constant here is either a stated default the caller may override or is
 * derived from a physical dimension in the same function, so a reviewer can
 * check the line by hand.
 *
 * Defaults are conventional, not authoritative for any one market: block faces,
 * render thickness, tile size and paint coverage all vary. Anything market
 * specific belongs in the caller's spec, and the derivation always prints the
 * value actually used.
 */

import type { Derivation, QuantityUnit } from "./types";
import { applyWaste, packsRequired, round } from "./measure";

export interface AssemblyMaterialLine {
  material: string;
  unit: QuantityUnit | "kg" | "m3" | "L";
  /** Quantity before waste. */
  netQuantity: number;
  wastePct: number;
  quantity: number;
  /** Whole bags, packs or buckets when the material is sold that way. */
  purchaseQuantity?: number;
  purchaseUnit?: string;
  derivation: Derivation;
}

/**
 * One 50 kg bag of cement, as a volume of finished material.
 *
 * 50 kg at a bulk density of 1440 kg/m3 is 0.03472 m3, so 0.0347 is used. The
 * other Frelux material engines (build-to-roof, foundation, advanced takeoff,
 * wall finishing) already use this figure; keeping 0.035 here made the same bag
 * of cement 0.9 percent larger in this engine than in the rest of the product.
 */
export const CEMENT_DENSITY_KG_M3 = 1440;
export const CEMENT_BAG_KG = 50;
/** Volume of the default 50 kg bag, derived from its mass, not typed in. */
export const CEMENT_BAG_M3 = CEMENT_BAG_KG / CEMENT_DENSITY_KG_M3;
/**
 * Dry-to-wet volume factor for mortar.
 *
 * Cement and sand are batched dry and the water is absorbed into the voids, so a
 * cubic metre of wet mortar is not a cubic metre of dry material: 1.33 m3 of dry
 * mix makes 1 m3 of laid mortar. The same 1.33 is used by
 * src/lib/wallfinishing/quantity-engine.ts, and this engine previously applied
 * no factor at all, which understated the cement in every mortar line by a
 * quarter and disagreed with the plaster engine on the same wall.
 */
export const MORTAR_DRY_FACTOR = 1.33;

export interface BlockworkSpec {
  /** Face dimensions of the unit, in millimetres. */
  blockLengthMm?: number;
  blockHeightMm?: number;
  /** Mortar volume consumed per square metre of finished wall. */
  mortarPerM2M3?: number;
  /** Cement to sand parts, e.g. 1:6. */
  mix?: { cement: number; sand: number };
  /**
   * Mass of one cement bag on the local market, in kilograms. Defaults to the
   * 50 kg bag used across the engines. A market that sells 42.6 kg (94 lb) or
   * 40 kg bags passes that mass and gets its own bag count, because a bag is a
   * package, not a unit of cement.
   */
  cementBagKg?: number;
  wastePct?: number;
  mortarWastePct?: number;
}

/**
 * Blocks are counted on the face: one square metre of wall holds
 * 1 / (length x height) units before waste and before mortar joint thickening.
 */
export function blockworkAssembly(
  areaM2: number,
  spec: BlockworkSpec = {},
): AssemblyMaterialLine[] {
  const lengthMm = spec.blockLengthMm ?? 450;
  const heightMm = spec.blockHeightMm ?? 225;
  const mortarPerM2 = spec.mortarPerM2M3 ?? 0.03;
  const cement = Math.max(1, spec.mix?.cement ?? 1);
  const sand = Math.max(1, spec.mix?.sand ?? 6);
  const wastePct = spec.wastePct ?? 5;
  const mortarWastePct = spec.mortarWastePct ?? 10;
  const bagKg =
    spec.cementBagKg !== undefined && Number.isFinite(spec.cementBagKg) && spec.cementBagKg > 0
      ? spec.cementBagKg
      : CEMENT_BAG_KG;
  const bagM3 = bagKg / CEMENT_DENSITY_KG_M3;

  const faceM2 = (lengthMm / 1000) * (heightMm / 1000);
  const perM2 = faceM2 > 0 ? 1 / faceM2 : 0;
  const netBlocks = round(areaM2 * perM2, 4);
  const blocks = applyWaste(netBlocks, wastePct);

  const mortarNet = round(areaM2 * mortarPerM2, 4);
  const mortar = applyWaste(mortarNet, mortarWastePct);
  const parts = cement + sand;
  const mortarDryM3 = mortar * MORTAR_DRY_FACTOR;
  const cementM3 = mortarDryM3 * (cement / parts);
  const sandM3 = mortarDryM3 * (sand / parts);
  const cementBags = cementM3 > 0 ? Math.ceil(cementM3 / bagM3) : 0;

  return [
    {
      material: "Blocks",
      unit: "nr",
      netQuantity: netBlocks,
      wastePct,
      quantity: blocks,
      purchaseQuantity: Math.ceil(blocks),
      purchaseUnit: "blocks",
      derivation: {
        formula: "area x 1 / (block length x block height), then waste",
        inputs: {
          areaM2: round(areaM2, 4),
          blockLengthMm: lengthMm,
          blockHeightMm: heightMm,
          wastePct,
        },
        steps: [
          { label: "Face area per block", value: round(faceM2, 4), unit: "m2" },
          { label: "Blocks per m2", value: round(perM2, 2), unit: "nr" },
          { label: "Before waste", value: netBlocks, unit: "nr" },
        ],
      },
    },
    {
      material: "Mortar",
      unit: "m3",
      netQuantity: mortarNet,
      wastePct: mortarWastePct,
      quantity: mortar,
      derivation: {
        formula: "area x mortar per m2, then waste",
        inputs: {
          areaM2: round(areaM2, 4),
          mortarPerM2M3: mortarPerM2,
          mortarWastePct,
        },
        steps: [
          { label: "Mortar, wet", value: mortar, unit: "m3" },
          { label: "Dry mix", value: round(mortarDryM3, 4), unit: "m3" },
        ],
      },
    },
    {
      material: "Cement",
      unit: "kg",
      netQuantity: round((cementM3 / bagM3) * bagKg, 2),
      wastePct: mortarWastePct,
      quantity: round(cementBags * bagKg, 2),
      purchaseQuantity: cementBags,
      purchaseUnit: `bags of ${bagKg} kg`,
      derivation: {
        formula:
          "wet mortar x dry factor x cement parts / total parts / bag volume, rounded up to whole bags",
        inputs: { mortarM3: mortar, dryFactor: MORTAR_DRY_FACTOR, cement, sand, bagKg, bagM3: round(bagM3, 4) },
        steps: [
          { label: "Dry mix", value: round(mortarDryM3, 4), unit: "m3" },
          { label: "Cement volume", value: round(cementM3, 4), unit: "m3" },
          { label: "Bags", value: cementBags, unit: "nr" },
        ],
      },
    },
    {
      material: "Sand",
      unit: "m3",
      netQuantity: round(sandM3, 4),
      wastePct: mortarWastePct,
      quantity: round(sandM3, 4),
      derivation: {
        formula: "mortar x sand parts / total parts",
        inputs: { mortarM3: mortar, cement, sand },
      },
    },
  ];
}

export interface RenderSpec {
  thicknessMm?: number;
  mix?: { cement: number; sand: number };
  wastePct?: number;
}

export function renderAssembly(
  areaM2: number,
  spec: RenderSpec = {},
): AssemblyMaterialLine[] {
  const thicknessMm = spec.thicknessMm ?? 15;
  const cement = Math.max(1, spec.mix?.cement ?? 1);
  const sand = Math.max(1, spec.mix?.sand ?? 4);
  const wastePct = spec.wastePct ?? 10;

  const netMortar = round(areaM2 * (thicknessMm / 1000), 4);
  const mortar = applyWaste(netMortar, wastePct);
  const parts = cement + sand;
  const cementBags = Math.ceil((mortar * (cement / parts)) / CEMENT_BAG_M3);

  return [
    {
      material: "Render mortar",
      unit: "m3",
      netQuantity: netMortar,
      wastePct,
      quantity: mortar,
      derivation: {
        formula: "area x thickness, then waste",
        inputs: { areaM2: round(areaM2, 4), thicknessMm, wastePct },
      },
    },
    {
      material: "Cement",
      unit: "kg",
      netQuantity: round(
        ((mortar * (cement / parts)) / CEMENT_BAG_M3) * CEMENT_BAG_KG,
        2,
      ),
      wastePct,
      quantity: round(cementBags * CEMENT_BAG_KG, 2),
      purchaseQuantity: cementBags,
      purchaseUnit: "bags of 50 kg",
      derivation: {
        formula:
          "mortar x cement parts / total parts / bag volume, rounded up to whole bags",
        inputs: { mortarM3: mortar, cement, sand, bagM3: CEMENT_BAG_M3 },
      },
    },
  ];
}

export interface PaintSpec {
  coats?: number;
  coverageM2PerLitre?: number;
  packLitres?: number;
  wastePct?: number;
}

export function paintAssembly(
  areaM2: number,
  spec: PaintSpec = {},
): AssemblyMaterialLine[] {
  const coats = Math.max(1, spec.coats ?? 2);
  const coverage = spec.coverageM2PerLitre ?? 10;
  const packLitres = spec.packLitres ?? 5;
  const wastePct = spec.wastePct ?? 5;

  const netLitres = coverage > 0 ? round((areaM2 * coats) / coverage, 3) : 0;
  const litres = applyWaste(netLitres, wastePct);
  const packs = packLitres > 0 ? packsRequired(litres, packLitres) : 0;

  return [
    {
      material: "Paint",
      unit: "L",
      netQuantity: netLitres,
      wastePct,
      quantity: litres,
      purchaseQuantity: packs,
      purchaseUnit: `${packLitres} L packs`,
      derivation: {
        formula: "area x coats / coverage, then waste, rounded up to packs",
        inputs: {
          areaM2: round(areaM2, 4),
          coats,
          coverage,
          packLitres,
          wastePct,
        },
        steps: [
          { label: "Litres before waste", value: netLitres, unit: "L" },
          { label: "Packs", value: packs, unit: "nr" },
        ],
      },
    },
  ];
}

export interface TileSpec {
  tileLengthMm?: number;
  tileWidthMm?: number;
  adhesiveKgPerM2?: number;
  groutKgPerM2?: number;
  packCoverageM2?: number;
  wastePct?: number;
}

export function floorTileAssembly(
  areaM2: number,
  spec: TileSpec = {},
): AssemblyMaterialLine[] {
  const lengthMm = spec.tileLengthMm ?? 600;
  const widthMm = spec.tileWidthMm ?? 600;
  const adhesivePerM2 = spec.adhesiveKgPerM2 ?? 4;
  const groutPerM2 = spec.groutKgPerM2 ?? 0.5;
  const wastePct = spec.wastePct ?? 10;

  const tileM2 = (lengthMm / 1000) * (widthMm / 1000);
  const perM2 = tileM2 > 0 ? 1 / tileM2 : 0;
  const netTiles = round(areaM2 * perM2, 4);
  const tiles = applyWaste(netTiles, wastePct);

  const netAdhesive = round(areaM2 * adhesivePerM2, 2);
  const netGrout = round(areaM2 * groutPerM2, 2);
  const packs = spec.packCoverageM2
    ? packsRequired(applyWaste(areaM2, wastePct), spec.packCoverageM2)
    : undefined;

  const lines: AssemblyMaterialLine[] = [
    {
      material: "Tiles",
      unit: "nr",
      netQuantity: netTiles,
      wastePct,
      quantity: tiles,
      purchaseQuantity: roundUpTiles(tiles),
      purchaseUnit: "tiles",
      derivation: {
        formula: "area x 1 / (tile length x tile width), then waste",
        inputs: {
          areaM2: round(areaM2, 4),
          tileLengthMm: lengthMm,
          tileWidthMm: widthMm,
          wastePct,
        },
        steps: [
          { label: "Tiles per m2", value: round(perM2, 2), unit: "nr" },
          { label: "Before waste", value: netTiles, unit: "nr" },
        ],
      },
    },
    {
      material: "Tile adhesive",
      unit: "kg",
      netQuantity: netAdhesive,
      wastePct,
      quantity: applyWaste(netAdhesive, wastePct),
      purchaseQuantity: Math.ceil(applyWaste(netAdhesive, wastePct) / 20),
      purchaseUnit: "bags of 20 kg",
      derivation: {
        formula: "area x adhesive per m2, then waste",
        inputs: { areaM2: round(areaM2, 4), adhesivePerM2, wastePct },
      },
    },
    {
      material: "Grout",
      unit: "kg",
      netQuantity: netGrout,
      wastePct,
      quantity: applyWaste(netGrout, wastePct),
      derivation: {
        formula: "area x grout per m2, then waste",
        inputs: { areaM2: round(areaM2, 4), groutPerM2, wastePct },
      },
    },
  ];

  if (packs !== undefined) {
    lines.push({
      material: "Tile packs",
      unit: "packs",
      netQuantity: round(areaM2, 4),
      wastePct,
      quantity: packs,
      purchaseQuantity: packs,
      purchaseUnit: "packs",
      derivation: {
        formula: "wasted area / coverage per pack, rounded up",
        inputs: {
          areaM2: round(areaM2, 4),
          wastePct,
          packCoverageM2: spec.packCoverageM2 ?? 0,
        },
      },
    });
  }

  return lines;
}

const roundUpTiles = (tiles: number): number =>
  Math.ceil(round(tiles, 4) - 1e-9);

export interface ScreedSpec {
  thicknessMm?: number;
  mix?: { cement: number; sand: number };
  wastePct?: number;
}

export function screedAssembly(
  areaM2: number,
  spec: ScreedSpec = {},
): AssemblyMaterialLine[] {
  const thicknessMm = spec.thicknessMm ?? 50;
  const cement = Math.max(1, spec.mix?.cement ?? 1);
  const sand = Math.max(1, spec.mix?.sand ?? 4);
  const wastePct = spec.wastePct ?? 10;

  const netVolume = round(areaM2 * (thicknessMm / 1000), 4);
  const volume = applyWaste(netVolume, wastePct);
  const parts = cement + sand;
  const cementBags = Math.ceil((volume * (cement / parts)) / CEMENT_BAG_M3);

  return [
    {
      material: "Screed concrete",
      unit: "m3",
      netQuantity: netVolume,
      wastePct,
      quantity: volume,
      derivation: {
        formula: "area x thickness, then waste",
        inputs: { areaM2: round(areaM2, 4), thicknessMm, wastePct },
      },
    },
    {
      material: "Cement",
      unit: "kg",
      netQuantity: round(
        ((volume * (cement / parts)) / CEMENT_BAG_M3) * CEMENT_BAG_KG,
        2,
      ),
      wastePct,
      quantity: round(cementBags * CEMENT_BAG_KG, 2),
      purchaseQuantity: cementBags,
      purchaseUnit: "bags of 50 kg",
      derivation: {
        formula: "volume x cement parts / total parts, rounded up to bags",
        inputs: { volumeM3: volume, cement, sand, bagM3: CEMENT_BAG_M3 },
      },
    },
    {
      material: "Sand",
      unit: "m3",
      netQuantity: round(volume * (sand / parts), 4),
      wastePct,
      quantity: round(volume * (sand / parts), 4),
      derivation: {
        formula: "volume x sand parts / total parts",
        inputs: { volumeM3: volume, cement, sand },
      },
    },
  ];
}

export interface SkirtingSpec {
  /** Stock length of one skirting board, in metres. */
  boardLengthM?: number;
  /** Adhesive or fixing allowance per linear metre, in kilograms. */
  adhesiveKgPerM?: number;
  wastePct?: number;
}

/**
 * Skirting is bought in stock lengths, so the count comes from the run divided
 * by the board length and rounded up. A 2.4 m board cannot be joined invisibly
 * mid run, but waste already covers the offcuts.
 */
export function skirtingAssembly(
  lengthM: number,
  spec: SkirtingSpec = {},
): AssemblyMaterialLine[] {
  const boardLengthM = spec.boardLengthM ?? 2.4;
  const adhesivePerM = spec.adhesiveKgPerM ?? 0.05;
  const netLength = round(Math.max(0, lengthM), 3);
  const totalLength = applyWaste(netLength, 6);
  const boards =
    boardLengthM > 0
      ? Math.ceil(round(totalLength / boardLengthM, 4) - 1e-9)
      : 0;
  const adhesive = round(applyWaste(netLength * adhesivePerM, 5), 2);

  return [
    {
      material: "Skirting boards",
      unit: "m",
      netQuantity: netLength,
      wastePct: 6,
      quantity: totalLength,
      purchaseQuantity: boards,
      purchaseUnit: `${boardLengthM} m boards`,
      derivation: {
        formula:
          "net run, then 6% waste, divided into stock lengths rounded up",
        inputs: { lengthM: netLength, boardLengthM },
        steps: [
          { label: "Run before waste", value: netLength, unit: "m" },
          { label: "Boards", value: boards, unit: "nr" },
        ],
      },
    },
    {
      material: "Skirting adhesive",
      unit: "kg",
      netQuantity: round(netLength * adhesivePerM, 3),
      wastePct: 5,
      quantity: adhesive,
      derivation: {
        formula: "run x adhesive per metre, then waste",
        inputs: { lengthM: netLength, adhesivePerM },
      },
    },
  ];
}

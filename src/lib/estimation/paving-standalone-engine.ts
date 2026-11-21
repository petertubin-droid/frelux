/** Paving material takeoff. Rates are user-editable planning assumptions, not design specifications. */
import { SAND_DENSITY_KG_M3 } from "@/lib/materials/sand-units";
export interface PavingCalculationInput {
  marketCode: string;
  areaM2: number;
  paverLengthMm?: number;
  paverWidthMm?: number;
  paverThicknessMm?: number;
  jointWidthMm?: number;
  layingPattern?: "running" | "herringbone" | "basketweave";
  wastePercent?: number;
  beddingDepthMm?: number;
  /**
   * Loose-to-compacted factor for the bedding sand. The bedding depth is the
   * compacted thickness the pavers sit on, and sand is bought loose, so the
   * volume ordered is the compacted volume times this factor.
   */
  beddingCompactionFactor?: number;
  /**
   * Depth of joint the jointing sand actually fills, mm. Under vibration the
   * sand penetrates part-way down the joint rather than filling the full paver
   * depth, so this is a fill depth, not the paver thickness.
   */
  jointSandFillDepthMm?: number;
  subbaseDepthMm?: number;
  compactedToLooseFactor?: number;
  sandBulkDensityTonnesM3?: number;
  subbaseBulkDensityTonnesM3?: number;
  edgeLengthM?: number;
  edgeUnitLengthM?: number;
}
export interface PavingCalculationResult {
  marketCode: string;
  areaM2: number;
  paversRequired: number;
  paverWastePercent: number;
  /** Loose sand to order, m3. */
  beddingSandVolumeM3: number;
  beddingSandTonnes: number;
  /** Kiln-dried jointing sand, kg. */
  jointingSandKg: number;
  compactedSubbaseVolumeM3: number;
  looseSubbaseVolumeM3: number;
  subbaseTonnes: number;
  /** Null when no edge run was entered, rather than a misleading zero. */
  edgeUnits: number | null;
  assumptions: string[];
}
export function calculatePavingTakeoff(
  input: PavingCalculationInput,
): PavingCalculationResult {
  const marketCode = (input.marketCode || "UNSPECIFIED").toUpperCase();
  const area = Math.max(0, input.areaM2);
  const paverLengthM = Math.max(0.001, (input.paverLengthMm ?? 200) / 1000);
  const paverWidthM = Math.max(0.001, (input.paverWidthMm ?? 100) / 1000);
  const jointM = Math.max(0, (input.jointWidthMm ?? 3) / 1000);
  const waste = Math.max(
    0,
    input.wastePercent ?? (input.layingPattern === "herringbone" ? 10 : 5),
  );
  const paverCount = Math.ceil(
    (area / ((paverLengthM + jointM) * (paverWidthM + jointM))) *
      (1 + waste / 100),
  );
  const beddingDepth = Math.max(0, input.beddingDepthMm ?? 30) / 1000;
  const subbaseDepth = Math.max(0, input.subbaseDepthMm ?? 150) / 1000;
  const compactionFactor = Math.max(1, input.compactedToLooseFactor ?? 1.25);
  const beddingCompaction = Math.max(1, input.beddingCompactionFactor ?? 1.2);
  // Bedding sand is not affected by how the pavers are cut. The figure ordered is
  // the compacted bedding volume at the specified depth, taken to loose sand by
  // the bedding factor, which is where the real allowance lies: sand laid at
  // 40 mm loose compacts to about 30 mm under the plate.
  const beddingVolume = area * beddingDepth * beddingCompaction;
  // Jointing sand fills the gaps between pavers: the joint area is everything
  // the paver faces do not cover, and it is filled to the depth the sand
  // reaches under the plate, not to the full paver thickness. Published trade
  // figures put a 25 kg bag over 8 to 15 m2 (1.7 to 3.1 kg/m2); the geometric
  // figure for 200 x 100 at a 3 mm joint and a 40 mm fill is 2.8 kg/m2.
  const jointAreaFraction =
    1 -
    (paverLengthM * paverWidthM) /
      ((paverLengthM + jointM) * (paverWidthM + jointM));
  const jointFillDepth = Math.max(0, input.jointSandFillDepthMm ?? 40) / 1000;
  const sandDensityKgM3 =
    Math.max(0, input.sandBulkDensityTonnesM3 ?? SAND_DENSITY_KG_M3 / 1000) *
    1000;
  const jointingSandKg = area * jointAreaFraction * jointFillDepth * sandDensityKgM3;
  const compactedSubbase = area * subbaseDepth;
  const looseSubbase = compactedSubbase * compactionFactor;
  const edgeUnitLength = Math.max(0.01, input.edgeUnitLengthM ?? 1);
  const edgeUnits =
    input.edgeLengthM === undefined
      ? null
      : Math.ceil(Math.max(0, input.edgeLengthM) / edgeUnitLength);
  return {
    marketCode,
    areaM2: Number(area.toFixed(2)),
    paversRequired: paverCount,
    paverWastePercent: waste,
    beddingSandVolumeM3: Number(beddingVolume.toFixed(3)),
    beddingSandTonnes: Number(
      (beddingVolume * (sandDensityKgM3 / 1000)).toFixed(2),
    ),
    jointingSandKg: Number(jointingSandKg.toFixed(2)),
    compactedSubbaseVolumeM3: Number(compactedSubbase.toFixed(3)),
    looseSubbaseVolumeM3: Number(looseSubbase.toFixed(3)),
    subbaseTonnes: Number(
      (
        looseSubbase * Math.max(0, input.subbaseBulkDensityTonnesM3 ?? 1.8)
      ).toFixed(2),
    ),
    edgeUnits,
    assumptions: [
      "Paver count uses nominal face dimensions plus the entered joint width; confirm actual product dimensions and laying pattern.",
      "Bedding depth, subbase depth, compaction factor, and bulk densities are planning inputs and must be set for site conditions and local design.",
      `Bedding sand is ordered as loose sand for a ${input.beddingDepthMm ?? 30} mm compacted bed at ${beddingCompaction} times that volume; the paver waste figure applies to pavers only and does not change the sand.`,
      `Jointing sand is the joint area of a ${input.paverLengthMm ?? 200} x ${input.paverWidthMm ?? 100} paver at a ${input.jointWidthMm ?? 3} mm joint, filled to ${input.jointSandFillDepthMm ?? 40} mm, at ${sandDensityKgM3} kg/m3.`,
      ...(input.edgeLengthM === undefined
        ? []
        : [
            `Edge units are counted at ${edgeUnitLength} m each; set the unit length to the kerb or edging actually specified (a 600 mm kerb doubles the count on the same edge run).`,
          ]),
    ],
  };
}

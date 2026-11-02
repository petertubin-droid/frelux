/** Paving material takeoff. Rates are user-editable planning assumptions, not design specifications. */
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
  beddingSandVolumeM3: number;
  beddingSandTonnes: number;
  compactedSubbaseVolumeM3: number;
  looseSubbaseVolumeM3: number;
  subbaseTonnes: number;
  edgeUnits: number;
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
  const beddingVolume = area * beddingDepth * (1 + waste / 100);
  const compactedSubbase = area * subbaseDepth;
  const looseSubbase = compactedSubbase * compactionFactor;
  const edgeUnitLength = Math.max(0.01, input.edgeUnitLengthM ?? 1);
  return {
    marketCode,
    areaM2: Number(area.toFixed(2)),
    paversRequired: paverCount,
    paverWastePercent: waste,
    beddingSandVolumeM3: Number(beddingVolume.toFixed(3)),
    beddingSandTonnes: Number(
      (
        beddingVolume * Math.max(0, input.sandBulkDensityTonnesM3 ?? 1.6)
      ).toFixed(2),
    ),
    compactedSubbaseVolumeM3: Number(compactedSubbase.toFixed(3)),
    looseSubbaseVolumeM3: Number(looseSubbase.toFixed(3)),
    subbaseTonnes: Number(
      (
        looseSubbase * Math.max(0, input.subbaseBulkDensityTonnesM3 ?? 1.8)
      ).toFixed(2),
    ),
    edgeUnits: Math.ceil(Math.max(0, input.edgeLengthM ?? 0) / edgeUnitLength),
    assumptions: [
      "Paver count uses nominal face dimensions plus the entered joint width; confirm actual product dimensions and laying pattern.",
      "Bedding depth, subbase depth, compaction factor, and bulk densities are planning inputs and must be set for site conditions and local design.",
    ],
  };
}

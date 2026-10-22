/** Preliminary gravity drainage material takeoff. Not a hydraulic or code-compliance design. */
export interface DrainageRun {
  lengthM: number;
  pipeDiameterMm: number;
  fallMmPerM: number;
  pipeStockLengthM?: number;
}
export interface DrainageCalculationInput {
  marketCode: string;
  runs: DrainageRun[];
  inspectionChambers?: number;
  chambersPerConnection?: number;
  beddingDepthM?: number;
  beddingWidthFactor?: number;
  beddingWastePercent?: number;
  trenchWidthM?: number;
  trenchDepthM?: number;
  manholeCount?: number;
}
export interface DrainageCalculationResult {
  marketCode: string;
  totalPipeLengthM: number;
  pipeStockPieces: number;
  runs: Array<{
    lengthM: number;
    diameterMm: number;
    fallMmPerM: number;
    fallTotalMm: number;
    pipePieces: number;
  }>;
  inspectionChambers: number;
  manholes: number;
  beddingVolumeM3: number;
  excavationVolumeM3: number;
  cautions: string[];
}
export function calculateDrainageTakeoff(
  input: DrainageCalculationInput,
): DrainageCalculationResult {
  const marketCode = (input.marketCode || "UNSPECIFIED").toUpperCase();
  const runs = input.runs.map((r) => {
    const length = Math.max(0, r.lengthM);
    const stock = Math.max(0.1, r.pipeStockLengthM ?? 6);
    return {
      lengthM: Number(length.toFixed(2)),
      diameterMm: Math.max(0, r.pipeDiameterMm),
      fallMmPerM: Math.max(0, r.fallMmPerM),
      fallTotalMm: Number((length * Math.max(0, r.fallMmPerM)).toFixed(0)),
      pipePieces: Math.ceil(length / stock),
    };
  });
  const totalPipeLengthM = runs.reduce((sum, r) => sum + r.lengthM, 0);
  const pipeStockPieces = runs.reduce((sum, r) => sum + r.pipePieces, 0);
  const chambers =
    Math.max(0, input.inspectionChambers ?? 0) +
    Math.ceil(
      totalPipeLengthM / Math.max(1, input.chambersPerConnection ?? 30),
    );
  const trenchWidth = Math.max(0, input.trenchWidthM ?? 0.45);
  const trenchDepth = Math.max(0, input.trenchDepthM ?? 0.75);
  const excavationVolume = totalPipeLengthM * trenchWidth * trenchDepth;
  const beddingDepth = Math.max(0, input.beddingDepthM ?? 0.1);
  const beddingWidth =
    Math.max(0, input.beddingWidthFactor ?? 2) *
    (Math.max(0, ...runs.map((r) => r.diameterMm)) / 1000);
  const beddingVolume =
    totalPipeLengthM *
    beddingWidth *
    beddingDepth *
    (1 + Math.max(0, input.beddingWastePercent ?? 10) / 100);
  return {
    marketCode,
    totalPipeLengthM: Number(totalPipeLengthM.toFixed(2)),
    pipeStockPieces,
    runs,
    inspectionChambers: chambers,
    manholes: Math.max(0, input.manholeCount ?? 0),
    beddingVolumeM3: Number(beddingVolume.toFixed(3)),
    excavationVolumeM3: Number(excavationVolume.toFixed(2)),
    cautions: [
      "Pipe diameter, gradient, capacity, cover, material, connection and chamber spacing require project-specific hydraulic and local-code design.",
      "Excavation volume assumes a rectangular trench with the single entered width and depth; it excludes working space, battering, groundwater, shoring and swell.",
    ],
  };
}

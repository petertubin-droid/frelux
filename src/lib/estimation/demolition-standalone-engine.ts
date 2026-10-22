/** Demolition and debris volume takeoff. Permits, hazardous materials and disposal classifications are excluded. */
export interface DemolitionInput {
  marketCode: string;
  items: Array<{
    type: "wall" | "slab" | "floor" | "roof";
    lengthM: number;
    widthM: number;
    thicknessM: number;
    quantity?: number;
  }>;
  bulkingFactor?: number;
  loadingEfficiency?: number;
  skipCapacityM3?: number;
}
export interface DemolitionResult {
  marketCode: string;
  inPlaceVolumeM3: number;
  looseDebrisVolumeM3: number;
  estimatedSkipLoads: number | null;
  assumptions: string[];
  safetyNotice: string;
}
export function calculateDemolitionTakeoff(
  input: DemolitionInput,
): DemolitionResult {
  const inPlaceVolumeM3 = input.items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, item.lengthM) *
        Math.max(0, item.widthM) *
        Math.max(0, item.thicknessM) *
        Math.max(0, item.quantity ?? 1),
    0,
  );
  const bulkingFactor = Math.max(1, input.bulkingFactor ?? 1.35);
  const looseDebrisVolumeM3 = inPlaceVolumeM3 * bulkingFactor;
  const usableCapacity =
    Math.max(0, input.skipCapacityM3 ?? 0) *
    Math.max(0, Math.min(1, input.loadingEfficiency ?? 0.85));
  return {
    marketCode: (input.marketCode || "UNSPECIFIED").toUpperCase(),
    inPlaceVolumeM3: Number(inPlaceVolumeM3.toFixed(3)),
    looseDebrisVolumeM3: Number(looseDebrisVolumeM3.toFixed(3)),
    estimatedSkipLoads:
      usableCapacity > 0
        ? Math.ceil(looseDebrisVolumeM3 / usableCapacity)
        : null,
    assumptions: [
      "Bulking factor and loading efficiency are editable planning assumptions; actual debris volume varies by material, breakage and handling.",
    ],
    safetyNotice:
      "Before demolition, use competent assessment, service isolation, permits, hazardous-material surveys and an approved waste route. This calculator is not a demolition method statement.",
  };
}

/** Demolition and debris volume takeoff. Permits, hazardous materials and disposal classifications are excluded. */
export interface DemolitionInput {
  marketCode: string;
  items?: Array<{
    type: "wall" | "slab" | "floor" | "roof";
    lengthM: number;
    widthM: number;
    thicknessM: number;
    quantity?: number;
  }>;
  bulkingFactor?: number;
  loadingEfficiency?: number;
  skipCapacityM3?: number;
  /**
   * In-place density of the debris, tonnes per m3. Defaults to mixed masonry
   * and concrete rubble; a skip is weighed as well as measured, and an 8-yard
   * skip is limited to roughly 8 tonnes on the road whatever its volume.
   */
  debrisDensityTonnesM3?: number;
}
export interface DemolitionResult {
  marketCode: string;
  inPlaceVolumeM3: number;
  looseDebrisVolumeM3: number;
  estimatedSkipLoads: number | null;
  /** In-place debris mass, tonnes. */
  estimatedMassTonnes: number;
  assumptions: string[];
  safetyNotice: string;
}
export function calculateDemolitionTakeoff(
  input: DemolitionInput,
): DemolitionResult {
  const inPlaceVolumeM3 = (input.items ?? []).reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.lengthM) || 0) *
        Math.max(0, Number(item.widthM) || 0) *
        Math.max(0, Number(item.thicknessM) || 0) *
        Math.max(0, Number(item.quantity ?? 1) || 0),
    0,
  );
  const bulkingFactor = Math.max(1, input.bulkingFactor ?? 1.35);
  const density = Math.max(0, input.debrisDensityTonnesM3 ?? 1.8);
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
    estimatedMassTonnes: Number((inPlaceVolumeM3 * density).toFixed(2)),
    assumptions: [
      "Bulking factor and loading efficiency are editable planning assumptions; actual debris volume varies by material, breakage and handling.",
      `Mass is estimated at ${density} t per m3 in place, which suits mixed masonry and concrete rubble. A skip is weighed as well as filled: an 8-yard skip is limited to about 8 tonnes on the road, so check the mass before booking one.`,
      "A bulking factor below 1 is treated as 1; broken debris cannot occupy less space than it did in place.",
    ],
    safetyNotice:
      "Before demolition, use competent assessment, service isolation, permits, hazardous-material surveys and an approved waste route. This calculator is not a demolition method statement.",
  };
}

/** Thermal/acoustic insulation quantity takeoff; does not calculate energy performance or code compliance. */
export interface InsulationInput {
  marketCode: string;
  areaM2: number;
  layers?: number;
  thicknessMm?: number;
  wastePercent?: number;
  packCoverageM2?: number;
  packVolumeM3?: number;
  installationType?: "batt" | "board" | "roll" | "loose_fill";
}
export interface InsulationResult {
  marketCode: string;
  netAreaM2: number;
  grossAreaM2: number;
  thicknessMm: number;
  layers: number;
  installedVolumeM3: number;
  packsRequired: number | null;
  packCoverageM2: number | null;
  installationType: string;
  notice: string;
}
export function calculateInsulationTakeoff(
  input: InsulationInput,
): InsulationResult {
  const netAreaM2 = Math.max(0, input.areaM2);
  const waste = Math.max(0, input.wastePercent ?? 5);
  const grossAreaM2 = netAreaM2 * (1 + waste / 100);
  const layers = Math.max(1, Math.floor(input.layers ?? 1));
  const thicknessMm = Math.max(0, input.thicknessMm ?? 100);
  const installedVolumeM3 = (grossAreaM2 * layers * thicknessMm) / 1000;
  const packCoverageM2 =
    input.packCoverageM2 && input.packCoverageM2 > 0
      ? input.packCoverageM2
      : null;
  const packsRequired = packCoverageM2
    ? Math.ceil((grossAreaM2 * layers) / packCoverageM2)
    : null;
  return {
    marketCode: (input.marketCode || "UNSPECIFIED").toUpperCase(),
    netAreaM2: Number(netAreaM2.toFixed(2)),
    grossAreaM2: Number(grossAreaM2.toFixed(2)),
    thicknessMm,
    layers,
    installedVolumeM3: Number(installedVolumeM3.toFixed(3)),
    packsRequired,
    packCoverageM2,
    installationType: input.installationType ?? "batt",
    notice:
      "Use the selected manufacturer's declared coverage, thickness and product suitability. This quantity estimate does not calculate U-values, condensation risk, fire performance or code compliance.",
  };
}

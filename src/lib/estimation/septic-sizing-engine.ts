/**
 * Preliminary septic and soakaway quantity worksheet.
 * All jurisdiction-dependent criteria are explicit user inputs. This is not a permit or environmental design.
 */
export interface SepticSizingInput {
  marketCode: string;
  occupants: number;
  designFlowLitresPerPersonPerDay: number;
  retentionDays: number;
  storageAllowanceDays?: number;
  freeboardPercent?: number;
  acceptedSoilLoadingRateLitresPerM2PerDay?: number;
  soakawayDepthM?: number;
  sidewallOnly?: boolean;
}
export interface SepticSizingResult {
  marketCode: string;
  dailyDesignFlowLitres: number;
  tankWorkingVolumeM3: number;
  tankTotalVolumeM3: number;
  soakawayRequiredAbsorptionAreaM2: number | null;
  indicativeSoakawayDiameterM: number | null;
  assumptions: string[];
  safetyNotice: string;
}
export function calculateSepticSizing(
  input: SepticSizingInput,
): SepticSizingResult {
  const occupants = Math.max(0, input.occupants);
  const flowPerPerson = Math.max(0, input.designFlowLitresPerPersonPerDay);
  const dailyFlow = occupants * flowPerPerson;
  const retentionDays = Math.max(0, input.retentionDays);
  const storageAllowanceDays = Math.max(0, input.storageAllowanceDays ?? 0);
  const tankWorkingVolumeM3 =
    (dailyFlow * (retentionDays + storageAllowanceDays)) / 1000;
  const freeboardPercent = Math.max(0, input.freeboardPercent ?? 0);
  const tankTotalVolumeM3 = tankWorkingVolumeM3 * (1 + freeboardPercent / 100);
  const soilRate = input.acceptedSoilLoadingRateLitresPerM2PerDay;
  const soakawayRequiredAbsorptionAreaM2 =
    soilRate && soilRate > 0 ? dailyFlow / soilRate : null;
  const depth = Math.max(0, input.soakawayDepthM ?? 0);
  // Cylindrical plan-area approximation; sidewall-only option uses wetted side area 2*pi*r*h.
  const indicativeSoakawayDiameterM =
    soakawayRequiredAbsorptionAreaM2 !== null && depth > 0
      ? input.sidewallOnly
        ? soakawayRequiredAbsorptionAreaM2 / (Math.PI * depth)
        : 2 * Math.sqrt(soakawayRequiredAbsorptionAreaM2 / Math.PI)
      : null;
  return {
    marketCode: (input.marketCode || "UNSPECIFIED").toUpperCase(),
    dailyDesignFlowLitres: Number(dailyFlow.toFixed(0)),
    tankWorkingVolumeM3: Number(tankWorkingVolumeM3.toFixed(3)),
    tankTotalVolumeM3: Number(tankTotalVolumeM3.toFixed(3)),
    soakawayRequiredAbsorptionAreaM2:
      soakawayRequiredAbsorptionAreaM2 === null
        ? null
        : Number(soakawayRequiredAbsorptionAreaM2.toFixed(2)),
    indicativeSoakawayDiameterM:
      indicativeSoakawayDiameterM === null
        ? null
        : Number(indicativeSoakawayDiameterM.toFixed(2)),
    assumptions: [
      "Occupant flow, detention/storage allowance, freeboard and soil loading rate are user-entered design criteria; no national rule is silently assumed.",
      input.sidewallOnly
        ? "Soakaway diameter uses cylindrical wetted side area only."
        : "Soakaway diameter uses circular plan area only; it does not account for sidewall infiltration or groundwater restrictions.",
    ],
    safetyNotice:
      "Sanitation, groundwater, soil-percolation, setbacks, maintenance access and effluent requirements are jurisdiction-specific. Validate with an appropriately licensed sanitation/environmental professional and local authority before construction; this worksheet is not a septic system design or approval.",
  };
}

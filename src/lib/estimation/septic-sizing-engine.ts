/**
 * Preliminary septic and soakaway quantity worksheet.
 * All jurisdiction-dependent criteria are explicit user inputs. This is not a permit or environmental design.
 * Supports both SI (litres, m³) and Imperial/US Customary (gallons, ft³) sizing.
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
  dailyDesignFlowGallons: number;
  tankWorkingVolumeM3: number;
  tankTotalVolumeM3: number;
  tankWorkingVolumeGallons: number;
  tankTotalVolumeGallons: number;
  soakawayRequiredAbsorptionAreaM2: number | null;
  soakawayRequiredAbsorptionAreaSqFt: number | null;
  indicativeSoakawayDiameterM: number | null;
  assumptions: string[];
  safetyNotice: string;
}

const LITRES_TO_US_GALLONS = 0.264172;
const M3_TO_US_GALLONS = 264.172;
const M2_TO_SQFT = 10.7639;

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

  // Absorption diameter calculation (EPA Onsite Manual / BS 6297 standard):
  // 1. If sidewallOnly = true: Area = pi * D * h => D = Area / (pi * h) (requires depth > 0)
  // 2. If sidewallOnly = false and depth > 0: Area = bottomArea (pi * D^2 / 4) + sidewallArea (pi * D * h)
  //    D^2 + 4*h*D - 4*Area/pi = 0 => D = 2 * (sqrt(h^2 + Area/pi) - h)
  // 3. If sidewallOnly = false and depth == 0: Area = bottomArea = pi * (D/2)^2 => D = 2 * sqrt(Area / pi)
  let indicativeSoakawayDiameterM: number | null = null;
  if (soakawayRequiredAbsorptionAreaM2 !== null && soakawayRequiredAbsorptionAreaM2 > 0) {
    if (input.sidewallOnly) {
      if (depth > 0) {
        indicativeSoakawayDiameterM = soakawayRequiredAbsorptionAreaM2 / (Math.PI * depth);
      }
    } else {
      if (depth > 0) {
        indicativeSoakawayDiameterM = 2 * (Math.sqrt(depth * depth + soakawayRequiredAbsorptionAreaM2 / Math.PI) - depth);
      } else {
        indicativeSoakawayDiameterM = 2 * Math.sqrt(soakawayRequiredAbsorptionAreaM2 / Math.PI);
      }
    }
  }

  return {
    marketCode: (input.marketCode || "UNSPECIFIED").toUpperCase(),
    dailyDesignFlowLitres: Number(dailyFlow.toFixed(0)),
    dailyDesignFlowGallons: Number((dailyFlow * LITRES_TO_US_GALLONS).toFixed(1)),
    tankWorkingVolumeM3: Number(tankWorkingVolumeM3.toFixed(3)),
    tankTotalVolumeM3: Number(tankTotalVolumeM3.toFixed(3)),
    tankWorkingVolumeGallons: Number((tankWorkingVolumeM3 * M3_TO_US_GALLONS).toFixed(1)),
    tankTotalVolumeGallons: Number((tankTotalVolumeM3 * M3_TO_US_GALLONS).toFixed(1)),
    soakawayRequiredAbsorptionAreaM2:
      soakawayRequiredAbsorptionAreaM2 === null
        ? null
        : Number(soakawayRequiredAbsorptionAreaM2.toFixed(2)),
    soakawayRequiredAbsorptionAreaSqFt:
      soakawayRequiredAbsorptionAreaM2 === null
        ? null
        : Number((soakawayRequiredAbsorptionAreaM2 * M2_TO_SQFT).toFixed(2)),
    indicativeSoakawayDiameterM:
      indicativeSoakawayDiameterM === null
        ? null
        : Number(indicativeSoakawayDiameterM.toFixed(2)),
    assumptions: [
      "Occupant flow, detention/storage allowance, freeboard and soil loading rate are user-entered design criteria; no national rule is silently assumed.",
      input.sidewallOnly
        ? "Soakaway diameter uses cylindrical wetted side area only."
        : depth > 0
          ? "Soakaway diameter uses combined bottom percolation plus wetted sidewall area (EPA / BS 6297 standard pit model)."
          : "Soakaway diameter uses circular bottom plan area only.",
    ],
    safetyNotice:
      "Sanitation, groundwater, soil-percolation, setbacks, maintenance access and effluent requirements are jurisdiction-specific. Validate with an appropriately licensed sanitation/environmental professional and local authority before construction; this worksheet is not a septic system design or approval.",
  };
}

/**
 * FRELUX Standalone Plastering & Rendering Engine
 *
 * Deterministic material takeoff for cement-sand internal plastering,
 * external rendering, backing coats, and waterproofing renders.
 *
 * Fully supports all 32 Frelux markets with local packaging standards,
 * dry volume bulking/shrinkage factors, and trade labor norms.
 */

import { getPackagingEvidence } from "./market-packaging-verification";

export type PlasterApplicationType =
  | "internal_plaster"
  | "external_render"
  | "ceiling_plaster"
  | "waterproof_render";

export type PlasterSurfaceRoughness = "smooth" | "medium" | "rough";

export interface PlasteringCalculationInput {
  marketCode: string;
  surfaceAreaM2?: number;
  wallLengthM?: number;
  wallHeightM?: number;
  wallCount?: number;
  applicationType?: PlasterApplicationType;
  thicknessMm?: number;
  coats?: 1 | 2;
  mixRatio?: "1:3" | "1:4" | "1:5" | "1:6";
  surfaceRoughness?: PlasterSurfaceRoughness;
  wastePercent?: number; // default 5%
}

export interface PlasteringCalculationResult {
  marketCode: string;
  totalAreaM2: number;
  applicationType: PlasterApplicationType;
  thicknessMm: number;
  coats: number;
  mixRatio: "1:3" | "1:4" | "1:5" | "1:6";
  wetMortarVolumeM3: number;
  dryMortarVolumeM3: number;
  cementBagWeightKg: number;
  cementWeightKg: number;
  cementBagsRequired: number;
  sandVolumeM3: number;
  sandWeightTonnes: number;
  waterLiters: number;
  estimatedLaborHours: {
    plastererHours: number;
    tenderHours: number;
  };
  marketNotes: string;
  packagingEvidence: ReturnType<typeof getPackagingEvidence>;
}

export const CEMENT_BAG_WEIGHT_BY_MARKET: Record<string, number> = {
  NG: 50,
  US: 42.6, // 94 lb bag
  GB: 25,
  CA: 40,
  AU: 20, // Standard retail bag in Australia
  NZ: 40,
  DE: 25,
  FR: 25,
  IT: 25,
  ES: 25,
  NL: 25,
  PL: 25,
  SE: 25,
  CH: 25,
  IN: 50,
  ZA: 50,
  KE: 50,
  GH: 50,
  TZ: 50,
  CI: 50,
  ET: 50,
  EG: 50,
  SA: 50,
  AE: 50,
  TR: 50,
  JP: 25,
  KR: 40,
  CN: 50,
  ID: 40,
  BR: 50,
  MX: 50,
  SG: 50,
};

export const PLASTER_MIX_PARTS: Record<
  string,
  { cement: number; sand: number }
> = {
  "1:3": { cement: 1, sand: 3 },
  "1:4": { cement: 1, sand: 4 },
  "1:5": { cement: 1, sand: 5 },
  "1:6": { cement: 1, sand: 6 },
};

export const DEFAULT_THICKNESS_MM: Record<PlasterApplicationType, number> = {
  internal_plaster: 12, // Editable planning default; verify against product and local specification
  external_render: 20, // Editable planning default; verify against product and local specification
  ceiling_plaster: 10, // 10mm ceiling skim
  waterproof_render: 20, // 20mm waterproof sand-cement render
};

export const DEFAULT_MIX_RATIO: Record<
  PlasterApplicationType,
  "1:3" | "1:4" | "1:5" | "1:6"
> = {
  internal_plaster: "1:5",
  external_render: "1:4",
  ceiling_plaster: "1:4",
  waterproof_render: "1:3",
};

export function calculatePlasteringTakeoff(
  input: PlasteringCalculationInput,
): PlasteringCalculationResult {
  const market = (input.marketCode || "UNSPECIFIED").toUpperCase();
  const configuredBagWeight = CEMENT_BAG_WEIGHT_BY_MARKET[market];
  // Preserve the legacy calculation output, but never present an unknown-market
  // 50 kg fallback as a verified local package format.
  const cementBagWeightKg = configuredBagWeight ?? 50;
  const packagingEvidence = getPackagingEvidence(
    market,
    "cement",
    configuredBagWeight,
  );
  if (configuredBagWeight === undefined) {
    packagingEvidence.guidance = `No maintained cement pack profile for ${market}; the legacy 50 kg placeholder is used only to preserve a rough quantity output. Confirm actual packaging before use.`;
    packagingEvidence.label =
      "Unverified placeholder · supplier confirmation required";
    packagingEvidence.status = "not_available";
  }

  // Compute surface area
  let areaM2 = 0;
  if (input.surfaceAreaM2 && input.surfaceAreaM2 > 0) {
    areaM2 = input.surfaceAreaM2;
  } else {
    const l = Math.max(0, input.wallLengthM ?? 0);
    const h = Math.max(0, input.wallHeightM ?? 0);
    const count = Math.max(1, input.wallCount ?? 1);
    areaM2 = l * h * count;
  }

  const appType: PlasterApplicationType =
    input.applicationType || "internal_plaster";
  const coats = input.coats ?? (appType === "external_render" ? 2 : 1);
  const thicknessMm = input.thicknessMm ?? DEFAULT_THICKNESS_MM[appType];
  const mixRatio = input.mixRatio ?? DEFAULT_MIX_RATIO[appType];
  const wastePercent = Math.max(0, input.wastePercent ?? 5);

  // Roughness factor on substrate filling: smooth = 5%, medium = 12%, rough = 20%
  const roughnessAllowance =
    input.surfaceRoughness === "rough"
      ? 0.2
      : input.surfaceRoughness === "medium"
        ? 0.12
        : 0.05;

  // Wet volume = Area * thickness (convert mm to m) * coats
  const thicknessM = thicknessMm / 1000.0;
  // `thicknessMm` is the total applied thickness across the specified coats, so
  // coats must not multiply it again.
  const netWetMortarVolumeM3 = areaM2 * thicknessM;
  const wetMortarVolumeM3 = netWetMortarVolumeM3 * (1 + roughnessAllowance);

  // Dry mortar factor: sand + cement shrink by ~33% when mixed with water.
  // Therefore, dry volume required is 1.33x wet volume.
  const dryMortarFactor = 1.33;
  const dryMortarVolumeM3 =
    wetMortarVolumeM3 * dryMortarFactor * (1 + wastePercent / 100.0);

  // Proportions
  const parts = PLASTER_MIX_PARTS[mixRatio] || PLASTER_MIX_PARTS["1:4"];
  const totalParts = parts.cement + parts.sand;
  const cementVolM3 = dryMortarVolumeM3 * (parts.cement / totalParts);
  const sandVolM3 = dryMortarVolumeM3 * (parts.sand / totalParts);

  // Densities: Cement = 1440 kg/m³, Sand = 1600 kg/m³
  const cementWeightKg = Number((cementVolM3 * 1440.0).toFixed(1));
  const cementBagsRequired = Math.ceil(cementWeightKg / cementBagWeightKg);

  const sandWeightTonnes = Number((sandVolM3 * 1.6).toFixed(2));
  const waterLiters = Math.round(cementWeightKg * 0.55); // W/C ratio 0.55

  // Labor norms (hours per m² of finished plaster)
  // Internal: ~0.35 hr plasterer + 0.25 hr tender per m²
  // External render / 2-coat: ~0.50 hr plasterer + 0.35 hr tender per m²
  const plastererRate = coats > 1 || appType === "external_render" ? 0.5 : 0.35;
  const tenderRate = plastererRate * 0.7;

  const plastererHours = Number((areaM2 * plastererRate).toFixed(1));
  const tenderHours = Number((areaM2 * tenderRate).toFixed(1));

  return {
    marketCode: market,
    totalAreaM2: Number(areaM2.toFixed(2)),
    applicationType: appType,
    thicknessMm,
    coats,
    mixRatio,
    wetMortarVolumeM3: Number(wetMortarVolumeM3.toFixed(3)),
    dryMortarVolumeM3: Number(dryMortarVolumeM3.toFixed(3)),
    cementBagWeightKg,
    cementWeightKg,
    cementBagsRequired,
    sandVolumeM3: Number(sandVolM3.toFixed(2)),
    sandWeightTonnes,
    waterLiters,
    estimatedLaborHours: {
      plastererHours,
      tenderHours,
    },
    marketNotes: `${packagingEvidence.guidance} Dry batch factor 1.33 is an estimate, not a local code requirement.`,
    packagingEvidence,
  };
}

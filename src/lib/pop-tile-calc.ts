import type {
  PopCalcInput,
  PopCalcResult,
  PopMaterialResult,
  PopEstimateResult,
  TileCalcInput,
  TileCalcResult,
  Unit,
} from "@/types";
import type { DbPopMaterial, DbTileMaterial } from "@/types/database";

import { unitToMeters } from "@/lib/utils";

function toSqm(value: number, unit: Unit): number {
  return unitToMeters(value, unit);
}

// =========================================================
// POP Ceiling calculations
// =========================================================

export function calculatePopCeiling(
  input: PopCalcInput,
  materials: DbPopMaterial[],
  currency: string,
  currencySymbol: string,
): PopCalcResult {
  const lengthM = toSqm(input.roomLength, input.unit);
  const widthM = toSqm(input.roomWidth, input.unit);
  const ceilingArea = lengthM * widthM;

  const wastePct = Math.min(100, Math.max(0, input.wasteMargin));
  const wasteMultiplier = 1 + wastePct / 100;
  const adjustedArea = ceilingArea * wasteMultiplier;

  const materialResults: PopMaterialResult[] = [];
  const calcWarnings: string[] = [];
  let materialCost = 0;

  const filtered = materials
    .filter((m) => m.workflow === input.workflow && m.is_active)
    .filter((m) => {
      if (m.category === "decorative" && !input.includeDecorative) return false;
      if (m.is_optional && !input.includeOptional) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const mat of filtered) {
    const coverage = Number(mat.coverage_rate);
    const pkgSize = Number(mat.package_size);
    const unitPrice = Number(mat.unit_price);
    if (mat.category === "labour") {
      // Labour not included, negotiated separately
    } else {
      if (coverage > 0 && adjustedArea > 0) {
        // ok, configurable coverage present
      } else if (adjustedArea > 0) {
        calcWarnings.push(
          `Coverage rate is not configured for '${mat.name}'. Its quantity and cost are excluded from the total until it is configured.`,
        );
      }
      if (unitPrice > 0) {
        // ok, price configured
      } else {
        calcWarnings.push(
          `Unit price is not configured for '${mat.name}'. Its cost is excluded from the total until it is configured.`,
        );
      }
      const quantity = coverage > 0 ? adjustedArea / coverage : 0;
      const packagesNeeded =
        pkgSize > 0 ? Math.ceil(quantity / pkgSize) : Math.ceil(quantity);
      const cost = packagesNeeded * unitPrice;
      materialCost += cost;
      materialResults.push({
        name: mat.name,
        category: mat.category,
        quantity: Math.ceil(quantity * 10) / 10,
        unit: mat.coverage_unit,
        packagesNeeded,
        cost,
        isOptional: mat.is_optional,
      });
    }
  }

  const grandTotal = materialCost; // Labour not included

  return {
    ceilingArea,
    materials: materialResults,
    materialCost,
    labourCost: 0,
    wasteAmount: adjustedArea - ceilingArea,
    grandTotal,
    currency,
    currencySymbol,
    warnings: calcWarnings,
  };
}

export function calculatePopEstimate(
  input: PopCalcInput,
  materials: DbPopMaterial[],
  currency: string,
  currencySymbol: string,
): PopEstimateResult {
  return calculatePopCeiling(input, materials, currency, currencySymbol);
}

// =========================================================
// Tile calculations
// =========================================================

export function calculateTile(
  input: TileCalcInput,
  _materials: DbTileMaterial[],
  currency: string,
  currencySymbol: string,
): TileCalcResult {
  // Identical surfaces (e.g. 3 bedrooms with the same floor size) are
  // bought as one project: the area scales, boxes round once on the total.
  const surfaceCount = Math.max(1, Math.round(input.quantity ?? 1));
  let surfaceArea: number;

  if (input.surfaceType === "wall") {
    const lengthM = toSqm(input.length, input.unit);
    const heightM = toSqm(input.height, input.unit);
    surfaceArea = lengthM * heightM * surfaceCount;
  } else {
    const lengthM = toSqm(input.length, input.unit);
    const widthM = toSqm(input.width, input.unit);
    surfaceArea = lengthM * widthM * surfaceCount;
  }

  const wastePct = Math.min(100, Math.max(0, input.wasteMargin));
  const wasteMultiplier = 1 + wastePct / 100;
  const adjustedArea = surfaceArea * wasteMultiplier;

  // --- Tiles (always calculated) ---
  const tileAreaM2 = (input.tileWidthMm / 1000) * (input.tileHeightMm / 1000);
  const tilesNeeded = tileAreaM2 > 0 ? Math.ceil(adjustedArea / tileAreaM2) : 0;
  const boxesNeeded =
    input.tilesPerBox > 0
      ? Math.ceil(tilesNeeded / input.tilesPerBox)
      : tilesNeeded;
  const tileCost = boxesNeeded * input.tilePricePerBox;

  // --- Adhesive (only when method === 'adhesive') ---
  // Audit fix F6: a configured coverage rate wins; otherwise a trowel-notch
  // bed-thickness table (deterministic mid-values of published ranges) is
  // used when the notch size is provided.
  const NOTCH_KG_PER_M2: Record<number, number> = {
    4: 2.75, // thin bed (2.5-3.0 kg/m2)
    6: 4.25, // standard bed (4.0-4.5 kg/m2)
    10: 6.75, // large-format floor (6.0-7.5 kg/m2)
    12: 7.25, // large-format floor (7.0-7.5 kg/m2)
  };
  let adhesiveNeeded = 0;
  let adhesiveCost = 0;
  if (input.method === "adhesive") {
    if (input.adhesiveCoverageRate > 0) {
      adhesiveNeeded = adjustedArea / input.adhesiveCoverageRate;
    } else {
      const notch = input.adhesiveNotchMm ?? 0;
      if (notch > 0 && NOTCH_KG_PER_M2[notch] !== undefined) {
        adhesiveNeeded = adjustedArea * NOTCH_KG_PER_M2[notch];
      }
    }
    adhesiveCost = Math.ceil(adhesiveNeeded) * input.adhesivePricePerBag;
  }

  // --- Cement (only when method === 'traditional') ---
  let cementNeeded = 0;
  let cementCost = 0;
  if (input.method === "traditional") {
    const cementQty =
      input.cementCoverageRate > 0
        ? adjustedArea / input.cementCoverageRate
        : 0;
    const cementPkgSize =
      input.cementPackageSize > 0 ? input.cementPackageSize : 1;
    cementNeeded = Math.ceil(cementQty / cementPkgSize);
    cementCost = cementNeeded * input.cementPricePerBag;
  }

  // --- Sharp sand (only when method === 'traditional') ---
  let sandNeeded = 0;
  let sandCost = 0;
  if (input.method === "traditional") {
    const sandQty =
      input.sandCoverageRate > 0 ? adjustedArea / input.sandCoverageRate : 0;
    const sandPkgSize = input.sandPackageSize > 0 ? input.sandPackageSize : 1;
    sandNeeded = Math.ceil(sandQty / sandPkgSize);
    sandCost = sandNeeded * input.sandPricePerBag;
  }

  // --- Grout (always needed) ---
  // Audit fix F6: rigorous joint-volume grout formula when tile geometry
  // is known. grout kg/m2 = ((L+W)/(L*W)) * thickness * joint * SG *
  // (1+waste) / 1000 with L,W in metres, thickness/joint in mm.
  // Honesty contract: tile thickness/joint width are NEVER invented —
  // without both, the engine falls back to the configured flat coverage
  // rate (or reports zero with a warning) rather than guessing geometry.
  const thickness = input.tileThicknessMm ?? 0;
  const joint = input.jointWidthMm ?? 0;
  const sg =
    input.groutSpecificGravity && input.groutSpecificGravity > 0
      ? input.groutSpecificGravity
      : 1.8;
  let groutNeeded = 0;
  if (thickness > 0 && joint > 0 && tileAreaM2 > 0) {
    const Lm = input.tileWidthMm / 1000;
    const Wm = input.tileHeightMm / 1000;
    const groutKgPerM2 =
      (((Lm + Wm) / (Lm * Wm)) * thickness * joint * sg * wasteMultiplier) /
      1000;
    groutNeeded = adjustedArea * groutKgPerM2;
  } else if (input.groutCoverageRate > 0) {
    groutNeeded = adjustedArea / input.groutCoverageRate;
  }
  const groutCost = Math.ceil(groutNeeded) * input.groutPricePerKg;

  // --- Tile spacers (always needed) ---
  const spacerQty =
    input.spacerCoverageRate > 0 ? adjustedArea / input.spacerCoverageRate : 0;
  const spacerPkgSize =
    input.spacerPackageSize > 0 ? input.spacerPackageSize : 1;
  const spacerNeeded = Math.ceil(spacerQty / spacerPkgSize);
  const spacerCost = spacerNeeded * input.spacerPricePerPack;

  const tileWarnings: string[] = [];
  if (surfaceArea > 0 && tileAreaM2 <= 0) {
    tileWarnings.push(
      "Tile dimensions are invalid (zero tile area). Tile count and cost cannot be calculated.",
    );
  }
  if (surfaceArea > 0) {
    if (input.method === "adhesive" && input.adhesiveCoverageRate <= 0) {
      tileWarnings.push(
        "Adhesive coverage rate is not configured. Adhesive cost is excluded from the total until it is configured.",
      );
    }
    if (input.method === "traditional" && input.cementCoverageRate <= 0) {
      tileWarnings.push(
        "Cement coverage rate is not configured. Cement cost is excluded from the total until it is configured.",
      );
    }
    if (input.method === "traditional" && input.sandCoverageRate <= 0) {
      tileWarnings.push(
        "Sand coverage rate is not configured. Sand cost is excluded from the total until it is configured.",
      );
    }
    if (
      input.groutCoverageRate <= 0 &&
      !((input.tileThicknessMm ?? 0) > 0 && (input.jointWidthMm ?? 0) > 0)
    ) {
      tileWarnings.push(
        "Grout coverage rate is not configured and tile thickness/joint width were not provided. Grout cost is excluded from the total until one is configured.",
      );
    }
  }

  const materialCost =
    tileCost + adhesiveCost + cementCost + sandCost + groutCost + spacerCost;
  const labourCost = 0; // Labour not included, negotiated separately
  const grandTotal = materialCost;

  return {
    surfaceArea,
    tileArea: tileAreaM2,
    tilesNeeded,
    boxesNeeded,
    tileCost,
    method: input.method,
    adhesiveNeeded: Math.ceil(adhesiveNeeded),
    adhesiveCost,
    cementNeeded,
    cementCost,
    sandNeeded,
    sandCost,
    groutNeeded: Math.ceil(groutNeeded),
    groutCost,
    spacerNeeded,
    spacerCost,
    wasteAmount: adjustedArea - surfaceArea,
    materialCost,
    labourCost,
    grandTotal,
    currency,
    currencySymbol,
    warnings: tileWarnings,
  };
}

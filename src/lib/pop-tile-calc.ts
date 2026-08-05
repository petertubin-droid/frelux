import type {
  PopCalcInput,
  PopCalcResult,
  PopMaterialResult,
  PopEstimateResult,
  TileCalcInput,
  TileCalcResult,
} from '@/types';
import type { DbPopMaterial, DbTileMaterial } from '@/types/database';

const FT_TO_M = 0.3048;

function toSqm(value: number, unit: 'meters' | 'feet'): number {
  return unit === 'feet' ? value * FT_TO_M : value;
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

  const wasteMultiplier = 1 + input.wasteMargin / 100;
  const adjustedArea = ceilingArea * wasteMultiplier;

  const materialResults: PopMaterialResult[] = [];
  let materialCost = 0;
  let labourCost = 0;

  const filtered = materials
    .filter((m) => m.workflow === input.workflow && m.is_active)
    .filter((m) => {
      if (m.category === 'decorative' && !input.includeDecorative) return false;
      if (m.is_optional && !input.includeOptional) return false;
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const mat of filtered) {
    const coverage = Number(mat.coverage_rate);
    const pkgSize = Number(mat.package_size);
    const unitPrice = Number(mat.unit_price);
    const labourRate = Number(mat.labour_rate_per_sqm);

    if (mat.category === 'labour') {
      const labourAmount = ceilingArea * labourRate;
      labourCost += labourAmount;
      materialResults.push({
        name: mat.name,
        category: mat.category,
        quantity: ceilingArea,
        unit: 'm²',
        packagesNeeded: 1,
        cost: labourAmount,
        isOptional: mat.is_optional,
      });
    } else {
      const quantity = coverage > 0 ? adjustedArea / coverage : 0;
      const packagesNeeded = pkgSize > 0 ? Math.ceil(quantity / pkgSize) : Math.ceil(quantity);
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

  const grandTotal = materialCost + labourCost;

  return {
    ceilingArea,
    materials: materialResults,
    materialCost,
    labourCost,
    wasteAmount: adjustedArea - ceilingArea,
    grandTotal,
    currency,
    currencySymbol,
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
  let surfaceArea: number;

  if (input.surfaceType === 'wall') {
    const lengthM = toSqm(input.length, input.unit);
    const heightM = toSqm(input.height, input.unit);
    surfaceArea = lengthM * heightM;
  } else {
    const lengthM = toSqm(input.length, input.unit);
    const widthM = toSqm(input.width, input.unit);
    surfaceArea = lengthM * widthM;
  }

  const wasteMultiplier = 1 + input.wasteMargin / 100;
  const adjustedArea = surfaceArea * wasteMultiplier;

  const tileAreaM2 = (input.tileWidthMm / 1000) * (input.tileHeightMm / 1000);
  const tilesNeeded = tileAreaM2 > 0 ? Math.ceil(adjustedArea / tileAreaM2) : 0;
  const boxesNeeded = input.tilesPerBox > 0 ? Math.ceil(tilesNeeded / input.tilesPerBox) : tilesNeeded;
  const tileCost = boxesNeeded * input.tilePricePerBox;

  const adhesiveNeeded = input.adhesiveCoverageRate > 0 ? adjustedArea / input.adhesiveCoverageRate : 0;
  const adhesiveCost = Math.ceil(adhesiveNeeded) * input.adhesivePricePerBag;

  const groutNeeded = input.groutCoverageRate > 0 ? adjustedArea / input.groutCoverageRate : 0;
  const groutCost = Math.ceil(groutNeeded) * input.groutPricePerKg;

  const materialCost = tileCost + adhesiveCost + groutCost;
  const labourCost = surfaceArea * input.labourRatePerSqm;
  const grandTotal = materialCost + labourCost;

  return {
    surfaceArea,
    tileArea: tileAreaM2,
    tilesNeeded,
    boxesNeeded,
    tileCost,
    adhesiveNeeded: Math.ceil(adhesiveNeeded),
    adhesiveCost,
    groutNeeded: Math.ceil(groutNeeded),
    groutCost,
    wasteAmount: adjustedArea - surfaceArea,
    materialCost,
    labourCost,
    grandTotal,
    currency,
    currencySymbol,
  };
}

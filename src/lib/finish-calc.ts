/**
 * Finish Type Calculation Engine
 *
 * Supports three wall finish types used in Nigerian construction:
 * - Painting: Standard paint application (m²/L per coat)
 * - Tyrolene: Textured exterior cementitious finish (m²/kg per coat)
 * - Grafitex: Smooth polymer-modified skim coat (m²/kg per coat)
 */

export type FinishType = 'painting' | 'tyrolene' | 'grafitex';

export interface FinishMaterialConfig {
  id: string;
  name: string;
  finishType: FinishType;
  coverageRate: number;      // m² per unit per coat (L for paint, kg for tyrolene/grafitex)
  coverageUnit: string;      // 'L' or 'kg'
  packageSize: number;        // size of one package (liters or kg)
  packageUnit: string;       // 'L' or 'kg'
  unitPrice: number;          // price per package
  defaultCoats: number;      // recommended number of coats
  labourRatePerSqm: number;  // labour cost per m²
  isBase: boolean;            // true for base coat materials
  isFinishing: boolean;      // true for finishing/top coat materials
  isActive: boolean;
  sortOrder: number;
}

export interface FinishCalcInput {
  finishType: FinishType;
  area: number;              // surface area in m²
  coats?: number;            // number of coats (defaults to finish type default)
  wasteMargin?: number;      // percentage 0–100
  materials?: FinishMaterialConfig[]; // optional override of material configs
  currency?: string;
  currencySymbol?: string;
}

export interface FinishMaterialResult {
  name: string;
  finishType: FinishType;
  isBase: boolean;
  isFinishing: boolean;
  coverageRate: number;
  coverageUnit: string;
  quantityRequired: number;  // raw amount needed (liters or kg)
  quantityWithWaste: number;  // after waste margin
  packagesNeeded: number;    // number of packages to buy
  packageSize: number;
  packageUnit: string;
  unitPrice: number;
  cost: number;               // total cost for this material
}

export interface FinishCalcResult {
  finishType: FinishType;
  area: number;
  coats: number;
  wasteMargin: number;
  materials: FinishMaterialResult[];
  materialCost: number;
  labourCost: number;
  totalCost: number;
  currency: string;
  currencySymbol: string;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Round a number to a specified number of decimal places (default 2).
 */
export function round(value: number, decimals: number = 2): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Returns default coats for a given finish type.
 */
export function getDefaultCoats(finishType: FinishType): number {
  switch (finishType) {
    case 'painting':
      return 2;
    case 'tyrolene':
      return 2;
    case 'grafitex':
      return 3;
    default:
      return 2;
  }
}

/**
 * Returns user-facing label for a finish type.
 */
export function getFinishTypeLabel(finishType: FinishType): string {
  switch (finishType) {
    case 'painting':
      return 'Painting';
    case 'tyrolene':
      return 'Tyrolene';
    case 'grafitex':
      return 'Grafitex';
    default:
      return 'Painting';
  }
}

/**
 * Returns a short description for a finish type.
 */
export function getFinishTypeDescription(finishType: FinishType): string {
  switch (finishType) {
    case 'painting':
      return 'Standard paint application with coverage in m² per litre per coat.';
    case 'tyrolene':
      return 'Textured exterior cementitious finish applied with a spray machine.';
    case 'grafitex':
      return 'Smooth polymer-modified skim coat for a refined wall surface.';
    default:
      return '';
  }
}

/**
 * Get default material configs for a given finish type.
 * Used as fallback when no DB-driven materials are provided.
 */
function getDefaultMaterials(finishType: FinishType): FinishMaterialConfig[] {
  switch (finishType) {
    case 'painting':
      return [
        {
          id: 'paint-default',
          name: 'Paint',
          finishType: 'painting',
          coverageRate: 10,
          coverageUnit: 'L',
          packageSize: 20,
          packageUnit: 'L',
          unitPrice: 15000,
          defaultCoats: 2,
          labourRatePerSqm: 500,
          isBase: true,
          isFinishing: false,
          isActive: true,
          sortOrder: 0,
        },
      ];
    case 'tyrolene':
      return [
        {
          id: 'tyrolene-base',
          name: 'Tyrolene Base Coat',
          finishType: 'tyrolene',
          coverageRate: 1.5,
          coverageUnit: 'kg',
          packageSize: 25,
          packageUnit: 'kg',
          unitPrice: 8000,
          defaultCoats: 2,
          labourRatePerSqm: 800,
          isBase: true,
          isFinishing: false,
          isActive: true,
          sortOrder: 0,
        },
        {
          id: 'tyrolene-texture',
          name: 'Tyrolene Texture Coat',
          finishType: 'tyrolene',
          coverageRate: 1.5,
          coverageUnit: 'kg',
          packageSize: 25,
          packageUnit: 'kg',
          unitPrice: 8000,
          defaultCoats: 2,
          labourRatePerSqm: 800,
          isBase: false,
          isFinishing: true,
          isActive: true,
          sortOrder: 1,
        },
      ];
    case 'grafitex':
      return [
        {
          id: 'grafitex-base',
          name: 'Grafitex Base Coat',
          finishType: 'grafitex',
          coverageRate: 1.2,
          coverageUnit: 'kg',
          packageSize: 25,
          packageUnit: 'kg',
          unitPrice: 10000,
          defaultCoats: 3,
          labourRatePerSqm: 600,
          isBase: true,
          isFinishing: false,
          isActive: true,
          sortOrder: 0,
        },
        {
          id: 'grafitex-finishing',
          name: 'Grafitex Finishing Coat',
          finishType: 'grafitex',
          coverageRate: 1.2,
          coverageUnit: 'kg',
          packageSize: 25,
          packageUnit: 'kg',
          unitPrice: 10000,
          defaultCoats: 3,
          labourRatePerSqm: 600,
          isBase: false,
          isFinishing: true,
          isActive: true,
          sortOrder: 1,
        },
      ];
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────
// Main calculation
// ─────────────────────────────────────────────────────────

/**
 * Calculate finish material quantities and costs for a given area.
 *
 * For each material:
 *   quantityRequired = (area × coats) / coverageRate
 *   quantityWithWaste = quantityRequired × (1 + wasteMargin / 100)
 *   packagesNeeded = ceil(quantityWithWaste / packageSize)
 *   cost = packagesNeeded × unitPrice
 *
 * Labour uses the highest labourRatePerSqm among materials:
 *   labourCost = area × coats × maxLabourRate
 */
export function calculateFinish(input: FinishCalcInput): FinishCalcResult {
  const area = Math.max(0, input.area || 0);
  const rawCoats = input.coats !== undefined ? input.coats : getDefaultCoats(input.finishType);
  const coats = Math.max(0, rawCoats);
  const rawWaste = input.wasteMargin !== undefined ? input.wasteMargin : 0;
  const wasteMargin = Math.min(100, Math.max(0, rawWaste));
  const currency = input.currency ?? 'NGN';
  const currencySymbol = input.currencySymbol ?? '₦';

  const materialConfigs =
    input.materials && input.materials.length > 0
      ? input.materials
      : getDefaultMaterials(input.finishType);

  const results: FinishMaterialResult[] = materialConfigs.map((mat) => {
    const coverageRate = Math.max(0, mat.coverageRate || 0);
    const packageSize = Math.max(0, mat.packageSize || 0);
    const unitPrice = Math.max(0, mat.unitPrice || 0);

    if (area === 0 || coats === 0 || coverageRate === 0) {
      return {
        name: mat.name,
        finishType: input.finishType,
        isBase: mat.isBase,
        isFinishing: mat.isFinishing,
        coverageRate,
        coverageUnit: mat.coverageUnit,
        quantityRequired: 0,
        quantityWithWaste: 0,
        packagesNeeded: 0,
        packageSize,
        packageUnit: mat.packageUnit,
        unitPrice,
        cost: 0,
      };
    }

    const rawRequired = (area * coats) / coverageRate;
    const quantityRequired = round(rawRequired, 2);
    const rawWithWaste = rawRequired * (1 + wasteMargin / 100);
    const quantityWithWaste = round(rawWithWaste, 2);
    const packagesNeeded = packageSize > 0 ? Math.ceil(quantityWithWaste / packageSize) : 0;
    const cost = packagesNeeded * unitPrice;

    return {
      name: mat.name,
      finishType: input.finishType,
      isBase: mat.isBase,
      isFinishing: mat.isFinishing,
      coverageRate,
      coverageUnit: mat.coverageUnit,
      quantityRequired,
      quantityWithWaste,
      packagesNeeded,
      packageSize,
      packageUnit: mat.packageUnit,
      unitPrice,
      cost: round(cost),
    };
  });

  const materialCost = results.reduce((sum, item) => sum + item.cost, 0);

  // Labour: use the highest labour rate among materials
  const maxLabourRate = materialConfigs.reduce(
    (max, mat) => Math.max(max, Math.max(0, mat.labourRatePerSqm || 0)),
    0,
  );
  const labourCost = area * coats * maxLabourRate;

  return {
    finishType: input.finishType,
    area,
    coats,
    wasteMargin,
    materials: results,
    materialCost: round(materialCost),
    labourCost: round(labourCost),
    totalCost: round(materialCost + labourCost),
    currency,
    currencySymbol,
  };
}

/**
 * Convert a DbFinishType record to a FinishMaterialConfig.
 */
export function dbToFinishMaterialConfig(
  db: {
    id: string;
    name: string;
    slug: string;
    coverage_rate: number;
    coverage_unit: string;
    default_coats: number;
    package_size: number;
    package_unit: string;
    unit_price: number;
    labour_rate_per_sqm: number;
    is_base: boolean;
    is_finishing: boolean;
    sort_order: number;
  },
): FinishMaterialConfig {
  return {
    id: db.id,
    name: db.name,
    finishType: db.slug as FinishType,
    coverageRate: Number(db.coverage_rate),
    coverageUnit: db.coverage_unit,
    packageSize: Number(db.package_size),
    packageUnit: db.package_unit,
    unitPrice: Number(db.unit_price),
    defaultCoats: Number(db.default_coats),
    labourRatePerSqm: Number(db.labour_rate_per_sqm),
    isBase: db.is_base,
    isFinishing: db.is_finishing,
    isActive: true,
    sortOrder: db.sort_order,
  };
}

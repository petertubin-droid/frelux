/**
 * Finish Type Calculation Engine
 *
 * Supports three wall finish types used in Nigerian construction:
 * - Painting: Standard paint application (m²/L per coat)
 * - Tyrolene: Textured exterior cementitious finish (partition-based, handled by dedicated TyroleneEstimator)
 * - Grafitex: Rough exterior finish (20-L bucket, 1 bucket = 2 standard partitions)
 *
 * LABOUR IS NOT CALCULATED.
 * Labour: Not included — negotiated separately.
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
  // Grafitex-specific: partition-based calculation
  grafitexBucketPrice?: number;  // admin-configurable price per 20-L bucket
  grafitexPartitionsPerBucket?: number; // FRELUX rule: 2 standard partitions per bucket
  standardPartitionArea?: number; // m² per standard partition (for Grafitex)
  standardPartitionCount?: number; // number of standard partitions (for Grafitex)
}

export interface FinishMaterialResult {
  name: string;
  finishType: FinishType;
  isBase: boolean;
  isFinishing: boolean;
  coverageRate: number;
  coverageUnit: string;
  quantityRequired: number;  // raw amount needed (liters or kg or buckets)
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
  totalCost: number;
  currency: string;
  currencySymbol: string;
  labourNote: string;
  // Grafitex partition-based info
  grafitexBucketsTheoretical?: number;
  grafitexBucketsPractical?: number;
  grafitexEquivalentPartitions?: number;
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
      return 1; // Grafitex is a single-coat exterior finish
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
      return 'Textured exterior cementitious finish — partition-based estimation. Use the dedicated Tyrolene Estimator for accurate calculations.';
    case 'grafitex':
      return 'Rough exterior finish. 1 × 20-L bucket covers 2 standard partitions. Price is admin-configurable.';
    default:
      return '';
  }
}

// ─────────────────────────────────────────────────────────
// Main calculation
// ─────────────────────────────────────────────────────────

const LABOUR_NOTE = 'Labour: Not included — negotiated separately.';

/**
 * Calculate finish material quantities and costs for a given area.
 *
 * For painting:
 *   quantityRequired = (area × coats) / coverageRate
 *   quantityWithWaste = quantityRequired × (1 + wasteMargin / 100)
 *   packagesNeeded = ceil(quantityWithWaste / packageSize)
 *   cost = packagesNeeded × unitPrice
 *
 * For Grafitex (partition-based):
 *   equivalentPartitions = area / standardPartitionArea
 *   theoreticalBuckets = equivalentPartitions / partitionsPerBucket
 *   practicalBuckets = ceil(theoreticalBuckets)
 *   cost = practicalBuckets × bucketPrice
 *
 * LABOUR IS NOT CALCULATED.
 */
export function calculateFinish(input: FinishCalcInput): FinishCalcResult {
  const area = Math.max(0, input.area || 0);
  const rawCoats = input.coats !== undefined ? input.coats : getDefaultCoats(input.finishType);
  const coats = Math.max(0, rawCoats);
  const rawWaste = input.wasteMargin !== undefined ? input.wasteMargin : 0;
  const wasteMargin = Math.min(100, Math.max(0, rawWaste));
  const currency = input.currency ?? 'NGN';
  const currencySymbol = input.currencySymbol ?? '₦';

  // ── Grafitex: partition-based bucket calculation ──
  if (input.finishType === 'grafitex') {
    const bucketPrice = Math.max(0, input.grafitexBucketPrice ?? 0);
    const partitionsPerBucket = Math.max(1, input.grafitexPartitionsPerBucket ?? 2); // FRELUX rule: 2 partitions per bucket
    const standardArea = Math.max(0.01, input.standardPartitionArea ?? 9); // 3m × 3m = 9m² default
    const partitionCount = input.standardPartitionCount;

    let equivalentPartitions: number;
    if (partitionCount && partitionCount > 0) {
      // User specified standard partition count directly
      equivalentPartitions = partitionCount;
    } else if (area > 0) {
      // Calculate from area
      equivalentPartitions = area / standardArea;
    } else {
      equivalentPartitions = 0;
    }

    const theoreticalBuckets = equivalentPartitions > 0
      ? equivalentPartitions / partitionsPerBucket
      : 0;
    const practicalBuckets = Math.ceil(theoreticalBuckets);
    const materialCost = practicalBuckets * bucketPrice;

    const materials: FinishMaterialResult[] = [{
      name: 'Grafitex 20-L Bucket',
      finishType: 'grafitex',
      isBase: true,
      isFinishing: true,
      coverageRate: partitionsPerBucket * standardArea, // m² per bucket
      coverageUnit: 'm²',
      quantityRequired: round(theoreticalBuckets, 4),
      quantityWithWaste: round(theoreticalBuckets, 4),
      packagesNeeded: practicalBuckets,
      packageSize: 20,
      packageUnit: 'L',
      unitPrice: bucketPrice,
      cost: round(materialCost),
    }];

    return {
      finishType: 'grafitex',
      area,
      coats,
      wasteMargin,
      materials,
      materialCost: round(materialCost),
      totalCost: round(materialCost),
      currency,
      currencySymbol,
      labourNote: LABOUR_NOTE,
      grafitexBucketsTheoretical: round(theoreticalBuckets, 4),
      grafitexBucketsPractical: practicalBuckets,
      grafitexEquivalentPartitions: round(equivalentPartitions, 4),
    };
  }

  // ── Painting and Tyrolene: coverage-based calculation ──
  const materialConfigs =
    input.materials && input.materials.length > 0
      ? input.materials
      : [];

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

  return {
    finishType: input.finishType,
    area,
    coats,
    wasteMargin,
    materials: results,
    materialCost: round(materialCost),
    totalCost: round(materialCost),
    currency,
    currencySymbol,
    labourNote: LABOUR_NOTE,
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
    is_base: boolean;
    is_finishing: boolean;
    sort_order: number;
  },
): FinishMaterialConfig {
  return {
    id: db.id,
    name: db.name,
    finishType: (db.slug.includes('tyrolene') ? 'tyrolene' : db.slug.includes('grafitex') ? 'grafitex' : 'painting') as FinishType,
    coverageRate: Number(db.coverage_rate),
    coverageUnit: db.coverage_unit,
    packageSize: Number(db.package_size),
    packageUnit: db.package_unit,
    unitPrice: Number(db.unit_price),
    defaultCoats: Number(db.default_coats),
    isBase: db.is_base,
    isFinishing: db.is_finishing,
    isActive: true,
    sortOrder: db.sort_order,
  };
}

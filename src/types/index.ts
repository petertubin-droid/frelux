export type ProjectType = 'room' | 'house' | 'exterior' | 'fence';
export type Unit = 'meters' | 'feet';

// Re-export default opening dimensions from utils so all modules
// share a single source of truth.
export {
  DEFAULT_DOOR_WIDTH_M,
  DEFAULT_DOOR_HEIGHT_M,
  DEFAULT_WINDOW_WIDTH_M,
  DEFAULT_WINDOW_HEIGHT_M,
} from '@/lib/utils';

export interface OpeningDimensions {
  width: number; // meters
  height: number; // meters
}

export interface CalculatorInput {
  projectType: ProjectType;
  length: number;
  width: number;
  wallHeight: number;
  doors: number;
  doorDims: OpeningDimensions;
  windows: number;
  windowDims: OpeningDimensions;
  coats: number;
  paintType: string; // paint type id (UUID) or name
  unit: Unit;
  includeCeiling: boolean;
  wasteMargin: number; // percentage 0–100
}

export interface ContainerRecommendation {
  size: number; // liters
  count: number;
}

export interface CalculatorResult {
  projectType: ProjectType;
  unit: Unit;
  wallArea: number; // m² gross
  ceilingArea: number; // m² (0 if not included)
  doorArea: number; // m²
  windowArea: number; // m²
  paintableArea: number; // m² net (walls ± ceiling − openings)
  coats: number;
  paintType: string;
  coverageRate: number; // m² per liter per coat
  paintRequiredLiters: number; // before waste
  wasteMargin: number; // percentage
  adjustedLiters: number; // after waste
  recommendedContainers: ContainerRecommendation[];
  totalRecommendedLiters: number;
}

export interface PaintContainerPurchase {
  productId: string | null;
  productName: string;
  containerSize: number; // liters
  count: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CostEstimateInput {
  projectType: ProjectType;
  paintableArea: number;
  paintLiters: number;
  coats: number;
  paintType: string;
  // Paint — actual container purchase
  paintProductId: string | null;
  paintProductName: string;
  paintContainerSize: number; // liters of one container (0 = manual per-liter)
  paintContainerPrice: number; // price of one container (0 when manual)
  paintPricePerLiter: number; // manual override when no product/container
  paintUseContainerPricing: boolean;
  // Primer
  includePrimer: boolean;
  primerLiters: number;
  primerPricePerLiter: number;
  // Materials (each optional, toggled)
  includeFiller: boolean;
  fillerCost: number;
  includePutty: boolean;
  puttyCost: number;
  includeSandpaper: boolean;
  sandpaperCost: number;
  includeBrushes: boolean;
  brushesCost: number;
  includeRollers: boolean;
  rollersCost: number;
  includeOther: boolean;
  otherMaterialsCost: number;
  // Labor
  laborMode: 'perSqm' | 'manual';
  laborRatePerSqm: number;
  laborTotal: number;
  // Currency
  currency: string;
  currencySymbol: string;
}

export interface CostEstimateResult {
  paintCost: number;
  paintContainerCount: number;
  primerCost: number;
  fillerCost: number;
  puttyCost: number;
  sandpaperCost: number;
  brushesCost: number;
  rollersCost: number;
  otherMaterialsCost: number;
  materialsCost: number; // sum of all non-paint, non-primer materials
  laborCost: number;
  total: number;
  currency: string;
  currencySymbol: string;
}

export interface ColorCombination {
  id: string;
  slug: string;
  name: string;
  description: string;
  categories: string[];
  image: string;
  mainColor: { name: string; hex: string };
  secondaryColor: { name: string; hex: string };
  accentColor: { name: string; hex: string };
  recommendedRooms: string[];
  style: string;
  relatedSlugs: string[];
}

export interface ScreedingCalcInput {
  method: 'full_room' | 'individual_wall';
  // Full room
  roomLength: number;
  roomWidth: number;
  // Individual wall
  wallWidth: number;
  wallCount: number;
  // Shared
  wallHeight: number;
  // Openings
  doors: number;
  doorDims: OpeningDimensions;
  windows: number;
  windowDims: OpeningDimensions;
  unit: Unit;
}

export interface ScreedingCalcResult {
  method: 'full_room' | 'individual_wall';
  unit: Unit;
  grossWallArea: number;
  doorArea: number;
  windowArea: number;
  totalDeduction: number;
  netScreedingArea: number;
}

export interface ScreedingEstimateInput {
  netScreedingArea: number;
  materialId: string;
  materialName: string;
  coverageRate: number;
  coverageUnit: string;
  packageSize: number;
  packageUnit: string;
  unitPrice: number;
  labourRatePerSqm: number;
  wasteMargin: number;
  currency: string;
  currencySymbol: string;
}

export interface ScreedingEstimateResult {
  materialName: string;
  materialRequired: number;
  materialUnit: string;
  packagesNeeded: number;
  materialCost: number;
  labourCost: number;
  total: number;
  currency: string;
  currencySymbol: string;
}

// =========================================================
// Screeding Mix Model (Paint + White Cement)
// =========================================================

export interface ScreedingMixConfig {
  paintCoverageRateM2PerL: number;
  paintBucketSizeL: number;
  paintPricePerBucket: number;
  cementConsumptionRatioKgPerL: number;
  cementBagSizeKg: number;
  cementPricePerBag: number;
  defaultMixRatio: string;
  labourRatePerSqm: number;
  wastePercentage: number;
  taxVatPercentage: number;
  currency: string;
  currencySymbol: string;
}

export interface ScreedingMixResult {
  netScreedingArea: number;
  paintRequiredLiters: number;
  paintBucketsNeeded: number;
  paintUnitPrice: number;
  paintTotalCost: number;
  cementRequiredKg: number;
  cementBagsNeeded: number;
  cementUnitPrice: number;
  cementTotalCost: number;
  materialCost: number;
  labourCost: number;
  wasteAllowance: number;
  wasteAmount: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
}

export interface AdvancedEstimateLineItem {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface AdvancedEstimateData {
  projectType: string;
  netArea: number;
  thickness: number;
  coats: number;
  mixRatio: string;
  paintLiters: number;
  paintBuckets: number;
  cementKg: number;
  cementBags: number;
  lineItems: AdvancedEstimateLineItem[];
  materialCost: number;
  labourCost: number;
  transportCost: number;
  wastePercentage: number;
  wasteAmount: number;
  markupPercentage: number;
  markupAmount: number;
  profitPercentage: number;
  profitAmount: number;
  taxPercentage: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
  notes: string;
  aiRecommendations: string[];
}

export interface SavedEstimate {
  id: string;
  title: string;
  projectType: string;
  totalCost: number;
  currency: string;
  estimateData: AdvancedEstimateData;
  createdAt: string;
}

// =========================================================
// POP Ceiling types
// =========================================================

export interface PopCalcInput {
  workflow: 'nigeria' | 'international';
  roomLength: number;
  roomWidth: number;
  unit: Unit;
  wasteMargin: number;
  includeDecorative: boolean;
  includeOptional: boolean;
}

export interface PopMaterialResult {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  packagesNeeded: number;
  cost: number;
  isOptional: boolean;
}

export interface PopCalcResult {
  ceilingArea: number;
  materials: PopMaterialResult[];
  materialCost: number;
  labourCost: number;
  wasteAmount: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
}

export interface PopEstimateResult {
  ceilingArea: number;
  materials: PopMaterialResult[];
  materialCost: number;
  labourCost: number;
  wasteAmount: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
}

// =========================================================
// Tile types
// =========================================================

export interface TileCalcInput {
  surfaceType: 'floor' | 'wall';
  length: number;
  width: number;
  height: number;
  tileWidthMm: number;
  tileHeightMm: number;
  tilesPerBox: number;
  tilePricePerBox: number;
  adhesiveCoverageRate: number;
  adhesivePricePerBag: number;
  groutCoverageRate: number;
  groutPricePerKg: number;
  wasteMargin: number;
  labourRatePerSqm: number;
  unit: Unit;
}

export interface TileCalcResult {
  surfaceArea: number;
  tileArea: number;
  tilesNeeded: number;
  boxesNeeded: number;
  tileCost: number;
  adhesiveNeeded: number;
  adhesiveCost: number;
  groutNeeded: number;
  groutCost: number;
  wasteAmount: number;
  materialCost: number;
  labourCost: number;
  grandTotal: number;
  currency: string;
  currencySymbol: string;
}

export const colorCategories = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Exterior',
  'Modern',
  'Luxury',
  'Neutral',
  'Warm',
  'Bold',
] as const;

export type ColorFilter = {
  query?: string;
  familyId?: string | null;
  categoryId?: string | null;
  isInterior?: boolean | null;
  isExterior?: boolean | null;
  isFeatured?: boolean | null;
  isTrending?: boolean | null;
  sort?: 'popularity' | 'name' | 'newest' | 'display_order';
  page?: number;
  pageSize?: number;
};

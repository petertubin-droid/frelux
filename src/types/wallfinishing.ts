// =========================================================
// FRELUX Wall Finishing System - types.
//
// A country-aware, configuration-driven system that plans a
// wall from structure to decorative finish:
//
//   CountryProfile → WallSystem → WallAssembly (layers)
//     → Materials (role-priced per market) → QuantityRules
//     → LabourRates → CostCalculation
//
// Design rules (mirror the platform's engine philosophy):
// - No country logic in UI components; everything is data.
// - Prices are NEVER hard-coded: every material resolves by
//   ROLE through the market price book (estimation_prices +
//   market_material_roles) with provenance, and falls back to
//   a clearly-labelled manual entry - never a guess.
// - Every calculated number carries its full calculation
//   breakdown (transparency steps).
// =========================================================

// ─────────────────────────────────────────────
// 1. Country profiles
// ─────────────────────────────────────────────

export type WallFinMarketCode = "NG" | "US" | "GB" | "DE" | "IN" | "CA" | "AU";

export interface WallFinCountryProfile {
  /** ISO 3166-1 alpha-2 */
  code: WallFinMarketCode;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  /** Measurement system used on site */
  measurement: "metric" | "imperial";
  defaultLengthUnit: string;
  defaultAreaUnit: string;
  /** Wall construction systems common in this country */
  wallSystemIds: string[];
  /** Finishing assembly templates available here */
  assemblyIds: string[];
  /** Default waste percentages when a layer doesn't specify one */
  defaultWastePercent: {
    paint: number;
    plaster: number;
    putty: number;
    mortar: number;
  };
  /**
   * Shown verbatim to users. A country profile is a starting
   * template, NEVER a universal building code.
   */
  templateNotice: string;
}

// ─────────────────────────────────────────────
// 2. Wall systems (structure)
// ─────────────────────────────────────────────

export type WallSurface = "interior" | "exterior" | "both";

export interface WallSystem {
  id: string;
  /** Countries where this system is common */
  countryCodes: WallFinMarketCode[];
  name: string;
  description: string;
  wallType: string;
  structuralMaterial: string;
  /** mm for metric systems, inches where the market is imperial */
  typicalThickness: { min: number; max: number; default: number };
  thicknessUnit: "mm" | "in";
  /** Assembly templates used to finish this system */
  interiorFinishAssemblyId: string;
  exteriorFinishAssemblyId: string;
  /** Substrate tags that drive material compatibility */
  substrates: WallSubstrate[];
  active: boolean;
}

export type WallSubstrate =
  "masonry" | "drywall" | "concrete" | "brick" | "block" | "timber" | "steel";

// ─────────────────────────────────────────────
// 3. Wall assemblies (layer sequences)
// ─────────────────────────────────────────────

export type WallLayerCategory =
  "structural" | "base" | "prep" | "skim" | "sand" | "primer" | "finish";

export type LayerQuantityMode =
  /** area × coats ÷ coverage */
  | "area-coverage"
  /** area × thickness × mix ratio (volumetric, e.g. render) */
  | "volume"
  /** one unit per fixed area (e.g. joint tape, sandpaper) */
  | "per-area"
  /** one per linear metre (e.g. joint tape on drywall seams) */
  | "per-length"
  /** fixed allowance per wall */
  | "fixed";

export interface MixComponent {
  /** e.g. "cement" | "sand" - resolved as a role-priced material */
  role: string;
  /** parts by volume in the mix (cement 1 : sand 4) */
  parts: number;
}

export interface WallLayerTemplate {
  id: string;
  name: string;
  category: WallLayerCategory;
  /** Material role resolved through the market price book */
  materialRole: string;
  quantityMode: LayerQuantityMode;
  /** coverage rate per single coat, m² per purchase unit */
  coverageRateM2PerUnit: number | null;
  coats: number;
  /** thickness in mm for volumetric layers */
  thickness: { min: number; max: number; default: number } | null;
  /** volumetric mix (e.g. cement:sand render 1:4) */
  mix: MixComponent[] | null;
  /** per-area / per-length / fixed quantity rules */
  unitsPerM2: number | null;
  unit: string;
  applicationMethod: string;
  dryingInfo: string;
  wastePercent: number;
  /** labour task key in the wall-finishing labour book */
  labourTask: string;
  surface: "interior" | "exterior" | "both";
  optional: boolean;
  note: string | null;
}

export interface WallAssemblyTemplate {
  id: string;
  name: string;
  description: string;
  surface: "interior" | "exterior";
  /** Substrates this assembly can finish */
  substrates: WallSubstrate[];
  /** typical sequence depth hint (base → finish) */
  layerCountNote: string | null;
  layers: WallLayerTemplate[];
}

// ─────────────────────────────────────────────
// 4. Openings & rooms
// ─────────────────────────────────────────────

export type OpeningType = "door" | "window" | "archway" | "vent" | "custom";

export interface OpeningInput {
  id: string;
  type: OpeningType;
  widthM: number;
  heightM: number;
  quantity: number;
  /** reveal/return depth in m - adds reveal area when set */
  revealDepthM: number;
  /** deduct this opening from the wall area */
  deduct: boolean;
}

export interface WallSpec {
  id: string;
  label: string;
  lengthM: number;
  heightM: number;
  surface: "interior" | "exterior";
  wallSystemId: string;
  assemblyId: string;
  openings: OpeningInput[];
  /** manual exclusion in m² (chimneys, fixed furniture...) */
  excludedAreaM2: number;
}

export interface RoomSpec {
  id: string;
  name: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  isWetArea: boolean;
  walls: WallSpec[];
}

export interface WallFinProjectSpec {
  name: string;
  countryCode: WallFinMarketCode;
  region: string;
  buildingType: string;
  rooms: RoomSpec[];
  /** equipment / other costs entered by the user */
  extraCosts: ExtraCostLine[];
  contingencyPercent: number;
}

export interface ExtraCostLine {
  id: string;
  label: string;
  amount: number;
}

// ─────────────────────────────────────────────
// 5. Manual overrides
// ─────────────────────────────────────────────

export interface WallLayerOverrides {
  /** replace the layer's role-resolved material key */
  materialRole?: string;
  coverageRateM2PerUnit?: number;
  coats?: number;
  thicknessMm?: number;
  wastePercent?: number;
  /** manual price per purchase unit (user's local price) */
  unitPriceOverride?: number;
  /** manual labour rate in the project currency */
  labourRateOverride?: number;
}

/** Every overridden field is surfaced with an indicator in the UI. */
export type OverrideIndicator =
  | "material"
  | "coverage"
  | "coats"
  | "thickness"
  | "waste"
  | "price"
  | "labour"
  | "order";

export interface WallSpecOverrides {
  /** per-layer overrides, keyed by layer template id */
  layers: Record<string, WallLayerOverrides>;
  /** layers removed from the template sequence */
  removedLayers: string[];
  /** removed layers cloned back into the sequence */
  addedLayers: string[];
  /** explicit layer-id order; unlisted layers keep their relative order */
  layerOrder?: string[];
}

// ─────────────────────────────────────────────
// 6. Price / labour resolution context
// ─────────────────────────────────────────────

export interface ResolvedLayerPrice {
  /** material resolved from the market book (or null → manual) */
  materialName: string | null;
  unitPrice: number | null;
  /** coverage units per purchase pack (e.g. 20 L per pail) - null = priced per unit */
  packUnits: number | null;
  /** display label of the purchase pack (e.g. '20L') */
  purchaseLabel: string | null;
  currency: string;
  resolvedMarket: string | null;
  /** provenance: retailer / catalog / manual entry */
  priceSource: string | null;
  scanSource: string | null;
  priceDate: string | null;
  /** true when the user typed the price (clearly labelled) */
  isManualPrice: boolean;
  /** true when no price exists anywhere in the chain */
  unpriced: boolean;
}

export type LabourRateMethod =
  "per-m2" | "per-day-output" | "hourly" | "per-unit";

export interface ResolvedLabourRate {
  taskKey: string;
  method: LabourRateMethod;
  /** rate meaning depends on method: per m², per worker-day, per hour, per unit */
  rate: number | null;
  currency: string;
  /** output per worker-day for per-day-output method */
  outputPerWorkerDay: number | null;
  sourceReference: string | null;
  effectiveDate: string | null;
  isEstimate: boolean;
}

// ─────────────────────────────────────────────
// 7. Results (with full transparency)
// ─────────────────────────────────────────────

export interface CalcStep {
  label: string;
  detail: string;
  /** e.g. "36 × 2 ÷ 10 = 7.2 L" */
  formula?: string;
}

export interface LayerQuantityResult {
  layerTemplateId: string;
  layerName: string;
  category: WallLayerCategory;
  materialName: string;
  /** net quantity required, before waste */
  baseQuantity: number;
  wastePercent: number;
  /** base × (1 + waste) */
  adjustedQuantity: number;
  /** rounded to the purchase unit (integer packs where applicable) */
  purchaseQuantity: number;
  purchaseUnit: string;
  /** transparency: exact steps from area to final number */
  steps: CalcStep[];
  overridden: OverrideIndicator[];
  surfaceWarning: string | null;
}

export interface LayerCostResult {
  layerTemplateId: string;
  materialCost: number | null;
  labourCost: number | null;
  /** per-layer labour transparency */
  labourSteps: CalcStep[];
  currency: string;
}

export interface WallResult {
  wallSpecId: string;
  label: string;
  grossAreaM2: number;
  openingAreaM2: number;
  excludedAreaM2: number;
  netAreaM2: number;
  /** reveal/return areas add back finishing area */
  revealAreaM2: number;
  finishingAreaM2: number;
  steps: CalcStep[];
  layers: (LayerQuantityResult & LayerCostResult)[];
  wallCost: number;
  warnings: string[];
  checklists: QualityChecklist[];
}

export interface RoomResult {
  roomSpecId: string;
  name: string;
  walls: WallResult[];
  totalCost: number;
  currency: string;
}

export interface ProjectCostBreakdown {
  materials: number;
  labour: number;
  equipment: number;
  transport: number;
  contingency: number;
  subtotal: number;
  total: number;
  currency: string;
  steps: CalcStep[];
}

export interface WallFinProjectResult {
  ok: boolean;
  currency: string;
  rooms: RoomResult[];
  cost: ProjectCostBreakdown;
  /** layer-by-layer specification table rows */
  warnings: string[];
  errors: string[];
}

// ─────────────────────────────────────────────
// 8. Quality control checklists
// ─────────────────────────────────────────────

export type QCStatus =
  | "not-started"
  | "in-progress"
  | "inspection"
  | "approved"
  | "rework"
  | "completed";

export const QC_STATUS_ORDER: QCStatus[] = [
  "not-started",
  "in-progress",
  "inspection",
  "approved",
  "rework",
  "completed",
];

export interface QCItem {
  id: string;
  label: string;
  status: QCStatus;
}

export interface QualityChecklist {
  layerTemplateId: string;
  layerName: string;
  items: QCItem[];
}

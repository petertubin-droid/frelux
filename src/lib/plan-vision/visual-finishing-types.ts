/**
 * FRELUX GLOBAL VISUAL FINISHING ESTIMATION ENGINE
 * Phase 1 Architecture: Types & Contracts
 *
 * Strict Compliance:
 * 1. AI interprets and extracts visual features. ONLY deterministic FRELUX
 *    engines calculate quantities and costs.
 * 2. An inferred pixel dimension is NEVER converted to metric dimensions
 *    without explicit user calibration or user-supplied real dimensions.
 * 3. 32-market resolution separates verified pricebook markets from unverified
 *    markets. Missing prices remain transparently 'price_unavailable' or 'user_provided'.
 * 4. All business rules (waste factors, coats, pack sizes, rounding) come from
 *    existing FRELUX engines.
 */

export type VisualFinishingActivity =
  | "painting"
  | "screeding"
  | "tiling"
  | "pop_ceiling"
  | "flooring";

export const VISUAL_FINISHING_ACTIVITIES: {
  id: VisualFinishingActivity;
  name: string;
  description: string;
  supportedSurfaces: Array<"wall" | "ceiling" | "floor">;
}[] = [
  {
    id: "painting",
    name: "Wall & Ceiling Painting",
    description: "Calculates primer, emulsion/gloss/satin paint buckets, coverage rates and coat requirements.",
    supportedSurfaces: ["wall", "ceiling"],
  },
  {
    id: "screeding",
    name: "Wall Screeding",
    description: "Calculates putty or white cement + screeding paint mix systems and layer thicknesses.",
    supportedSurfaces: ["wall"],
  },
  {
    id: "tiling",
    name: "Floor & Wall Tiling",
    description: "Calculates tile counts, boxes, tile adhesive or cement/sand mortars, grout and spacers.",
    supportedSurfaces: ["floor", "wall"],
  },
  {
    id: "pop_ceiling",
    name: "POP / Ceiling Finishing",
    description: "Calculates POP plaster of paris, cement, fibre, framing components and release agent.",
    supportedSurfaces: ["ceiling"],
  },
  {
    id: "flooring",
    name: "Plank & Sheet Flooring",
    description: "Calculates laminate packs, vinyl, parquet, underlay rolls, adhesive and perimeter skirting.",
    supportedSurfaces: ["floor"],
  },
];

export type MeasurementStatus =
  | "measured_and_validated"
  | "user_confirmed"
  | "estimated_with_uncertainty"
  | "incomplete"
  | "unavailable";

export type CalibrationMethod =
  | "user_supplied"
  | "reference_object"
  | "known_room"
  | "manual_correction"
  | "uncalibrated";

export interface NormalizedBBox {
  x: number; // 0..1 from left
  y: number; // 0..1 from top
  w: number; // 0..1 width
  h: number; // 0..1 height
}

export interface DetectedOpening {
  id: string;
  type: "door" | "window";
  label: string;
  confidence: number;
  widthM: number | null;
  heightM: number | null;
  areaM2: number | null;
  deduct: boolean;
  bbox?: NormalizedBBox;
}

export interface VisualSurface {
  id: string;
  category: "wall" | "ceiling" | "floor";
  name: string;
  confidence: number; // 0..1
  bbox: NormalizedBBox;
  measurementStatus: MeasurementStatus;
  calibrationMethod: CalibrationMethod;
  widthM: number | null;
  heightM: number | null;
  grossAreaM2: number | null;
  openings: DetectedOpening[];
  deductedOpeningAreaM2: number;
  netAreaM2: number | null;
  surfaceCondition: "smooth_new" | "painted_good" | "rough_damaged" | "plastered";
  isPartiallyObscured: boolean;
  notes: string[];
}

export interface CalibrationData {
  method: CalibrationMethod;
  roomLengthM: number | null;
  roomWidthM: number | null;
  wallHeightM: number | null;
  ceilingHeightM: number | null;
  referenceName?: string;
  referenceRealM?: number;
  referencePixelLength?: number;
  isCalibrated: boolean;
}

export interface VisualMediaInput {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  storagePath?: string;
  widthPx?: number;
  heightPx?: number;
  capturedAt: string;
  sourceType: "upload" | "camera";
}

export interface FinishingOptions {
  activity: VisualFinishingActivity;
  marketCode: string;
  currency: string;
  currencySymbol: string;
  unitSystem: "metric" | "imperial";

  // Activity-specific parameters
  painting?: {
    qualityName: string;
    coats: number;
    includeCeiling: boolean;
    includePrimer: boolean;
    userPricePerBucket?: number | null;
  };
  screeding?: {
    systemType: "putty" | "white_cement_paint";
    coats: number;
    userPricePerUnit?: number | null;
  };
  tiling?: {
    surfaceType: "floor" | "wall";
    method: "adhesive" | "traditional";
    tileWidthMm: number;
    tileHeightMm: number;
    tilesPerBox: number;
    wastePct: number;
    userPricePerBox?: number | null;
  };
  popCeiling?: {
    workflow: "nigeria" | "international";
    includeDecorative: boolean;
    wastePct: number;
    userPricePerUnit?: number | null;
  };
  flooring?: {
    flooringType: "laminate" | "vinyl" | "parquet";
    includeUnderlay: boolean;
    includeAdhesive: boolean;
    wastePct: number;
    userPricePerPack?: number | null;
  };
}

export interface QuantifiedMaterialItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  packageCount: number | null;
  packageUnit: string | null;
  unitPrice: number | null;
  totalCost: number | null;
  priceStatus: "verified" | "user_provided" | "price_unavailable";
  priceNote?: string;
  isOptional?: boolean;
}

export interface VisualFinishingEstimateResult {
  id: string;
  activity: VisualFinishingActivity;
  activityName: string;
  marketCode: string;
  marketName: string;
  currency: string;
  currencySymbol: string;
  createdAt: string;
  surfaces: VisualSurface[];
  totalGrossAreaM2: number;
  totalOpeningDeductionM2: number;
  totalNetAreaM2: number;
  materials: QuantifiedMaterialItem[];
  subtotalMaterialCost: number | null;
  isFullyPriced: boolean;
  provenance: {
    mediaSource: string;
    calibrationMethod: CalibrationMethod;
    surfaceConfidence: number;
    measurementConfidence: number;
    timestamp: string;
  };
  confidenceBreakdown: {
    surfaceDetection: number;
    geometricCalibration: number;
    quantityEngine: number;
    overall: number;
  };
  missingInformation: string[];
  assumptions: string[];
  warnings: string[];
  auditSteps: Array<{ label: string; detail: string }>;
}

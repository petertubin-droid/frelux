/**
 * FRELUX PLAN SCANNER — Types & Engine
 *
 * Handles imported building plans (PDF pages rendered to canvas,
 * raster images uploaded by user) and prepares them for roof tracing.
 *
 * Pipeline:
 *   1. User uploads a plan file (PDF, PNG, JPG, WEBP)
 *   2. Plan is rendered to a canvas (PDF → page raster, image → direct)
 *   3. User calibrates scale (Feature 10) using a known dimension on the plan
 *   4. User traces roof outline over the plan
 *   5. Traced geometry is exported with scale metadata
 *
 * Feature 9: Plan Scanner
 */

// =========================================================
// Plan Source Types
// =========================================================

export type PlanFileType = 'pdf' | 'png' | 'jpg' | 'jpeg' | 'webp' | 'unknown';

export interface PlanFile {
  /** Unique ID for this plan */
  id: string;
  /** Original filename */
  filename: string;
  /** File type */
  fileType: PlanFileType;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Data URL or object URL for rendering */
  url: string;
  /** MIME type */
  mimeType: string;
  /** Upload timestamp (ISO 8601) */
  uploadedAt: string;
}

// =========================================================
// Plan Render Result
// =========================================================

export interface PlanRenderResult {
  /** Canvas width in pixels */
  widthPx: number;
  /** Canvas height in pixels */
  heightPx: number;
  /** Data URL of the rendered plan */
  dataUrl: string;
  /** Source plan file */
  sourceFile: PlanFile;
  /** Page number (for PDFs, 1-indexed) */
  pageNumber: number;
  /** Total pages (for PDFs) */
  totalPages: number;
  /** Whether rendering succeeded */
  success: boolean;
  /** Error message if rendering failed */
  error?: string;
}

// =========================================================
// Plan Metadata (extracted from the file)
// =========================================================

export interface PlanMetadata {
  /** Natural image dimensions in pixels */
  naturalWidthPx: number;
  naturalHeightPx: number;
  /** File type */
  fileType: PlanFileType;
  /** Detected DPI (if available from image metadata) */
  dpi: number | null;
  /** Whether the plan has a visible scale bar */
  hasScaleBar: boolean;
  /** Whether the plan appears to be a floor plan (heuristic) */
  appearsFloorPlan: boolean;
}

// =========================================================
// File Type Detection
// =========================================================

/**
 * Detect plan file type from filename or MIME type.
 */
export function detectPlanFileType(filename: string, mimeType?: string): PlanFileType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (ext === 'png' || mimeType === 'image/png') return 'png';
  if (ext === 'jpg' || ext === 'jpeg' || mimeType === 'image/jpeg') return 'jpg';
  if (ext === 'webp' || mimeType === 'image/webp') return 'webp';

  return 'unknown';
}

/**
 * Check if a file type is supported for plan scanning.
 */
export function isSupportedPlanType(fileType: PlanFileType): boolean {
  return fileType !== 'unknown';
}

/**
 * Maximum file size for plan uploads (50 MB).
 */
export const MAX_PLAN_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate a plan file before processing.
 */
export function validatePlanFile(
  filename: string,
  fileSizeBytes: number,
  mimeType?: string,
): { valid: boolean; errors: string[]; fileType: PlanFileType } {
  const errors: string[] = [];
  const fileType = detectPlanFileType(filename, mimeType);

  if (!isSupportedPlanType(fileType)) {
    errors.push(`Unsupported file type: ${fileType}. Supported: PDF, PNG, JPG, WEBP.`);
  }

  if (fileSizeBytes > MAX_PLAN_FILE_SIZE) {
    errors.push(`File too large: ${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB. Maximum: 50 MB.`);
  }

  if (fileSizeBytes === 0) {
    errors.push('File is empty.');
  }

  return { valid: errors.length === 0, errors, fileType };
}

// =========================================================
// Plan File Factory
// =========================================================

let planIdCounter = 0;

export function createPlanFile(
  filename: string,
  fileSizeBytes: number,
  url: string,
  mimeType: string,
): PlanFile {
  planIdCounter += 1;
  return {
    id: `plan_${Date.now()}_${planIdCounter}`,
    filename,
    fileType: detectPlanFileType(filename, mimeType),
    fileSizeBytes,
    url,
    mimeType,
    uploadedAt: new Date().toISOString(),
  };
}

// =========================================================
// Plan Metadata Extraction
// =========================================================

/**
 * Extract basic metadata from an image element.
 * For PDFs, this should be called after rendering to canvas.
 */
export function extractPlanMetadata(
  img: HTMLImageElement,
  fileType: PlanFileType,
): PlanMetadata {
  return {
    naturalWidthPx: img.naturalWidth,
    naturalHeightPx: img.naturalHeight,
    fileType,
    dpi: null, // DPI extraction from EXIF would require a library
    hasScaleBar: false, // Visual detection would require CV analysis
    appearsFloorPlan: false, // Heuristic detection would require CV analysis
  };
}

// =========================================================
// Scale Calibration State (used by Feature 10)
// =========================================================

export interface ScaleCalibration {
  /** Whether calibration has been completed */
  calibrated: boolean;
  /** Known real-world length the user measured on the plan */
  knownLength: number;
  /** Unit of the known length */
  knownUnit: 'm' | 'ft' | 'cm' | 'mm';
  /** Pixel distance the user drew on the plan for the known length */
  pixelLength: number;
  /** Computed pixels per meter */
  pixelsPerMeter: number | null;
  /** Calibration timestamp */
  calibratedAt: string | null;
}

export function createDefaultCalibration(): ScaleCalibration {
  return {
    calibrated: false,
    knownLength: 0,
    knownUnit: 'm',
    pixelLength: 0,
    pixelsPerMeter: null,
    calibratedAt: null,
  };
}

/**
 * Compute pixels per meter from calibration data.
 */
export function computePixelsPerMeter(
  knownLength: number,
  knownUnit: string,
  pixelLength: number,
): number | null {
  if (knownLength <= 0 || pixelLength <= 0) return null;

  // Convert known length to meters
  let lengthM = knownLength;
  switch (knownUnit) {
    case 'ft': lengthM = knownLength * 0.3048; break;
    case 'cm': lengthM = knownLength / 100; break;
    case 'mm': lengthM = knownLength / 1000; break;
    case 'm': lengthM = knownLength; break;
    default: return null;
  }

  if (lengthM <= 0) return null;
  return pixelLength / lengthM;
}

/**
 * Complete calibration — validates and stores the result.
 */
export function completeCalibration(
  calibration: ScaleCalibration,
  knownLength: number,
  knownUnit: ScaleCalibration['knownUnit'],
  pixelLength: number,
): ScaleCalibration {
  const pixelsPerMeter = computePixelsPerMeter(knownLength, knownUnit, pixelLength);
  return {
    calibrated: pixelsPerMeter !== null,
    knownLength,
    knownUnit,
    pixelLength,
    pixelsPerMeter,
    calibratedAt: pixelsPerMeter !== null ? new Date().toISOString() : null,
  };
}

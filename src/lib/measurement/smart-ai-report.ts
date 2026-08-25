/**
 * FRELUX SMART AI IMAGE REPORT
 *
 * Feature 21: Smart AI Image Report
 *
 * Enhances the existing AI Image Estimator report with structured
 * intelligence data: detected building info, rooms, dimensions,
 * roof info, scale status, AI review status, user corrections,
 * verified measurements, calculation results, material requirements,
 * and market pricing.
 *
 * This module produces STRUCTURED DATA that the UI renders.
 * It does NOT replace the existing EstimateResultView component.
 * It provides additional report sections that are added alongside
 * the existing report content.
 *
 * Each piece of data is tagged with its verification state:
 *   AI DETECTED — raw AI output, not yet verified
 *   USER CORRECTED — AI detected, user modified
 *   USER VERIFIED — user confirmed the data
 *   CALCULATED — engine produced from verified inputs
 *   MARKET PRICE VERIFIED — market intelligence validated the price
 *
 * AI detection confidence does NOT mean the calculation is accurate.
 * A calculated quantity does NOT mean its market price is verified.
 */

import type { VerificationState } from './verification-states';
import type { ConfidenceLevel } from './confidence-engine';

// =========================================================
// IMAGE REFERENCE
// =========================================================

export interface ImageReference {
  /** URL or identifier of the source image/plan */
  reference: string;
  /** Image type: photo, building_plan, satellite, sketch */
  imageType: 'photo' | 'building_plan' | 'satellite' | 'sketch' | 'unknown';
  /** When the image was uploaded/processed */
  processedDate: string;
  /** AI provider used (e.g., "Gemini Vision") */
  aiProvider?: string;
  /** AI model version */
  aiModel?: string;
}

// =========================================================
// DETECTED BUILDING INFO
// =========================================================

export interface DetectedBuildingInfo {
  buildingType: string;
  buildingTypeConfidence: 'high' | 'moderate' | 'low';
  estimatedFloors: number;
  estimatedHeight: number;
  heightUnit: string;
  verificationState: VerificationState;
  /** What the AI detected */
  aiDetected: string;
  /** What the user corrected (if any) */
  userCorrections: string[];
}

// =========================================================
// DETECTED ROOM/SPACE
// =========================================================

export interface DetectedRoomInfo {
  roomName: string;
  roomType: string;
  length: number;
  width: number;
  height?: number;
  unit: string;
  area: number;
  quantity: number;
  aiConfidence: 'high' | 'moderate' | 'low';
  verificationState: VerificationState;
  /** Fields the user corrected */
  userCorrections: string[];
  /** AI notes about this room */
  aiNotes?: string;
}

// =========================================================
// DETECTED DIMENSIONS
// =========================================================

export interface DetectedDimension {
  label: string;
  value: number;
  unit: string;
  dimensionType: 'length' | 'width' | 'height' | 'area' | 'volume' | 'perimeter';
  aiConfidence: 'high' | 'moderate' | 'low';
  verificationState: VerificationState;
  /** Original AI-detected value (before user correction) */
  aiOriginalValue?: number;
  /** Final value (after user correction, if any) */
  finalValue: number;
  /** Whether the user changed this value */
  userCorrected: boolean;
}

// =========================================================
// DETECTED ROOF INFO
// =========================================================

export interface DetectedRoofInfo {
  roofType: string;
  roofTypeConfidence: 'high' | 'moderate' | 'low';
  estimatedRoofArea: number;
  areaUnit: string;
  pitch: string;
  verificationState: VerificationState;
  aiNotes?: string;
}

// =========================================================
// SCALE STATUS
// =========================================================

export type ScaleStatus = 'verified' | 'estimated' | 'not_available' | 'user_confirmed';

export interface ScaleInfo {
  status: ScaleStatus;
  /** Scale reference used (e.g., "door height 2.1m") */
  referenceObject?: string;
  /** Scale ratio */
  scaleRatio?: string;
  /** Whether the user confirmed the scale */
  userConfirmed: boolean;
  explanation: string;
}

// =========================================================
// AI REVIEW STATUS
// =========================================================

export type AiReviewStatus = 'pending' | 'in_review' | 'reviewed' | 'corrected' | 'verified';

export interface AiReviewInfo {
  status: AiReviewStatus;
  /** What the user reviewed */
  reviewedItems: string[];
  /** What the user corrected */
  correctedItems: string[];
  /** What the user confirmed as-is */
  confirmedItems: string[];
  /** When the review was completed */
  reviewDate?: string;
  /** Notes from the review */
  reviewNotes?: string;
}

// =========================================================
// VERIFIED MEASUREMENTS
// =========================================================

export interface VerifiedMeasurement {
  label: string;
  value: number;
  unit: string;
  category: 'building' | 'room' | 'roof' | 'linear' | 'area';
  source: VerificationState;
  /** Brief explanation of how this was derived */
  derivation: string;
}

// =========================================================
// CALCULATION RESULTS
// =========================================================

export interface CalculationResultEntry {
  calculator: string;
  result: string;
  verificationState: VerificationState;
  explanation: string;
}

// =========================================================
// MATERIAL REQUIREMENTS (from AI report)
// =========================================================

export interface AiMaterialRequirement {
  materialName: string;
  requiredQuantity: number;
  unit: string;
  wastePercent: number;
  purchaseQuantity: number;
  verificationState: VerificationState;
  unitPrice: number;
  currency: string;
  priceVerified: boolean;
  priceSource: string;
  lineTotal: number;
  explanation: string;
}

// =========================================================
// CONFIDENCE SUMMARY
// =========================================================

export interface AiConfidenceSummary {
  /** Overall confidence level */
  overallConfidence: ConfidenceLevel;
  /** AI detection confidence (independent of calculation) */
  aiDetectionConfidence: 'high' | 'moderate' | 'low';
  /** Scale confidence */
  scaleConfidence: 'verified' | 'estimated' | 'not_available';
  /** Calculation confidence */
  calculationConfidence: ConfidenceLevel;
  /** Market price confidence */
  marketPriceConfidence: ConfidenceLevel | 'unavailable';
  /** Count of items by verification state */
  aiDetectedCount: number;
  userCorrectedCount: number;
  userVerifiedCount: number;
  calculatedCount: number;
  marketPriceVerifiedCount: number;
  /** Explanation for UI */
  explanation: string[];
}

// =========================================================
// COMPLETE SMART AI IMAGE REPORT
// =========================================================

export interface SmartAiImageReport {
  imageReference: ImageReference;
  detectedBuilding: DetectedBuildingInfo;
  detectedRooms: DetectedRoomInfo[];
  detectedDimensions: DetectedDimension[];
  detectedRoof: DetectedRoofInfo | null;
  scaleInfo: ScaleInfo;
  aiReview: AiReviewInfo;
  verifiedMeasurements: VerifiedMeasurement[];
  calculationResults: CalculationResultEntry[];
  materialRequirements: AiMaterialRequirement[];
  confidence: AiConfidenceSummary;
  /** Summary text for sharing */
  shareText: string;
  /** Full explanation for the report */
  explanation: string[];
}

// =========================================================
// REPORT BUILDER
// =========================================================

export function buildSmartAiImageReport(params: {
  imageReference: ImageReference;
  detectedBuilding: DetectedBuildingInfo;
  detectedRooms: DetectedRoomInfo[];
  detectedDimensions: DetectedDimension[];
  detectedRoof?: DetectedRoofInfo | null;
  scaleInfo: ScaleInfo;
  aiReview: AiReviewInfo;
  verifiedMeasurements: VerifiedMeasurement[];
  calculationResults: CalculationResultEntry[];
  materialRequirements: AiMaterialRequirement[];
  confidence: {
    overallConfidence: ConfidenceLevel;
    aiDetectionConfidence: 'high' | 'moderate' | 'low';
    scaleConfidence: 'verified' | 'estimated' | 'not_available';
    calculationConfidence: ConfidenceLevel;
    marketPriceConfidence: ConfidenceLevel | 'unavailable';
  };
  currency?: string;
}): SmartAiImageReport {
  const currency = params.currency ?? 'NGN';

  // Collect all verification states
  const allStates: VerificationState[] = [
    params.detectedBuilding.verificationState,
    ...params.detectedRooms.map((r) => r.verificationState),
    ...params.detectedDimensions.map((d) => d.verificationState),
    ...params.verifiedMeasurements.map((m) => m.source),
    ...params.calculationResults.map((c) => c.verificationState),
    ...params.materialRequirements.map((m) => m.verificationState),
  ];
  if (params.detectedRoof) allStates.push(params.detectedRoof.verificationState);

  const aiDetectedCount = allStates.filter((s) => s === 'ai_detected' || s === 'ai_detected_review_required').length;
  const userCorrectedCount = params.detectedDimensions.filter((d) => d.userCorrected).length + params.detectedRooms.filter((r) => r.userCorrections.length > 0).length;
  const userVerifiedCount = allStates.filter((s) => s === 'user_verified').length;
  const calculatedCount = allStates.filter((s) => s === 'calculated').length;
  const marketPriceVerifiedCount = allStates.filter((s) => s === 'market_price_verified').length;

  const confidence: AiConfidenceSummary = {
    overallConfidence: params.confidence.overallConfidence,
    aiDetectionConfidence: params.confidence.aiDetectionConfidence,
    scaleConfidence: params.confidence.scaleConfidence,
    calculationConfidence: params.confidence.calculationConfidence,
    marketPriceConfidence: params.confidence.marketPriceConfidence,
    aiDetectedCount,
    userCorrectedCount,
    userVerifiedCount,
    calculatedCount,
    marketPriceVerifiedCount,
    explanation: [
      `AI Detection: ${params.confidence.aiDetectionConfidence.toUpperCase()} — ${aiDetectedCount} items detected by AI`,
      `User Corrections: ${userCorrectedCount} items modified by user`,
      `User Verified: ${userVerifiedCount} items confirmed by user`,
      `Calculated: ${calculatedCount} items from calculation engines`,
      `Market Price Verified: ${marketPriceVerifiedCount} items with verified prices`,
      `Scale: ${params.confidence.scaleConfidence}`,
      `Overall: ${params.confidence.overallConfidence.toUpperCase()}`,
      `AI detection confidence does NOT guarantee calculation accuracy.`,
      `A calculated quantity does NOT mean its market price is verified.`,
    ],
  };

  // Build share text
  const shareLines: string[] = [];
  shareLines.push('*FRELUX AI Image Report*');
  shareLines.push(`Image: ${params.imageReference.imageType}`);
  shareLines.push(`AI Provider: ${params.imageReference.aiProvider ?? 'N/A'}`);
  shareLines.push(`Date: ${params.imageReference.processedDate}`);
  shareLines.push('');
  shareLines.push('--- Detected Building ---');
  shareLines.push(`Type: ${params.detectedBuilding.buildingType} (${params.detectedBuilding.buildingTypeConfidence} confidence)`);
  shareLines.push(`Floors: ${params.detectedBuilding.estimatedFloors}`);
  shareLines.push(`Height: ${params.detectedBuilding.estimatedHeight} ${params.detectedBuilding.heightUnit}`);
  shareLines.push('');
  shareLines.push('--- Detected Rooms ---');
  for (const room of params.detectedRooms) {
    shareLines.push(`${room.roomName}: ${room.length}×${room.width} ${room.unit} (×${room.quantity}) — ${room.verificationState}`);
  }
  shareLines.push('');
  shareLines.push('--- Scale ---');
  shareLines.push(`Status: ${params.scaleInfo.status}`);
  shareLines.push('');
  shareLines.push('--- AI Review ---');
  shareLines.push(`Status: ${params.aiReview.status}`);
  if (params.aiReview.correctedItems.length > 0) {
    shareLines.push(`Corrected: ${params.aiReview.correctedItems.join(', ')}`);
  }
  if (params.aiReview.confirmedItems.length > 0) {
    shareLines.push(`Confirmed: ${params.aiReview.confirmedItems.join(', ')}`);
  }
  shareLines.push('');
  if (params.materialRequirements.length > 0) {
    shareLines.push('--- Materials ---');
    for (const mat of params.materialRequirements) {
      shareLines.push(`${mat.materialName}: ${mat.purchaseQuantity.toFixed(2)} ${mat.unit}`);
    }
    const hasPrices = params.materialRequirements.some((m) => m.priceVerified);
    if (hasPrices) {
      const total = params.materialRequirements.reduce((s, m) => s + m.lineTotal, 0);
      shareLines.push(`Total: ${total.toLocaleString()} ${currency}`);
    } else {
      shareLines.push('No verified market prices available.');
    }
  }
  shareLines.push('');
  shareLines.push(`Confidence: ${params.confidence.overallConfidence.toUpperCase()}`);
  shareLines.push('Generated by FRELUX AI Image Estimator');

  // Full explanation
  const explanation: string[] = [];
  explanation.push('=== FRELUX Smart AI Image Report ===');
  explanation.push(`Image reference: ${params.imageReference.reference}`);
  explanation.push(`Image type: ${params.imageReference.imageType}`);
  explanation.push(`AI provider: ${params.imageReference.aiProvider ?? 'N/A'}`);
  explanation.push(`Processed: ${params.imageReference.processedDate}`);
  explanation.push('');
  explanation.push('--- Detected Building ---');
  explanation.push(`Building type: ${params.detectedBuilding.buildingType} (AI confidence: ${params.detectedBuilding.buildingTypeConfidence})`);
  explanation.push(`Verification: ${params.detectedBuilding.verificationState}`);
  if (params.detectedBuilding.userCorrections.length > 0) {
    explanation.push(`User corrections: ${params.detectedBuilding.userCorrections.join(', ')}`);
  }
  explanation.push('');
  explanation.push('--- Detected Rooms ---');
  for (const room of params.detectedRooms) {
    const corrections = room.userCorrections.length > 0 ? ` [corrected: ${room.userCorrections.join(', ')}]` : '';
    explanation.push(`${room.roomName}: ${room.length}×${room.width} ${room.unit} ×${room.quantity} — ${room.verificationState}${corrections}`);
  }
  explanation.push('');
  explanation.push('--- Scale Status ---');
  explanation.push(`${params.scaleInfo.status} — ${params.scaleInfo.explanation}`);
  explanation.push('');
  explanation.push('--- AI Review ---');
  explanation.push(`Status: ${params.aiReview.status}`);
  if (params.aiReview.correctedItems.length > 0) {
    explanation.push(`Corrected: ${params.aiReview.correctedItems.join(', ')}`);
  }
  if (params.aiReview.confirmedItems.length > 0) {
    explanation.push(`Confirmed as-is: ${params.aiReview.confirmedItems.join(', ')}`);
  }
  explanation.push('');
  explanation.push('--- Verified Measurements ---');
  for (const m of params.verifiedMeasurements) {
    explanation.push(`${m.label}: ${m.value} ${m.unit} (${m.source}) — ${m.derivation}`);
  }
  explanation.push('');
  explanation.push('--- Calculation Results ---');
  for (const c of params.calculationResults) {
    explanation.push(`${c.calculator}: ${c.result} (${c.verificationState})`);
  }
  explanation.push('');
  explanation.push('--- Material Requirements ---');
  for (const mat of params.materialRequirements) {
    const price = mat.priceVerified ? ` @ ${mat.unitPrice.toLocaleString()} ${currency} = ${mat.lineTotal.toLocaleString()} ${currency}` : ' (no verified price)';
    explanation.push(`${mat.materialName}: ${mat.purchaseQuantity.toFixed(2)} ${mat.unit}${price}`);
  }
  explanation.push('');
  explanation.push('--- Confidence Summary ---');
  explanation.push(...confidence.explanation);

  return {
    imageReference: params.imageReference,
    detectedBuilding: params.detectedBuilding,
    detectedRooms: params.detectedRooms,
    detectedDimensions: params.detectedDimensions,
    detectedRoof: params.detectedRoof ?? null,
    scaleInfo: params.scaleInfo,
    aiReview: params.aiReview,
    verifiedMeasurements: params.verifiedMeasurements,
    calculationResults: params.calculationResults,
    materialRequirements: params.materialRequirements,
    confidence,
    shareText: shareLines.join('\n'),
    explanation,
  };
}

/**
 * FRELUX SMART ROOF REPORT
 *
 * Feature 20: Smart Roof Report
 *
 * Enhances the existing Building-to-Roof report with intelligent
 * measurement information from the roof geometry, material, and
 * verification systems.
 *
 * This module produces STRUCTURED DATA that the UI renders.
 * It does NOT replace the existing EstimateResult component.
 * It provides additional report sections that are added alongside
 * the existing report content.
 *
 * Report sections:
 *   1. PROJECT METADATA (project, building, location, date, measurement source)
 *   2. ROOF SUMMARY (gross area, net area, sections, pitch, roof type)
 *   3. LINEAR MEASUREMENTS (ridge, hip, valley, eave, rake)
 *   4. CUTOUTS (penetrations and openings)
 *   5. AREA SUMMARY (by section)
 *   6. MATERIAL REQUIREMENTS (from roof material engine)
 *   7. WASTE (waste factors and amounts)
 *   8. MARKET PRICE INFORMATION (when verified)
 *   9. CONFIDENCE / VERIFICATION STATES
 *  10. CALCULATION EXPLANATION
 *
 * Each measurement is tagged with its verification state:
 *   AI DETECTED vs USER VERIFIED vs CALCULATED
 */

import type { VerificationState } from './verification-states';
import type { ConfidenceLevel } from './confidence-engine';

// =========================================================
// REPORT DATA TYPES
// =========================================================

export type MeasurementSource = 'manual_input' | 'ai_detected' | 'user_verified' | 'imported';

export interface ReportMetadata {
  projectName: string;
  buildingName?: string;
  location?: string;
  date: string;
  measurementSource: MeasurementSource;
  measurementSourceLabel: string;
}

export interface RoofSectionSummary {
  sectionName: string;
  grossArea: number;
  netArea: number;
  pitch: string;
  roofType: string;
  verificationState: VerificationState;
}

export interface RoofSummarySection {
  totalGrossArea: number;
  totalNetArea: number;
  sectionCount: number;
  sections: RoofSectionSummary[];
  areaUnit: string;
}

export interface LinearMeasurementEntry {
  type: 'ridge' | 'hip' | 'valley' | 'eave' | 'rake';
  label: string;
  length: number;
  unit: string;
  count: number;
  verificationState: VerificationState;
}

export interface LinearMeasurementsSection {
  entries: LinearMeasurementEntry[];
  totalLength: number;
  unit: string;
}

export interface CutoutEntry {
  name: string;
  type: string;
  area: number;
  unit: string;
  verificationState: VerificationState;
}

export interface CutoutsSection {
  entries: CutoutEntry[];
  totalCutoutArea: number;
  unit: string;
}

export interface MaterialRequirementEntry {
  materialName: string;
  requiredQuantity: number;
  unit: string;
  wastePercent: number;
  purchaseQuantity: number;
  verificationState: VerificationState;
  explanation: string;
}

export interface MaterialRequirementsSection {
  entries: MaterialRequirementEntry[];
  totalMaterials: number;
}

export interface WasteSection {
  entries: { materialName: string; wastePercent: number; wasteAmount: number; unit: string }[];
  totalWasteAmount: number;
  explanation: string[];
}

export interface MarketPriceEntry {
  materialName: string;
  unitPrice: number;
  currency: string;
  priceSource: string;
  priceVerified: boolean;
  priceFreshness: string;
  lineTotal: number;
}

export interface MarketPriceSection {
  entries: MarketPriceEntry[];
  hasVerifiedPrices: boolean;
  unpricedCount: number;
  totalCost: number;
  currency: string;
  explanation: string;
}

export interface ConfidenceSection {
  overallConfidence: ConfidenceLevel;
  verificationStates: { label: string; state: VerificationState; count: number }[];
  aiDetectedCount: number;
  userVerifiedCount: number;
  calculatedCount: number;
  marketPriceVerifiedCount: number;
  explanation: string[];
}

export interface CalculationExplanationEntry {
  step: string;
  detail: string;
  verificationState: VerificationState;
}

export interface CalculationExplanationSection {
  entries: CalculationExplanationEntry[];
}

// =========================================================
// COMPLETE SMART ROOF REPORT
// =========================================================

export interface SmartRoofReport {
  metadata: ReportMetadata;
  roofSummary: RoofSummarySection;
  linearMeasurements: LinearMeasurementsSection;
  cutouts: CutoutsSection;
  materialRequirements: MaterialRequirementsSection;
  waste: WasteSection;
  marketPrices: MarketPriceSection;
  confidence: ConfidenceSection;
  calculationExplanation: CalculationExplanationSection;
  /** Summary text for sharing */
  shareText: string;
}

// =========================================================
// REPORT BUILDER
// =========================================================

const MEASUREMENT_SOURCE_LABELS: Record<MeasurementSource, string> = {
  manual_input: 'Manual Input',
  ai_detected: 'AI Detected',
  user_verified: 'User Verified',
  imported: 'Imported',
};

export function buildSmartRoofReport(params: {
  projectName: string;
  buildingName?: string;
  location?: string;
  date?: string;
  measurementSource?: MeasurementSource;
  roofSummary: RoofSummarySection;
  linearMeasurements: LinearMeasurementEntry[];
  cutouts: CutoutEntry[];
  materialRequirements: MaterialRequirementEntry[];
  wasteEntries: { materialName: string; wastePercent: number; wasteAmount: number; unit: string }[];
  marketPrices: MarketPriceEntry[];
  confidence: {
    overallConfidence: ConfidenceLevel;
    verificationStates: { label: string; state: VerificationState; count: number }[];
  };
  calculationSteps: CalculationExplanationEntry[];
  areaUnit?: string;
  lengthUnit?: string;
  currency?: string;
}): SmartRoofReport {
  const areaUnit = params.areaUnit ?? 'm²';
  const lengthUnit = params.lengthUnit ?? 'm';
  const currency = params.currency ?? 'NGN';
  const date = params.date ?? new Date().toISOString().split('T')[0];
  const measurementSource = params.measurementSource ?? 'manual_input';

  // Linear measurements
  const linearSection: LinearMeasurementsSection = {
    entries: params.linearMeasurements,
    totalLength: params.linearMeasurements.reduce((sum, e) => sum + e.length * e.count, 0),
    unit: lengthUnit,
  };

  // Cutouts
  const cutoutsSection: CutoutsSection = {
    entries: params.cutouts,
    totalCutoutArea: params.cutouts.reduce((sum, c) => sum + c.area, 0),
    unit: areaUnit,
  };

  // Material requirements
  const materialSection: MaterialRequirementsSection = {
    entries: params.materialRequirements,
    totalMaterials: params.materialRequirements.length,
  };

  // Waste
  const wasteSection: WasteSection = {
    entries: params.wasteEntries,
    totalWasteAmount: params.wasteEntries.reduce((sum, w) => sum + w.wasteAmount, 0),
    explanation: params.wasteEntries.map((w) =>
      `${w.materialName}: ${w.wastePercent}% waste = ${w.wasteAmount.toFixed(2)} ${w.unit}`
    ),
  };

  // Market prices
  const hasVerifiedPrices = params.marketPrices.some((p) => p.priceVerified);
  const unpricedCount = params.marketPrices.filter((p) => !p.priceVerified || p.unitPrice === 0).length;
  const totalCost = params.marketPrices.reduce((sum, p) => sum + p.lineTotal, 0);
  const marketPriceSection: MarketPriceSection = {
    entries: params.marketPrices,
    hasVerifiedPrices,
    unpricedCount,
    totalCost,
    currency,
    explanation: hasVerifiedPrices
      ? `${params.marketPrices.length - unpricedCount} of ${params.marketPrices.length} materials have verified market prices.`
      : 'No verified market prices available. Quantities are calculated but cannot be automatically priced.',
  };

  // Confidence
  const allStates = [
    ...params.roofSummary.sections.map((s) => s.verificationState),
    ...params.linearMeasurements.map((e) => e.verificationState),
    ...params.cutouts.map((c) => c.verificationState),
    ...params.materialRequirements.map((m) => m.verificationState),
  ];

  const confidenceSection: ConfidenceSection = {
    overallConfidence: params.confidence.overallConfidence,
    verificationStates: params.confidence.verificationStates,
    aiDetectedCount: allStates.filter((s) => s === 'ai_detected' || s === 'ai_detected_review_required').length,
    userVerifiedCount: allStates.filter((s) => s === 'user_verified').length,
    calculatedCount: allStates.filter((s) => s === 'calculated').length,
    marketPriceVerifiedCount: allStates.filter((s) => s === 'market_price_verified').length,
    explanation: [
      `Overall confidence: ${params.confidence.overallConfidence.toUpperCase()}`,
      `AI Detected: ${allStates.filter((s) => s === 'ai_detected' || s === 'ai_detected_review_required').length} items`,
      `User Verified: ${allStates.filter((s) => s === 'user_verified').length} items`,
      `Calculated: ${allStates.filter((s) => s === 'calculated').length} items`,
      `Market Price Verified: ${allStates.filter((s) => s === 'market_price_verified').length} items`,
    ],
  };

  // Calculation explanation
  const calcExplanation: CalculationExplanationSection = {
    entries: params.calculationSteps,
  };

  // Share text
  const shareLines: string[] = [];
  shareLines.push(`*Smart Roof Report*`);
  shareLines.push(`Project: ${params.projectName}`);
  if (params.buildingName) shareLines.push(`Building: ${params.buildingName}`);
  if (params.location) shareLines.push(`Location: ${params.location}`);
  shareLines.push(`Date: ${date}`);
  shareLines.push(`Source: ${MEASUREMENT_SOURCE_LABELS[measurementSource]}`);
  shareLines.push('');
  shareLines.push('--- Roof Summary ---');
  shareLines.push(`Gross area: ${params.roofSummary.totalGrossArea.toFixed(2)} ${areaUnit}`);
  shareLines.push(`Net area: ${params.roofSummary.totalNetArea.toFixed(2)} ${areaUnit}`);
  shareLines.push(`Sections: ${params.roofSummary.sectionCount}`);
  shareLines.push('');
  shareLines.push('--- Linear Measurements ---');
  for (const e of linearSection.entries) {
    shareLines.push(`${e.label}: ${e.length.toFixed(2)} ${e.unit} × ${e.count}`);
  }
  shareLines.push('');
  shareLines.push('--- Materials ---');
  for (const m of materialSection.entries) {
    shareLines.push(`${m.materialName}: ${m.purchaseQuantity.toFixed(2)} ${m.unit} (incl. ${m.wastePercent}% waste)`);
  }
  shareLines.push('');
  if (hasVerifiedPrices) {
    shareLines.push('--- Market Prices ---');
    shareLines.push(`Total: ${totalCost.toLocaleString()} ${currency}`);
  } else {
    shareLines.push('No verified market prices available.');
  }
  shareLines.push('');
  shareLines.push(`Confidence: ${params.confidence.overallConfidence.toUpperCase()}`);
  shareLines.push('Generated by FRELUX');

  return {
    metadata: {
      projectName: params.projectName,
      buildingName: params.buildingName,
      location: params.location,
      date,
      measurementSource,
      measurementSourceLabel: MEASUREMENT_SOURCE_LABELS[measurementSource],
    },
    roofSummary: params.roofSummary,
    linearMeasurements: linearSection,
    cutouts: cutoutsSection,
    materialRequirements: materialSection,
    waste: wasteSection,
    marketPrices: marketPriceSection,
    confidence: confidenceSection,
    calculationExplanation: calcExplanation,
    shareText: shareLines.join('\n'),
  };
}

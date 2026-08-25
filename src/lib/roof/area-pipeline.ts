/**
 * FRELUX ROOF AREA PIPELINE — Pitch-Adjusted Surface Area
 *
 * The complete roof area calculation pipeline:
 *
 *   PLAN / HORIZONTAL AREA
 *         ↓
 *   ROOF PITCH
 *         ↓
 *   SLOPED ROOF SURFACE AREA
 *         ↓
 *   CUTOUTS (skylights, courtyards, equipment, openings)
 *         ↓
 *   NET ROOF AREA
 *         ↓
 *   WASTE
 *         ↓
 *   ORDER QUANTITY
 *
 * All steps are deterministic and auditable.
 * Feature 6: Pitch-Adjusted Roof Area
 */

import type { RoofType } from '@/types/build-to-roof';

// =========================================================
// Pipeline Types
// =========================================================

/**
 * A single roof cutout/penetration.
 */
export interface RoofCutout {
  id: string;
  name: string;
  /** Area in m² */
  areaM2: number;
  /** Type of cutout */
  type: 'skylight' | 'courtyard' | 'equipment' | 'opening' | 'other';
}

/**
 * Input to the roof area pipeline.
 */
export interface RoofAreaPipelineInput {
  /** Horizontal (plan) area in m² */
  planAreaM2: number;
  /** Roof pitch in degrees (null = unknown, no adjustment) */
  pitchDegrees: number | null;
  /** Roof type */
  roofType: RoofType;
  /** Cutouts to subtract */
  cutouts: RoofCutout[];
  /** Waste percentage (0-100) */
  wastePercent: number;
}

/**
 * Result of the roof area pipeline — each step is traceable.
 */
export interface RoofAreaPipelineResult {
  /** Step 1: Plan area input */
  planAreaM2: number;
  /** Step 2: Pitch used (null = no pitch, plan area used directly) */
  pitchDegrees: number | null;
  /** Step 3: Pitch-adjusted sloped surface area */
  slopedSurfaceAreaM2: number;
  /** Step 4: Total cutout area */
  cutoutAreaM2: number;
  /** Individual cutouts with areas */
  cutouts: { name: string; areaM2: number; type: string }[];
  /** Step 5: Net area (sloped - cutouts) */
  netAreaM2: number;
  /** Step 6: Waste percentage applied */
  wastePercent: number;
  /** Step 7: Order quantity (net + waste) */
  orderAreaM2: number;
  /** Whether pitch was applied (false = flat roof or no pitch) */
  pitchApplied: boolean;
  /** Explanation text for each step */
  explanation: RoofAreaExplanation;
}

/**
 * Step-by-step explanation of the calculation.
 */
export interface RoofAreaExplanation {
  planArea: string;
  pitch: string;
  slopedSurface: string;
  cutouts: string;
  net: string;
  waste: string;
  order: string;
}

// =========================================================
// Pipeline Execution
// =========================================================

/**
 * Run the full roof area pipeline.
 *
 * Every step is deterministic and produces an explanation string.
 * No silent estimation — if pitch is missing, it's noted clearly.
 */
export function calculateRoofAreaPipeline(
  input: RoofAreaPipelineInput,
): RoofAreaPipelineResult {
  const { planAreaM2, pitchDegrees, roofType, cutouts, wastePercent } = input;

  // ── Step 1: Plan Area ──
  const planArea = Math.max(0, planAreaM2);

  // ── Step 2: Pitch ──
  const pitchApplied = roofType !== 'flat' && pitchDegrees !== null && pitchDegrees > 0;

  // ── Step 3: Sloped Surface Area ──
  let slopedSurfaceArea: number;
  if (pitchApplied) {
    const pitchRad = (pitchDegrees! * Math.PI) / 180;
    slopedSurfaceArea = planArea / Math.cos(pitchRad);
  } else {
    slopedSurfaceArea = planArea;
  }

  // ── Step 4: Cutouts ──
  const cutoutArea = cutouts.reduce((sum, c) => sum + Math.max(0, c.areaM2), 0);

  // ── Step 5: Net Area ──
  const netArea = Math.max(0, slopedSurfaceArea - cutoutArea);

  // ── Step 6: Waste ──
  const wasteFraction = Math.max(0, wastePercent) / 100;

  // ── Step 7: Order Quantity ──
  const orderArea = netArea * (1 + wasteFraction);

  // ── Explanation ──
  const explanation: RoofAreaExplanation = {
    planArea: `Plan area: ${planArea.toFixed(2)} m²`,
    pitch: pitchApplied
      ? `Pitch: ${pitchDegrees!.toFixed(1)}° (${roofType}) — surface = plan ÷ cos(${pitchDegrees!.toFixed(1)}°)`
      : roofType === 'flat'
        ? `Pitch: N/A (flat roof — no pitch adjustment)`
        : `Pitch: NOT PROVIDED — sloped surface = plan area (pitch required for accurate calculation)`,
    slopedSurface: `Pitch-adjusted surface: ${slopedSurfaceArea.toFixed(2)} m²`,
    cutouts: cutouts.length > 0
      ? `Cutouts: ${cutouts.map(c => `${c.name} (${c.areaM2.toFixed(2)} m²)`).join(', ')} — total: ${cutoutArea.toFixed(2)} m²`
      : `Cutouts: none`,
    net: `Net: ${netArea.toFixed(2)} m²`,
    waste: `Waste: ${wastePercent.toFixed(1)}%`,
    order: `Order area: ${orderArea.toFixed(2)} m²`,
  };

  return {
    planAreaM2: planArea,
    pitchDegrees,
    slopedSurfaceAreaM2: slopedSurfaceArea,
    cutoutAreaM2: cutoutArea,
    cutouts: cutouts.map(c => ({ name: c.name, areaM2: c.areaM2, type: c.type })),
    netAreaM2: netArea,
    wastePercent,
    orderAreaM2: orderArea,
    pitchApplied,
    explanation,
  };
}

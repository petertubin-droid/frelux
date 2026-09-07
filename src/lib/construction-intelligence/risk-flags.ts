/**
 * FRELUX CONSTRUCTION INTELLIGENCE — COST & RISK FLAGS
 *
 * Prompt 3, §17: warnings based on ACTUAL project data, each with a
 * traceable reason. This module derives flags only from concrete evidence
 * passed in (takeoff items, AI detection records, price records). It never
 * manufactures risk scores and never invents thresholds that the data does
 * not support.
 */

import type { QuantityTakeoff, TakeoffDiscipline } from "./takeoff";
import { DISCIPLINE_LABELS } from "./takeoff";

// =========================================================
// Types
// =========================================================

export type RiskSeverity = "info" | "warning" | "critical";

export type RiskCode =
  | "missing_measurement" // an element/space has no measured quantity
  | "requires_calculation" // a discipline has measurements but no engine run
  | "invalid_measurement" // non-finite or negative quantity
  | "low_confidence_ai" // AI detection below threshold, not yet verified
  | "unverified_input" // value awaiting user verification
  | "missing_regional_price" // material unpriced for the active region
  | "outdated_price" // priced, but the price date is stale
  | "missing_material_specification"; // material lacks unit/spec context

export const RISK_CODE_LABELS: Record<RiskCode, string> = {
  missing_measurement: "Missing measurement",
  requires_calculation: "Calculation pending",
  invalid_measurement: "Invalid measurement",
  low_confidence_ai: "Low confidence AI detection",
  unverified_input: "Unverified input",
  missing_regional_price: "Missing regional price",
  outdated_price: "Outdated price",
  missing_material_specification: "Missing material specification",
};

export interface RiskFlag {
  code: RiskCode;
  severity: RiskSeverity;
  title: string;
  /** Traceable reason — references the actual value/record that caused it. */
  reason: string;
  /** Ids of the takeoff items / records this flag is derived from. */
  references: string[];
}

/**
 * An AI detection record as far as risk evaluation is concerned.
 * Confidence is 0–1 as produced by the extraction layer.
 */
export interface AiDetectionForRisk {
  id: string;
  label: string;
  /** 0–1 confidence reported by the AI extraction layer. */
  confidence: number;
  /** Current verification state from the Prompt 1 flow. */
  verified: boolean;
}

/** Regional price evidence for a material (from market intelligence). */
export interface PriceEvidenceForRisk {
  /** Takeoff material item id this price belongs to. */
  materialItemId?: string;
  materialName: string;
  /** Resolved price for the active region, if any. */
  price?: number;
  /** Effective/collected date of the price (ISO string), if any. */
  priceDate?: string;
  /** ISO currency code of the price, if priced. */
  currency?: string;
}

export interface RiskEvaluationInput {
  takeoff: QuantityTakeoff;
  /** AI detection records for the project (Prompt 1 extraction layer). */
  aiDetections?: AiDetectionForRisk[];
  /** Price evidence per material for the active regional context. */
  priceEvidence?: PriceEvidenceForRisk[];
  /** Prices older than this many days are flagged as outdated. Default 180. */
  priceStaleDays?: number;
}

// =========================================================
// Evaluation
// =========================================================

/**
 * Confidence below this means "requires user confirmation" per the Prompt 1
 * verification flow. The threshold is the extraction layer's own documented
 * boundary — not an invented risk score.
 */
export const AI_CONFIDENCE_THRESHOLD = 0.7;

export function evaluateRiskFlags(input: RiskEvaluationInput): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const { takeoff, aiDetections, priceEvidence, priceStaleDays = 180 } = input;

  // --- 1. Invalid measurements (defensive — engines should reject these) ---
  for (const item of takeoff.measurementItems) {
    if (!Number.isFinite(item.baseQuantity) || item.baseQuantity < 0) {
      flags.push({
        code: "invalid_measurement",
        severity: "critical",
        title: `Invalid measurement: ${item.label}`,
        reason: `Measurement "${item.label}" is not a valid positive number.`,
        references: [item.id],
      });
    }
  }

  // --- 2. Elements measured but not yet run through an engine ---
  for (const pending of takeoff.requiresCalculation) {
    flags.push({
      code: "requires_calculation",
      severity: "warning",
      title: `${DISCIPLINE_LABELS[pending.discipline as TakeoffDiscipline]} calculation pending for ${pending.elementName}`,
      reason:
        `Element "${pending.elementName}" has measurements for ${DISCIPLINE_LABELS[pending.discipline as TakeoffDiscipline].toLowerCase()}, ` +
        "but no saved calculation from the deterministic engine exists yet. No quantities were estimated in its place.",
      references: [pending.elementId],
    });
  }

  // --- 3. Low-confidence or unverified AI detections ---
  for (const detection of aiDetections ?? []) {
    if (detection.verified) continue;
    if (detection.confidence < AI_CONFIDENCE_THRESHOLD) {
      flags.push({
        code: "low_confidence_ai",
        severity: "warning",
        title: `Low confidence AI detection: ${detection.label}`,
        reason:
          `AI detected "${detection.label}" with ${Math.round(detection.confidence * 100)}% confidence ` +
          `(below the ${AI_CONFIDENCE_THRESHOLD * 100}% verification threshold) and it has not been verified by you.`,
        references: [detection.id],
      });
    } else {
      flags.push({
        code: "unverified_input",
        severity: "info",
        title: `Awaiting verification: ${detection.label}`,
        reason:
          `AI detected "${detection.label}" with ${Math.round(detection.confidence * 100)}% confidence. ` +
          "Confirm or correct it before it is treated as verified.",
        references: [detection.id],
      });
    }
  }

  // --- 4. Price evidence: missing / stale / underspecified ---
  const staleCutoff = Date.now() - priceStaleDays * 24 * 60 * 60 * 1000;
  for (const evidence of priceEvidence ?? []) {
    if (evidence.price === undefined || evidence.price === null) {
      flags.push({
        code: "missing_regional_price",
        severity: "warning",
        title: `Price unavailable for this region: ${evidence.materialName}`,
        reason:
          `No verified price is configured for "${evidence.materialName}" in the active region. ` +
          "The item is listed without a cost. Enter a verified price to include it in the estimate.",
        references: evidence.materialItemId ? [evidence.materialItemId] : [],
      });
      continue;
    }
    if (evidence.priceDate) {
      const date = new Date(evidence.priceDate).getTime();
      if (Number.isFinite(date) && date < staleCutoff) {
        const ageDays = Math.floor((Date.now() - date) / (24 * 60 * 60 * 1000));
        flags.push({
          code: "outdated_price",
          severity: "info",
          title: `Outdated price: ${evidence.materialName}`,
          reason:
            `Price for "${evidence.materialName}" (${evidence.currency ?? ""} ${evidence.price}) was last recorded ` +
            `${ageDays} days ago (${evidence.priceDate}). Verify it is still current before relying on the total.`,
          references: evidence.materialItemId ? [evidence.materialItemId] : [],
        });
      }
    }
  }

  // --- 5. Materials lacking specification context ---
  for (const item of takeoff.materialItems) {
    const m = item.material;
    if (!m.unit || !m.name || !Number.isFinite(m.baseQuantity)) {
      flags.push({
        code: "missing_material_specification",
        severity: "warning",
        title: `Missing specification: ${m.name || "unnamed material"}`,
        reason:
          `Material from calculation "${item.calculation.title}" is missing unit or quantity context, ` +
          "so it cannot be priced or ordered reliably.",
        references: [item.id],
      });
    }
  }

  return flags;
}

/** Convenience: only the blocking/critical flags. */
export function criticalFlags(flags: RiskFlag[]): RiskFlag[] {
  return flags.filter((f) => f.severity === "critical");
}

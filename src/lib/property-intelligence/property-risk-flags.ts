/**
 * FRELUX PROPERTY INTELLIGENCE — PROPERTY RISK FLAGS
 *
 * Prompt 4, Phase 12: transparent, evidence-based property risk flags.
 * Same rules as construction-intelligence/risk-flags: no arbitrary risk
 * scores; every flag explains exactly why it exists, from the data given.
 */

import type { PropertyProfile } from "./types";
import { resolveRegionalContext, type LocationResolutionInput } from "./location";
import type { ComparableEvaluation } from "./market-data";

// =========================================================
// Types
// =========================================================

export type PropertyRiskSeverity = "info" | "warning" | "critical";

export type PropertyRiskCode =
  | "missing_location" // no usable location at all
  | "location_requires_confirmation" // country unknown — profile pending
  | "region_unsupported" // no regional profile — no fallback applied
  | "unverified_property_info" // profile values awaiting verification
  | "low_confidence_ai_data" // AI-extracted values below threshold
  | "missing_documents" // no supporting documents attached
  | "missing_dimensions" // no building/land dimensions anywhere
  | "insufficient_comparables" // comparable analysis says insufficient
  | "no_market_data" // no market data for the region
  | "outdated_market_data" // comparable data older than the window
  | "unpriced_construction_items" // construction cost has unpriced items
  | "condition_unverified"; // condition claims not from authoritative source

export const PROPERTY_RISK_LABELS: Record<PropertyRiskCode, string> = {
  missing_location: "Missing location",
  location_requires_confirmation: "Location needs confirmation",
  region_unsupported: "Region not supported",
  unverified_property_info: "Unverified property information",
  low_confidence_ai_data: "Low confidence AI data",
  missing_documents: "Missing documents",
  missing_dimensions: "Missing dimensions",
  insufficient_comparables: "Insufficient comparables",
  no_market_data: "No market data for this region",
  outdated_market_data: "Outdated market data",
  unpriced_construction_items: "Unpriced construction items",
  condition_unverified: "Building condition unverified",
};

export interface PropertyRiskFlag {
  code: PropertyRiskCode;
  severity: PropertyRiskSeverity;
  title: string;
  reason: string;
}

export interface PropertyRiskInput {
  profile: PropertyProfile;
  /** Comparable evaluation result, if one was run. */
  comparables?: ComparableEvaluation;
  /** Unpriced construction item names (from Construction Intelligence). */
  unpricedConstructionItems?: string[];
  /**
   * Is any building condition value present WITHOUT authoritative
   * verification? FRELUX never claims condition from photographs alone.
   */
  conditionClaimedWithoutSource?: boolean;
  /** Max comparable data age in days — default 180 (used for the outdated flag). */
  comparableMaxAgeDays?: number;
  /** Oldest comparable observation date actually used, if any. */
  oldestComparableDate?: string;
}

// =========================================================
// Evaluation
// =========================================================

export function evaluatePropertyRisks(input: PropertyRiskInput): PropertyRiskFlag[] {
  const flags: PropertyRiskFlag[] = [];
  const { profile } = input;

  // --- Location ---
  const hasAnyLocation =
    Boolean(profile.location.address) ||
    Boolean(profile.location.city) ||
    Boolean(profile.location.coordinates);
  if (!hasAnyLocation) {
    flags.push({
      code: "missing_location",
      severity: "critical",
      title: "No location information",
      reason: "The property has no address, city or coordinates. Location analysis and regional pricing cannot proceed.",
    });
  } else {
    const resolution = resolveRegionalContext({
      country: profile.location.country,
      region: profile.location.region,
      city: profile.location.city,
      coordinates: profile.location.coordinates,
    });
    if (resolution.status === "requires_confirmation") {
      flags.push({
        code: "location_requires_confirmation",
        severity: "warning",
        title: "Location requires confirmation",
        reason: resolution.reason,
      });
    } else if (resolution.status === "unsupported") {
      flags.push({
        code: "region_unsupported",
        severity: "info",
        title: "Property market data unavailable for this region",
        reason: `${resolution.reason} Universal building analysis remains available.`,
      });
    }
  }

  // --- Unverified / low-confidence profile values ---
  const unverifiedFields: string[] = [];
  const lowConfidenceFields: string[] = [];
  const checkProvenance = (label: string, p?: { confidence?: number; verificationStatus: string }) => {
    if (!p) return;
    if (p.verificationStatus === "requires_confirmation" || p.verificationStatus === "unverified") {
      unverifiedFields.push(label);
    }
    if (p.confidence !== undefined && p.confidence < 0.7) {
      lowConfidenceFields.push(`${label} (${Math.round(p.confidence * 100)}% confidence)`);
    }
  };
  checkProvenance("location", profile.location.provenance);
  checkProvenance("land information", profile.land?.provenance);
  if (profile.provenance) checkProvenance("property details", profile.provenance);

  if (unverifiedFields.length > 0) {
    flags.push({
      code: "unverified_property_info",
      severity: "warning",
      title: "Unverified property information",
      reason: `The following information has not been verified: ${unverifiedFields.join(", ")}. Confirm it before relying on analysis results.`,
    });
  }
  if (lowConfidenceFields.length > 0) {
    flags.push({
      code: "low_confidence_ai_data",
      severity: "warning",
      title: "Low confidence AI-detected data",
      reason: `AI-detected values below the 70% confidence threshold need your confirmation: ${lowConfidenceFields.join(", ")}.`,
    });
  }

  // --- Documents ---
  if (!profile.documents || profile.documents.length === 0) {
    flags.push({
      code: "missing_documents",
      severity: "info",
      title: "No supporting documents",
      reason: "No property documents (title documents, plans, survey) are attached. FRELUX makes no ownership, title or planning claims.",
    });
  }

  // --- Dimensions ---
  if (profile.land?.size === undefined && !profile.constructionProjectId) {
    flags.push({
      code: "missing_dimensions",
      severity: "warning",
      title: "Missing dimensions",
      reason: "No land size is recorded and no Construction Intelligence project is linked, so no size-based analysis (price per m², development quantities) can be produced.",
    });
  }

  // --- Comparables / market data ---
  if (input.comparables) {
    if (input.comparables.status === "insufficient_data") {
      flags.push({
        code: "insufficient_comparables",
        severity: "warning",
        title: "Insufficient data for reliable comparison",
        reason: input.comparables.reason,
      });
    }
    const maxAge = input.comparableMaxAgeDays ?? 180;
    const cutoff = Date.now() - maxAge * 24 * 60 * 60 * 1000;
    if (input.oldestComparableDate && new Date(input.oldestComparableDate).getTime() < cutoff) {
      flags.push({
        code: "outdated_market_data",
        severity: "info",
        title: "Outdated market data",
        reason: `The oldest comparable used was observed on ${input.oldestComparableDate}, older than the ${maxAge}-day freshness window. Treat comparison results with caution.`,
      });
    }
  }

  // --- Construction cost gaps ---
  if (input.unpricedConstructionItems && input.unpricedConstructionItems.length > 0) {
    flags.push({
      code: "unpriced_construction_items",
      severity: "warning",
      title: "Unpriced construction items",
      reason: `The construction cost estimate excludes unpriced items: ${input.unpricedConstructionItems.join(", ")}. The true cost is higher than the shown total.`,
    });
  }

  // --- Condition claims ---
  if (input.conditionClaimedWithoutSource) {
    flags.push({
      code: "condition_unverified",
      severity: "warning",
      title: "Building condition unverified",
      reason: "A building condition value is present without an authoritative source. FRELUX does not claim structural condition from photographs — a professional inspection is required.",
    });
  }

  return flags;
}

// =========================================================
// FRELUX PLAN VISION — Copilot Bridge (§19)
//
// From within the Copilot the user can ask:
//   "What materials do I need for the plan I uploaded?"
//
// This bridge converts VERIFIED plan-extraction data into AI
// Foundation facts (origin: project_data, user-verified) that the
// requirements resolver already prioritizes. The Copilot then:
//   1. checks verified extracted data (no unnecessary questions)
//   2. asks only for what is genuinely missing
//   3. routes through the authoritative engines — never its own math
//
// Only user-verified facts cross this bridge. Unverified AI
// observations are NOT exposed to the Copilot as project data —
// they would be indistinguishable from real project facts.
// =========================================================

import type { PlanExtraction } from "./types";
import { dimensionToMeters, isUnknown } from "./dimensions";
import { verifiedFactsToEnginePatch } from "./building-model";
import type { AiFact } from "@/lib/ai-foundation/types";
import { createFact } from "@/lib/ai-foundation/trust";

/** Which extraction facts map to which Copilot requirement keys. */
const FACT_KEYS_TO_COPILOT_KEYS: Record<string, string> = {
  building_length: "building_length",
  building_width: "building_width",
  number_of_floors: "number_of_floors",
  floor_to_floor_height: "floor_to_floor_height",
  wall_thickness: "wall_thickness",
  internal_wall_length: "internal_wall_length",
  roof_pitch_degrees: "roof_pitch_degrees",
  roof_overhang: "roof_overhang",
  building_type: "building_type",
  foundation_type: "foundation_type",
};

/**
 * Build Copilot-ready facts from a VERIFIED extraction.
 * Numeric dimensions are converted to metres (the engine input
 * basis); enum facts pass through as strings. Every fact carries
 * evidence pointing back to the source document (§18 traceability).
 */
export function planFactsForCopilot(extraction: PlanExtraction): AiFact[] {
  const facts: AiFact[] = [];
  const now = new Date().toISOString();

  const { patch } = verifiedFactsToEnginePatch(
    extraction.buildingFacts,
    extraction.roof,
  );
  const patchRecord = patch as Record<string, unknown>;

  for (const [factKey, copilotKey] of Object.entries(
    FACT_KEYS_TO_COPILOT_KEYS,
  )) {
    const value = patchRecord[copilotKey];
    if (value === undefined || value === null) continue;

    const sourceFact = extraction.buildingFacts.find((f) => f.key === factKey);
    facts.push(
      createFact({
        key: copilotKey,
        label: sourceFact?.label ?? factKey.replace(/_/g, " "),
        value: typeof value === "number" ? value : String(value),
        unit: typeof value === "number" ? "m" : undefined,
        origin: "project_data",
        source: "FRELUX-plan-vision (verified plan extraction)",
        confidence: 1,
        evidence: sourceFact?.provenance.quote
          ? `Verified from your uploaded plan document (page ${sourceFact.provenance.page}): "${sourceFact.provenance.quote}"`
          : "Verified from your uploaded plan document.",
        detectedAt: now,
      }),
    );
  }

  // Verified roof type (from the roof element, §14).
  const roof = extraction.roof;
  if (
    roof &&
    (roof.reviewStatus === "user_confirmed" ||
      roof.reviewStatus === "user_edited") &&
    roof.roofType !== "unknown" &&
    patchRecord.roof_type === undefined
  ) {
    facts.push(
      createFact({
        key: "roof_type",
        label: "Roof type",
        value: roof.roofType,
        origin: "project_data",
        source: "FRELUX-plan-vision (verified plan extraction)",
        confidence: 1,
        evidence: "Roof type verified from your roof plan.",
        detectedAt: now,
      }),
    );
  }

  // First verified room as room-level context (for painting-style tasks).
  const firstRoom = extraction.rooms.find(
    (r) =>
      (r.reviewStatus === "user_confirmed" ||
        r.reviewStatus === "user_edited") &&
      !isUnknown(r.length) &&
      !isUnknown(r.width),
  );
  if (firstRoom) {
    const lengthM = dimensionToMeters(firstRoom.length);
    const widthM = dimensionToMeters(firstRoom.width);
    const heightM = dimensionToMeters(firstRoom.height);
    const roomEvidence = `Verified room "${firstRoom.name}" from your plan (page ${firstRoom.provenance.page}).`;
    if (lengthM !== null) {
      facts.push(
        createFact({
          key: "length",
          label: `Room length (${firstRoom.name})`,
          value: lengthM,
          unit: "m",
          origin: "project_data",
          source: "FRELUX-plan-vision (verified plan extraction)",
          confidence: 1,
          evidence: roomEvidence,
          detectedAt: now,
        }),
      );
    }
    if (widthM !== null) {
      facts.push(
        createFact({
          key: "width",
          label: `Room width (${firstRoom.name})`,
          value: widthM,
          unit: "m",
          origin: "project_data",
          source: "FRELUX-plan-vision (verified plan extraction)",
          confidence: 1,
          evidence: roomEvidence,
          detectedAt: now,
        }),
      );
    }
    if (heightM !== null) {
      facts.push(
        createFact({
          key: "height",
          label: `Wall height (${firstRoom.name})`,
          value: heightM,
          unit: "m",
          origin: "project_data",
          source: "FRELUX-plan-vision (verified plan extraction)",
          confidence: 1,
          evidence: roomEvidence,
          detectedAt: now,
        }),
      );
    }
    if (firstRoom.height && !isUnknown(firstRoom.height)) {
      facts.push(
        createFact({
          key: "wallHeight",
          label: `Wall height (${firstRoom.name})`,
          value: heightM!,
          unit: "m",
          origin: "project_data",
          source: "FRELUX-plan-vision (verified plan extraction)",
          confidence: 1,
          evidence: roomEvidence,
          detectedAt: now,
        }),
      );
    }
  }

  return facts;
}

/**
 * Does the extraction carry verified plan data the Copilot can
 * use? Drives the Copilot's "check the plan first" behavior.
 */
export function hasVerifiedPlanData(
  extraction: PlanExtraction | null | undefined,
): boolean {
  if (!extraction) return false;
  return planFactsForCopilot(extraction).length > 0;
}

/**
 * Copilot answer support (§19): a short human summary of what the
 * verified plan contains, so the Copilot can answer "what do you
 * know about my plan?" without exposing unverified AI guesses.
 */
export function describeVerifiedPlan(extraction: PlanExtraction): string {
  const rooms = extraction.rooms.filter(
    (r) =>
      r.reviewStatus === "user_confirmed" || r.reviewStatus === "user_edited",
  );
  if (rooms.length === 0) {
    return "No verified rooms yet. Review the extracted rooms to use plan data in calculations.";
  }
  const names = rooms
    .slice(0, 5)
    .map((r) => r.name)
    .join(", ");
  const more = rooms.length > 5 ? ` (+${rooms.length - 5} more)` : "";
  return `Verified from your plan: ${rooms.length} room(s) — ${names}${more}.`;
}

// =========================================================
// FRELUX PLAN VISION — Multi-Document Reconciliation (§15)
//
// Information from MULTIPLE documents (floor plan + roof plan +
// elevations + photos…) contributes to the same project. When
// documents conflict, the system NEVER silently chooses one —
// the conflict is surfaced and requires user confirmation.
//
// Photos NEVER outrank dimensioned drawings (§16): when a
// dimensioned drawing and a photograph disagree on the same fact,
// the drawing's candidate is the default suggestion but the
// conflict is still shown.
// =========================================================

import type {
  DocumentConflict,
  DimensionValue,
  ExtractedBuildingFact,
  ExtractedRoom,
  PlanExtraction,
  ProvenanceRef,
} from "./types";
import { DOCUMENT_RELIABILITY } from "./types";
import { dimensionsContradict } from "./consistency";
import { rankDimensions } from "./dimensions";
import { isUnknown } from "./dimensions";

// =========================================================
// CONFLICT DETECTION
// =========================================================

/** Facts that reconciliation compares across documents. */
const RECONCILABLE_FACT_KEYS = new Set([
  "building_length",
  "building_width",
  "number_of_floors",
  "floor_to_floor_height",
  "wall_thickness",
  "roof_type",
  "roof_pitch_degrees",
  "roof_overhang",
]);

/**
 * Collect a canonical fact from every extraction that carries it.
 * Values are compared unit-safely (a metric plan and an imperial
 * elevation can both be right — metres are the comparison basis).
 */
export function collectFactCandidates(
  extractions: PlanExtraction[],
  key: string,
): Array<{
  documentId: string;
  dim: DimensionValue | null;
  enumValue?: string;
  confidence: number;
  provenance: ProvenanceRef;
  reliability: string;
}> {
  const out: Array<{
    documentId: string;
    dim: DimensionValue | null;
    enumValue?: string;
    confidence: number;
    provenance: ProvenanceRef;
    reliability: string;
  }> = [];
  for (const ex of extractions) {
    const fact = ex.buildingFacts.find(
      (f) => f.key === key && f.reviewStatus !== "user_rejected",
    );
    if (!fact) continue;
    out.push({
      documentId: ex.documentId,
      dim: fact.dimension,
      enumValue: fact.enumValue,
      confidence: fact.confidence,
      provenance: fact.provenance,
      reliability: "unknown",
    });
  }
  return out;
}

/**
 * Detect conflicts between documents for every reconcilable fact.
 * A conflict exists only when two non-unknown values differ beyond
 * tolerance — unknowns are NEVER treated as disagreements.
 */
export function detectDocumentConflicts(
  extractions: PlanExtraction[],
): DocumentConflict[] {
  const conflicts: DocumentConflict[] = [];
  if (extractions.length < 2) return conflicts;

  for (const key of RECONCILABLE_FACT_KEYS) {
    const candidates = collectFactCandidates(extractions, key);
    const usable = candidates.filter((c) => c.enumValue || !isUnknown(c.dim));
    if (usable.length < 2) continue;

    // Enum facts: string disagreement.
    const enums = usable.filter((c) => c.enumValue);
    if (enums.length >= 2) {
      const distinct = new Set(enums.map((c) => c.enumValue));
      if (distinct.size > 1) {
        conflicts.push({
          key,
          label: enums[0].provenance.quote ?? key,
          candidates: enums.map((c) => ({
            documentId: c.documentId,
            value: c.enumValue,
            confidence: c.confidence,
            provenance: c.provenance,
          })),
          resolution: "unresolved",
        });
        continue;
      }
    }

    // Numeric facts: unit-safe contradiction check.
    const dims = usable.filter((c) => !isUnknown(c.dim) && c.dim);
    if (dims.length >= 2) {
      let contradicts = false;
      for (let i = 1; i < dims.length; i++) {
        if (dimensionsContradict(dims[0].dim!, dims[i].dim!)) {
          contradicts = true;
          break;
        }
      }
      if (contradicts) {
        conflicts.push({
          key,
          label: key.replace(/_/g, " "),
          candidates: dims.map((c) => ({
            documentId: c.documentId,
            value: c.dim,
            confidence: c.confidence,
            provenance: c.provenance,
          })),
          resolution: "unresolved",
        });
      }
    }
  }

  return conflicts;
}

// =========================================================
// MERGE — a single reconciled view for review
// =========================================================

/**
 * Reconciliation context: which document is dimension-grade
 * (footprint/roof geometry from drawings outrank photos, §16).
 */
export interface DocumentReliabilityMap {
  [documentId: string]:
    "dimensioned_drawing" | "undimensioned_drawing" | "visual_only";
}

/**
 * Merge rooms from all extractions. Rooms are keyed by
 * name-normalized identity — different documents describing the
 * SAME room merge into one review row; overlapping names with
 * contradictory dimensions become conflicts instead of a silent
 * choice.
 */
export function mergeRooms(extractions: PlanExtraction[]): {
  rooms: ExtractedRoom[];
  conflicts: DocumentConflict[];
} {
  const merged: ExtractedRoom[] = [];
  const conflicts: DocumentConflict[] = [];

  for (const ex of extractions) {
    for (const room of ex.rooms) {
      if (room.reviewStatus === "user_rejected") continue;
      const match = merged.find(
        (m) =>
          m.name.trim().toLowerCase() === room.name.trim().toLowerCase() &&
          (m.floor ?? 1) === (room.floor ?? 1),
      );
      if (!match) {
        merged.push(room);
        continue;
      }
      // Same room from two documents — check the dimensions agree.
      const a = match.length;
      const b = room.length;
      if (
        a &&
        b &&
        !isUnknown(a) &&
        !isUnknown(b) &&
        dimensionsContradict(a, b)
      ) {
        conflicts.push({
          key: `room:${room.id}`,
          label: `Room "${room.name}" dimensions`,
          candidates: [
            {
              documentId: match.provenance.documentId,
              value: a,
              confidence: match.confidence,
              provenance: match.provenance,
            },
            {
              documentId: room.provenance.documentId,
              value: b,
              confidence: room.confidence,
              provenance: room.provenance,
            },
          ],
          resolution: "unresolved",
        });
      }
      // Keep the first (they describe the same room; conflict is surfaced above).
    }
  }

  return { rooms: merged, conflicts };
}

/**
 * Merge building facts across documents into ONE reconciled set.
 * When all documents agree (within tolerance) the fact carries all
 * provenance refs. When they disagree, the conflict is surfaced —
 * no silent resolution (§15).
 */
export function mergeBuildingFacts(extractions: PlanExtraction[]): {
  facts: ExtractedBuildingFact[];
  conflicts: DocumentConflict[];
} {
  const conflicts = detectDocumentConflicts(extractions);
  const conflictKeys = new Set(conflicts.map((c) => c.key));

  const facts: ExtractedBuildingFact[] = [];
  const seen = new Set<string>();

  for (const ex of extractions) {
    for (const fact of ex.buildingFacts) {
      if (fact.reviewStatus === "user_rejected") continue;
      if (seen.has(fact.key)) continue;
      if (conflictKeys.has(fact.key)) {
        // Conflicting fact — include the first candidate for review,
        // the conflict itself is carried in `conflicts`.
        seen.add(fact.key);
        facts.push(fact);
        continue;
      }
      seen.add(fact.key);
      facts.push(fact);
    }
  }

  return { facts, conflicts };
}

/**
 * Choose the suggested candidate for a conflict: dimensioned
 * drawings outrank undimensioned drawings outrank photos (§16),
 * then higher dimension kind (explicit > inferred), then
 * confidence. A SUGGESTION only — the user still confirms.
 */
export function suggestConflictCandidate(
  conflict: DocumentConflict,
  reliability: DocumentReliabilityMap,
): number {
  const RELIABILITY_RANK = {
    dimensioned_drawing: 0,
    undimensioned_drawing: 1,
    visual_only: 2,
  } as const;
  let best = 0;
  let bestScore = -Infinity;
  conflict.candidates.forEach((c, i) => {
    const rel =
      RELIABILITY_RANK[reliability[c.documentId] ?? "visual_only"] ?? 2;
    const dim =
      c.value &&
      typeof c.value === "object" &&
      "kind" in (c.value as DimensionValue)
        ? rankDimensions(c.value as DimensionValue, null)
        : 0;
    const score = -rel * 100 + dim * 10 + c.confidence;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/**
 * Apply a user's conflict resolution (§15 — the user, never the
 * system, decides). Returns the updated conflicts array.
 */
export function resolveConflict(
  conflicts: DocumentConflict[],
  conflictKey: string,
  resolution: DocumentConflict["resolution"],
  chosenIndex: number,
): DocumentConflict[] {
  return conflicts.map((c) => {
    if (c.key !== conflictKey) return c;
    return {
      ...c,
      resolution,
      resolvedValue:
        resolution === "keep_first"
          ? c.candidates[0]?.value
          : resolution === "keep_second" &&
              chosenIndex >= 0 &&
              chosenIndex < c.candidates.length
            ? c.candidates[chosenIndex]?.value
            : c.resolvedValue,
    };
  });
}

/** Are all conflicts resolved? Unresolved conflicts block takeoff. */
export function allConflictsResolved(conflicts: DocumentConflict[]): boolean {
  return conflicts.every((c) => c.resolution !== "unresolved");
}

// =========================================================
// FRELUX PLAN VISION, Canonical Building Model Integration (§9)
//
//   Uploaded plan → AI extraction → verification → CANONICAL
//   FRELUX Building/Property Model → calculators/intelligence.
//
// There is NO second building model. Verified Phase 3 data flows
// into the EXISTING canonical structures:
//   - Rooms → measurement/space-engine Space objects
//     (the Space Engine / Project Engine own room math)
//   - Building facts + roof → BuildToRoofInput patch
//     (the Build-to-Roof engine owns whole-building math)
//
// ONLY user-verified elements (user_confirmed / user_edited)
// pass through. Unverified AI observations are rejected at the
// door, this function throws/flags rather than passing them.
// =========================================================

import type {
  ExtractedBuildingFact,
  ExtractedRoof,
  ExtractedRoom,
  PlanExtraction,
} from "./types";
import { dimensionToMeters, isUnknown } from "./dimensions";
import { isRoomVerified } from "./review";
import type { Space } from "@/lib/measurement/space-engine";
import { createSpace } from "@/lib/measurement/space-engine";
import type { BuildToRoofInput } from "@/types/build-to-roof";

// =========================================================
// VERIFIED ROOM → CANONICAL SPACE
// =========================================================

/**
 * Convert a VERIFIED extracted room into the canonical Space
 * object (measurement/space-engine). Unknown heights fall back
 * to the Space Engine's own defaults, never an invented AI
 * value. Openings are carried only when their dimensions are
 * reliable (§13); unknown openings stay out of area deductions.
 */
export function verifiedRoomToSpace(room: ExtractedRoom): Space {
  const verified =
    room.reviewStatus === "user_confirmed" ||
    room.reviewStatus === "user_edited";
  if (!verified) {
    throw new Error(
      `Room "${room.name}" is not user-verified, it cannot enter the canonical Building Model. Confirm or edit it first.`,
    );
  }

  const lengthM = dimensionToMeters(room.length);
  const widthM = dimensionToMeters(room.width);
  if (lengthM === null || widthM === null) {
    throw new Error(
      `Room "${room.name}" lacks reliable dimensions, it cannot enter the canonical Building Model.`,
    );
  }

  const heightM = dimensionToMeters(room.height);
  const openings = room.openings
    .filter(
      (o) =>
        (o.reviewStatus === "user_confirmed" ||
          o.reviewStatus === "user_edited") &&
        !isUnknown(o.width) &&
        !isUnknown(o.height),
    )
    .map((o) => ({
      id: o.id,
      type: o.type,
      width: dimensionToMeters(o.width)!,
      height: dimensionToMeters(o.height)!,
      unit: "meters" as const,
      count: o.count,
    }));

  // The Space Engine's createSpace owns defaults (ceiling, waste…).
  // Verified openings are mapped into the Space's own opening
  // structure, the Space Engine decides how they affect areas.
  return createSpace({
    name: room.name,
    type: room.spaceType,
    length: lengthM,
    width: widthM,
    height: heightM ?? undefined,
    unit: "meters",
    quantity: 1,
    openings,
  });
}

/**
 * All verified rooms of an extraction → canonical Spaces.
 * Unverified/rejected rooms are skipped (they never reach
 * calculators silently).
 */
export function extractionToSpaces(extraction: PlanExtraction): Space[] {
  const spaces: Space[] = [];
  for (const room of extraction.rooms) {
    if (!isRoomVerified(room)) continue;
    try {
      spaces.push(verifiedRoomToSpace(room));
    } catch {
      // A verified room missing dims is impossible by definition
      // of isRoomVerified, skip defensively rather than crash a batch.
    }
  }
  return spaces;
}

// =========================================================
// VERIFIED FACTS → BUILD-TO-ROOF INPUT PATCH (whole-building path)
// =========================================================

/** Keys of BuildToRoofInput that Phase 3 facts can fill. */
const FACT_TO_ENGINE_KEY: Record<string, keyof BuildToRoofInput> = {
  building_length: "building_length",
  building_width: "building_width",
  number_of_floors: "number_of_floors",
  floor_to_floor_height: "floor_to_floor_height",
  wall_thickness: "wall_thickness",
  internal_wall_length: "internal_wall_length",
  roof_pitch_degrees: "roof_pitch_degrees",
  roof_overhang: "roof_overhang",
};

export interface BuildingModelPatchResult {
  patch: Partial<BuildToRoofInput>;
  applied: string[];
  skipped: Array<{ key: string; reason: string }>;
}

/**
 * Build a patch for the existing BuildToRoofInput from VERIFIED
 * building facts and roof geometry. Only user-verified values are
 * applied; everything else is skipped with an explicit reason.
 * (Same contract as the Phase 2 buildEnginePatch, no duplicate
 * math, just element-level sourcing.)
 */
export function verifiedFactsToEnginePatch(
  facts: ExtractedBuildingFact[],
  roof: ExtractedRoof | null,
): BuildingModelPatchResult {
  const patch: Partial<BuildToRoofInput> = {};
  const applied: string[] = [];
  const skipped: Array<{ key: string; reason: string }> = [];

  for (const fact of facts) {
    const engineKey = FACT_TO_ENGINE_KEY[fact.key];
    if (!engineKey) continue;

    const verified =
      fact.reviewStatus === "user_confirmed" ||
      fact.reviewStatus === "user_edited";
    if (!verified) {
      skipped.push({ key: fact.key, reason: "not user-verified yet" });
      continue;
    }

    if (fact.enumValue !== undefined) {
      (patch as Record<string, unknown>)[engineKey] = fact.enumValue;
      applied.push(fact.key);
      continue;
    }

    if (isUnknown(fact.dimension)) {
      skipped.push({ key: fact.key, reason: "value unknown" });
      continue;
    }

    const valueM = dimensionToMeters(fact.dimension);
    if (valueM === null) {
      skipped.push({ key: fact.key, reason: "value unknown" });
      continue;
    }

    // Whole-number facts (floors) must not be fractional.
    const raw =
      fact.key === "number_of_floors"
        ? Math.max(1, Math.round(fact.dimension!.value))
        : valueM;
    (patch as Record<string, unknown>)[engineKey] =
      Math.round(raw * 1000) / 1000;
    applied.push(fact.key);
  }

  // Roof type from the verified roof element (§14, never an
  // unsupported approximation; geometrySufficient is required).
  if (
    roof &&
    (roof.reviewStatus === "user_confirmed" ||
      roof.reviewStatus === "user_edited")
  ) {
    if (!roof.geometrySufficient) {
      skipped.push({
        key: "roof_type",
        reason: "roof geometry insufficient, requires confirmation (§14)",
      });
    } else if (roof.roofType !== "unknown") {
      (patch as Record<string, unknown>).roof_type = roof.roofType;
      applied.push("roof_type");
    }
  } else if (roof) {
    skipped.push({ key: "roof_type", reason: "roof not user-verified yet" });
  }

  return { patch, applied, skipped };
}

// =========================================================
// FULL EXTRACTION → CANONICAL MODEL
// =========================================================

export interface CanonicalBuildingModel {
  /** Verified rooms as canonical Spaces (Space Engine math). */
  spaces: Space[];
  /** Verified building facts as a Build-to-Roof patch. */
  buildToRoofPatch: BuildingModelPatchResult;
  /** Verified roof geometry (Requires Confirmation when insufficient). */
  roof: ExtractedRoof | null;
  /** Facts that did not pass verification, shown to the user. */
  unverifiedCount: number;
}

/**
 * The single entry point: one (reconciled) extraction → canonical
 * Building Model. Nothing unverified passes. Missing information
 * is reported as missing, never filled with AI guesses.
 */
export function toCanonicalBuildingModel(
  extraction: PlanExtraction,
): CanonicalBuildingModel {
  const spaces = extractionToSpaces(extraction);
  const buildToRoofPatch = verifiedFactsToEnginePatch(
    extraction.buildingFacts,
    extraction.roof,
  );

  const verifiedRoof =
    extraction.roof &&
    (extraction.roof.reviewStatus === "user_confirmed" ||
      extraction.roof.reviewStatus === "user_edited")
      ? extraction.roof
      : null;

  const unverifiedCount =
    extraction.rooms.filter(
      (r) => !isRoomVerified(r) && r.reviewStatus !== "user_rejected",
    ).length +
    extraction.buildingFacts.filter(
      (f) =>
        f.reviewStatus !== "user_confirmed" &&
        f.reviewStatus !== "user_edited" &&
        f.reviewStatus !== "user_rejected",
    ).length;

  return {
    spaces,
    buildToRoofPatch,
    roof: verifiedRoof,
    unverifiedCount,
  };
}

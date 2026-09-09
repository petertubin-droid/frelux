// =========================================================
// FRELUX PLAN VISION, Human Verification Workflow (§8)
//
//   AI Extracted → Review → User Confirms/Edits/Rejects
//                → Verified Building Data
//
// The user can correct dimensions, room names, openings, roof type,
// floor count and any other extracted information. Users are
// NEVER locked into AI results.
//
// State machine (mirrors ai-foundation/trust.ts, an uncertain AI
// inference is never silently converted into a verified fact):
//   ai_extracted → in_review → user_confirmed
//                            → user_edited (correction recorded)
//                            → user_rejected
// A user-confirmed/edited element is the ONLY thing that may enter
// the canonical Building Model (§9) and calculators (§10–12).
// =========================================================

import type {
  ExtractedBuildingFact,
  ExtractedElementBase,
  ExtractedOpening,
  ExtractedRoof,
  ExtractedRoom,
  PlanExtraction,
  ProvenanceRef,
  ReviewStatus,
} from "./types";
import { explicitDimension, dimensionToMeters, isUnknown } from "./dimensions";

// =========================================================
// GENERIC REVIEW OPERATIONS
// =========================================================

function stamped<T extends ExtractedElementBase>(
  el: T,
  reviewStatus: ReviewStatus,
  now: string,
  correction?: { field: string; from: unknown; to: unknown },
): T {
  return {
    ...el,
    reviewStatus,
    verifiedAt:
      reviewStatus === "user_confirmed" || reviewStatus === "user_edited"
        ? now
        : el.verifiedAt,
    corrections: correction
      ? [...el.corrections, { ...correction, at: now }]
      : el.corrections,
  };
}

/** User started reviewing an element. */
export function startReview<T extends ExtractedElementBase>(
  el: T,
  now = new Date().toISOString(),
): T {
  if (el.reviewStatus !== "ai_extracted") return el;
  return { ...el, reviewStatus: "in_review" };
}

/** User confirmed the element as extracted (value unchanged). */
export function confirmElement<T extends ExtractedElementBase>(
  el: T,
  now = new Date().toISOString(),
): T {
  return stamped(el, "user_confirmed", now);
}

/** User rejected the element, it must never reach the Building Model. */
export function rejectElement<T extends ExtractedElementBase>(
  el: T,
  now = new Date().toISOString(),
): T {
  return stamped(el, "user_rejected", now);
}

/** Reset an element to fresh review state (re-extraction follow-up). */
export function resetElement<T extends ExtractedElementBase>(el: T): T {
  return { ...el, reviewStatus: "ai_extracted", verifiedAt: null };
}

// =========================================================
// ROOM REVIEW, dimension/name/type/opening corrections (§8)
// =========================================================

export interface RoomEdit {
  name?: string;
  spaceType?: ExtractedRoom["spaceType"];
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  floor?: number;
}

/**
 * User edits a room. Every change is recorded in the correction
 * history (§17) and the dimension becomes EXPLICIT, the user is
 * the authority (kind: explicit, confidence: 1, method: user_input).
 */
export function editRoom(
  room: ExtractedRoom,
  edit: RoomEdit,
  now = new Date().toISOString(),
): ExtractedRoom {
  const corrections: ExtractedRoom["corrections"] = [...room.corrections];
  const provenance: ProvenanceRef = {
    documentId: room.provenance.documentId,
    page: room.provenance.page,
    quote: "User-entered during review",
    method: "user_input",
  };

  let next: ExtractedRoom = { ...room, provenance };

  if (edit.name !== undefined && edit.name !== room.name) {
    corrections.push({
      field: "name",
      from: room.name,
      to: edit.name,
      at: now,
    });
    next = { ...next, name: edit.name };
  }
  if (edit.spaceType !== undefined && edit.spaceType !== room.spaceType) {
    corrections.push({
      field: "spaceType",
      from: room.spaceType,
      to: edit.spaceType,
      at: now,
    });
    next = { ...next, spaceType: edit.spaceType };
  }
  if (edit.lengthM !== undefined) {
    const prev = dimensionToMeters(room.length);
    if (prev === null || Math.abs(prev - edit.lengthM) > 1e-9) {
      corrections.push({
        field: "length",
        from: prev ?? "unknown",
        to: edit.lengthM,
        at: now,
      });
      next = { ...next, length: explicitDimension(edit.lengthM, "m", 1) };
    }
  }
  if (edit.widthM !== undefined) {
    const prev = dimensionToMeters(room.width);
    if (prev === null || Math.abs(prev - edit.widthM) > 1e-9) {
      corrections.push({
        field: "width",
        from: prev ?? "unknown",
        to: edit.widthM,
        at: now,
      });
      next = { ...next, width: explicitDimension(edit.widthM, "m", 1) };
    }
  }
  if (edit.heightM !== undefined) {
    const prev = dimensionToMeters(room.height);
    if (prev === null || Math.abs(prev - edit.heightM) > 1e-9) {
      corrections.push({
        field: "height",
        from: prev ?? "unknown",
        to: edit.heightM,
        at: now,
      });
      next = { ...next, height: explicitDimension(edit.heightM, "m", 1) };
    }
  }
  if (edit.floor !== undefined && edit.floor !== room.floor) {
    corrections.push({
      field: "floor",
      from: room.floor,
      to: edit.floor,
      at: now,
    });
    next = { ...next, floor: edit.floor };
  }

  return {
    ...next,
    reviewStatus: "user_edited",
    userEdited: undefined,
    verifiedAt: now,
    corrections,
  } as ExtractedRoom;
}

/**
 * Edit/confirm an opening. If the user supplies dimensions for an
 * opening the AI could not read, the opening becomes explicit and
 * may then be deducted (§13), until then it never is.
 */
export function editOpening(
  opening: ExtractedOpening,
  edit: { widthM?: number; heightM?: number; count?: number },
  now = new Date().toISOString(),
): ExtractedOpening {
  const next: ExtractedOpening = { ...opening };
  if (edit.widthM !== undefined)
    next.width = explicitDimension(edit.widthM, "m", 1);
  if (edit.heightM !== undefined)
    next.height = explicitDimension(edit.heightM, "m", 1);
  if (edit.count !== undefined && edit.count >= 0)
    next.count = Math.round(edit.count);
  return { ...next, reviewStatus: "user_edited", verifiedAt: now };
}

export function confirmOpening(
  opening: ExtractedOpening,
  now = new Date().toISOString(),
): ExtractedOpening {
  return { ...opening, reviewStatus: "user_confirmed", verifiedAt: now };
}

export function rejectOpening(
  opening: ExtractedOpening,
  now = new Date().toISOString(),
): ExtractedOpening {
  return { ...opening, reviewStatus: "user_rejected", verifiedAt: now };
}

// =========================================================
// BUILDING FACT REVIEW (footprint, floors, heights…)
// =========================================================

export function editBuildingFact(
  fact: ExtractedBuildingFact,
  edit: { valueM?: number; enumValue?: string },
  now = new Date().toISOString(),
): ExtractedBuildingFact {
  const corrections = [...fact.corrections];
  if (edit.valueM !== undefined) {
    corrections.push({
      field: "value",
      from: dimensionToMeters(fact.dimension) ?? "unknown",
      to: edit.valueM,
      at: now,
    });
    return {
      ...fact,
      dimension: explicitDimension(edit.valueM, "m", 1),
      reviewStatus: "user_edited",
      verifiedAt: now,
      corrections,
    };
  }
  if (edit.enumValue !== undefined && edit.enumValue !== fact.enumValue) {
    corrections.push({
      field: "enumValue",
      from: fact.enumValue,
      to: edit.enumValue,
      at: now,
    });
    return {
      ...fact,
      enumValue: edit.enumValue,
      reviewStatus: "user_edited",
      verifiedAt: now,
      corrections,
    };
  }
  return fact;
}

// =========================================================
// ROOF REVIEW (§14)
// =========================================================

export interface RoofEdit {
  roofType?: ExtractedRoof["roofType"];
  pitchDegrees?: number;
  overhangM?: number;
}

export function editRoof(
  roof: ExtractedRoof,
  edit: RoofEdit,
  now = new Date().toISOString(),
): ExtractedRoof {
  const corrections = [...roof.corrections];
  let next: ExtractedRoof = { ...roof };

  if (edit.roofType !== undefined && edit.roofType !== roof.roofType) {
    corrections.push({
      field: "roofType",
      from: roof.roofType,
      to: edit.roofType,
      at: now,
    });
    next = { ...next, roofType: edit.roofType };
  }
  if (edit.pitchDegrees !== undefined) {
    corrections.push({
      field: "pitchDegrees",
      from: roof.pitchDegrees?.value ?? "unknown",
      to: edit.pitchDegrees,
      at: now,
    });
    next = {
      ...next,
      pitchDegrees: explicitDimension(edit.pitchDegrees, "m", 1),
    };
  }
  if (edit.overhangM !== undefined) {
    corrections.push({
      field: "overhang",
      from: dimensionToMeters(roof.overhang) ?? "unknown",
      to: edit.overhangM,
      at: now,
    });
    next = { ...next, overhang: explicitDimension(edit.overhangM, "m", 1) };
  }

  return { ...next, reviewStatus: "user_edited", verifiedAt: now, corrections };
}

// =========================================================
// EXTRACTION-LEVEL HELPERS
// =========================================================

/**
 * Apply a review operation to a room inside an extraction
 * (returns a new extraction, inputs are never mutated).
 */
export function updateRoomInExtraction(
  extraction: PlanExtraction,
  roomId: string,
  op: (room: ExtractedRoom) => ExtractedRoom,
): PlanExtraction {
  return {
    ...extraction,
    rooms: extraction.rooms.map((r) => (r.id === roomId ? op(r) : r)),
  };
}

export function updateRoofInExtraction(
  extraction: PlanExtraction,
  op: (roof: ExtractedRoof) => ExtractedRoof,
): PlanExtraction {
  if (!extraction.roof) return extraction;
  return { ...extraction, roof: op(extraction.roof) };
}

export function updateFactInExtraction(
  extraction: PlanExtraction,
  factId: string,
  op: (fact: ExtractedBuildingFact) => ExtractedBuildingFact,
): PlanExtraction {
  return {
    ...extraction,
    buildingFacts: extraction.buildingFacts.map((f) =>
      f.id === factId ? op(f) : f,
    ),
  };
}

/**
 * A room is ready for the Building Model only when it is
 * user_confirmed/user_edited AND has usable length+width.
 */
export function isRoomVerified(room: ExtractedRoom): boolean {
  return (
    (room.reviewStatus === "user_confirmed" ||
      room.reviewStatus === "user_edited") &&
    !isUnknown(room.length) &&
    !isUnknown(room.width)
  );
}

/** All rooms reviewed (each either confirmed/edited or rejected)? */
export function allRoomsReviewed(extraction: PlanExtraction): boolean {
  return extraction.rooms.every(
    (r) =>
      r.reviewStatus === "user_confirmed" ||
      r.reviewStatus === "user_edited" ||
      r.reviewStatus === "user_rejected",
  );
}

/** Verified rooms = the only rooms allowed into calculators. */
export function verifiedRooms(extraction: PlanExtraction): ExtractedRoom[] {
  return extraction.rooms.filter(isRoomVerified);
}

/**
 * Unresolved blocking issues, an extraction with ERROR-severity
 * consistency issues must not feed calculators until the user
 * resolves them (contradictions are never silently accepted, §6).
 */
export function hasBlockingIssues(extraction: PlanExtraction): boolean {
  return extraction.issues.some((i) => i.severity === "error");
}

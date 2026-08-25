/**
 * FRELUX PLAN INTELLIGENCE — Plan → Space Engine Integration
 *
 * Feature 16: Plan → Space Engine Integration
 *
 * Connects AI room detection (from building plan analysis) to the
 * existing FRELUX Space Engine.
 *
 * Pipeline:
 *   BUILDING PLAN
 *     ↓
 *   AI ROOM DETECTION (Gemini Vision or similar)
 *     ↓
 *   SCALE VERIFICATION
 *     ↓
 *   USER REVIEW (per-room: accept, edit, reject)
 *     ↓
 *   USER CONFIRMATION (batch or per-room)
 *     ↓
 *   FRELUX SPACE ENGINE (existing)
 *     ↓
 *   VERIFIED ROOMS/SPACES
 *     ↓
 *   EXISTING CALCULATORS (user-chosen, not automatic)
 *
 * AI-detected data remains UNVERIFIED until the user confirms it.
 * The user selects which calculators to run — no automatic execution.
 * The existing FRELUX measurement-unit architecture is preserved.
 *
 * This module does NOT create a second space engine.
 * It converts AI-detected rooms into the existing Space type.
 */

import type { SpaceType, Space, SurfaceType } from './space-engine';
import { createSpace, type FinishType } from './space-engine';
import type { LengthUnit } from './units';
import { generateId } from './factory';
import type { DataSource } from '@/lib/roof/source-tracking';

// =========================================================
// VERIFICATION STATES
// =========================================================

/**
 * Verification state for a detected room.
 * AI-detected data starts as 'ai_detected' and can only become
 * 'user_verified' after explicit user confirmation.
 */
export type RoomVerificationState =
  | 'ai_detected'           // AI detected, awaiting user review
  | 'ai_detected_review'    // AI detected, user started reviewing
  | 'user_corrected'        // User modified AI-detected values
  | 'user_verified'         // User confirmed the room
  | 'user_rejected';        // User rejected this room

export const VERIFICATION_STATE_LABELS: Record<RoomVerificationState, string> = {
  ai_detected: 'AI Detected',
  ai_detected_review: 'AI Detected — Review Required',
  user_corrected: 'User Corrected',
  user_verified: 'User Verified',
  user_rejected: 'User Rejected',
};

// =========================================================
// DETECTED ROOM TYPE
// =========================================================

/**
 * A room detected by AI from a building plan.
 * This is the RAW AI output — it is NOT verified.
 * The user must review and confirm before it becomes a Space.
 */
export interface DetectedRoom {
  /** Unique ID for this detected room */
  id: string;
  /** Room name as detected by AI (e.g. "Bedroom 1", "Kitchen") */
  name: string;
  /** Detected space type */
  spaceType: SpaceType;
  /** Detected length in the detected unit */
  length: number;
  /** Detected width */
  width?: number;
  /** Detected height (if available) */
  height?: number;
  /** Unit the AI used for detection (user can change) */
  unit: LengthUnit;
  /** Quantity (e.g. 2 identical bedrooms) */
  quantity: number;
  /** AI confidence in this detection (0-1) */
  aiConfidence: number;
  /** AI confidence level */
  aiConfidenceLevel: 'high' | 'moderate' | 'low';
  /** Verification state */
  verificationState: RoomVerificationState;
  /** Whether the user has edited this room's values */
  userEdited: boolean;
  /** What the user changed (field names) */
  userCorrections: string[];
  /** Detected finish type (if AI detected one) */
  detectedFinishType?: FinishType;
  /** Detected surface type (if AI detected one) */
  detectedSurfaceType?: SurfaceType;
  /** AI notes about this room */
  aiNotes?: string;
  /** Source of this detection */
  source: DataSource;
}

/**
 * Result of AI plan analysis containing all detected rooms.
 */
export interface PlanDetectionResult {
  /** Unique ID for this detection session */
  id: string;
  /** Reference to the source plan/image */
  planReference: string;
  /** All detected rooms */
  rooms: DetectedRoom[];
  /** Scale verification status */
  scaleVerified: boolean;
  /** Scale factor (pixels to meters, if calibrated) */
  scaleFactor?: number;
  /** Detected unit from the plan */
  detectedUnit: LengthUnit;
  /** Overall AI confidence */
  overallConfidence: 'high' | 'moderate' | 'low';
  /** AI analysis notes */
  analysisNotes: string[];
  /** Whether all rooms have been user-verified */
  allRoomsVerified: boolean;
  /** Whether all rooms have been user-reviewed (verified or rejected) */
  allRoomsReviewed: boolean;
}

// =========================================================
// VERIFIED SPACE (ready for Space Engine)
// =========================================================

/**
 * A room that has been user-verified and is ready to be converted
 * to a Space for the existing Space Engine.
 */
export interface VerifiedSpace {
  /** Reference to the original detected room */
  detectedRoomId: string;
  /** The Space object ready for the Space Engine */
  space: Space;
  /** Verification state (should be 'user_verified') */
  verificationState: RoomVerificationState;
  /** Source tracking */
  source: DataSource;
  /** Whether the user chose to calculate this space */
  selectedForCalculation: boolean;
  /** Which calculator the user chose (if selected) */
  selectedCalculator?: string;
}

// =========================================================
// FACTORY
// =========================================================

/**
 * Create a detected room from AI analysis output.
 * Starts in 'ai_detected' state — unverified.
 */
export function createDetectedRoom(params: {
  name: string;
  spaceType: SpaceType;
  length: number;
  width?: number;
  height?: number;
  unit: LengthUnit;
  quantity?: number;
  aiConfidence?: number;
  aiConfidenceLevel?: 'high' | 'moderate' | 'low';
  detectedFinishType?: FinishType;
  detectedSurfaceType?: SurfaceType;
  aiNotes?: string;
}): DetectedRoom {
  const confidence = params.aiConfidence ?? 0;
  const level = params.aiConfidenceLevel ?? (
    confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'moderate' : 'low'
  );

  return {
    id: generateId('detected'),
    name: params.name,
    spaceType: params.spaceType,
    length: params.length,
    width: params.width,
    height: params.height,
    unit: params.unit,
    quantity: params.quantity ?? 1,
    aiConfidence: confidence,
    aiConfidenceLevel: level,
    verificationState: 'ai_detected',
    userEdited: false,
    userCorrections: [],
    detectedFinishType: params.detectedFinishType,
    detectedSurfaceType: params.detectedSurfaceType,
    aiNotes: params.aiNotes,
    source: 'ai_estimated',
  };
}

/**
 * Create a plan detection result from AI analysis.
 */
export function createPlanDetectionResult(params: {
  planReference: string;
  rooms: DetectedRoom[];
  detectedUnit: LengthUnit;
  scaleVerified?: boolean;
  scaleFactor?: number;
  overallConfidence?: 'high' | 'moderate' | 'low';
  analysisNotes?: string[];
}): PlanDetectionResult {
  return {
    id: generateId('detection'),
    planReference: params.planReference,
    rooms: params.rooms,
    scaleVerified: params.scaleVerified ?? false,
    scaleFactor: params.scaleFactor,
    detectedUnit: params.detectedUnit,
    overallConfidence: params.overallConfidence ?? 'moderate',
    analysisNotes: params.analysisNotes ?? [],
    allRoomsVerified: false,
    allRoomsReviewed: false,
  };
}

// =========================================================
// USER REVIEW OPERATIONS
// =========================================================

/**
 * Start reviewing a detected room (moves to 'ai_detected_review').
 */
export function startRoomReview(room: DetectedRoom): DetectedRoom {
  if (room.verificationState === 'ai_detected') {
    return { ...room, verificationState: 'ai_detected_review' };
  }
  return room;
}

/**
 * User edits a detected room's values.
 * Marks the room as 'user_corrected' and records what changed.
 */
export function editDetectedRoom(
  room: DetectedRoom,
  edits: Partial<Pick<DetectedRoom, 'name' | 'spaceType' | 'length' | 'width' | 'height' | 'unit' | 'quantity'>>,
): DetectedRoom {
  const corrections: string[] = [];

  if (edits.name !== undefined && edits.name !== room.name) corrections.push('name');
  if (edits.spaceType !== undefined && edits.spaceType !== room.spaceType) corrections.push('spaceType');
  if (edits.length !== undefined && edits.length !== room.length) corrections.push('length');
  if (edits.width !== undefined && edits.width !== room.width) corrections.push('width');
  if (edits.height !== undefined && edits.height !== room.height) corrections.push('height');
  if (edits.unit !== undefined && edits.unit !== room.unit) corrections.push('unit');
  if (edits.quantity !== undefined && edits.quantity !== room.quantity) corrections.push('quantity');

  return {
    ...room,
    ...edits,
    verificationState: 'user_corrected',
    userEdited: true,
    userCorrections: [...room.userCorrections, ...corrections],
  };
}

/**
 * User confirms a detected room (moves to 'user_verified').
 */
export function confirmDetectedRoom(room: DetectedRoom): DetectedRoom {
  return {
    ...room,
    verificationState: 'user_verified',
  };
}

/**
 * User rejects a detected room.
 */
export function rejectDetectedRoom(room: DetectedRoom): DetectedRoom {
  return {
    ...room,
    verificationState: 'user_rejected',
  };
}

/**
 * Batch-confirm all rooms in a detection result.
 */
export function confirmAllRooms(detection: PlanDetectionResult): PlanDetectionResult {
  const rooms = detection.rooms.map((r) => {
    if (r.verificationState === 'user_rejected') return r;
    return { ...r, verificationState: 'user_verified' as RoomVerificationState };
  });

  return updateDetectionStatus({ ...detection, rooms });
}

/**
 * Update the verification flags on a detection result.
 */
export function updateDetectionStatus(detection: PlanDetectionResult): PlanDetectionResult {
  const activeRooms = detection.rooms.filter((r) => r.verificationState !== 'user_rejected');
  const allVerified = activeRooms.length > 0 && activeRooms.every((r) => r.verificationState === 'user_verified');
  const allReviewed = detection.rooms.every((r) =>
    r.verificationState === 'user_verified' || r.verificationState === 'user_rejected'
  );

  return {
    ...detection,
    allRoomsVerified: allVerified,
    allRoomsReviewed: allReviewed,
  };
}

// =========================================================
// DETECTED ROOM → SPACE CONVERSION
// =========================================================

/**
 * Convert a user-verified detected room to a Space object.
 *
 * Only rooms with verificationState 'user_verified' can be converted.
 * AI-detected but unverified rooms are rejected.
 *
 * The resulting Space uses the existing Space Engine types and
 * preserves the user's chosen measurement unit.
 */
export function detectedRoomToSpace(room: DetectedRoom): VerifiedSpace {
  if (room.verificationState !== 'user_verified') {
    throw new Error(
      `Cannot convert room "${room.name}" to Space: verification state is "${room.verificationState}" (must be "user_verified")`
    );
  }

  const space = createSpace({
    name: room.name,
    type: room.spaceType,
    length: room.length,
    width: room.width,
    height: room.height,
    unit: room.unit,
    quantity: room.quantity,
    finishType: room.detectedFinishType ?? 'none',
    surfaceType: room.detectedSurfaceType ?? 'wall',
  });

  return {
    detectedRoomId: room.id,
    space,
    verificationState: room.verificationState,
    source: room.source,
    selectedForCalculation: false,
  };
}

/**
 * Convert all user-verified rooms in a detection result to VerifiedSpaces.
 * Rejected and unverified rooms are skipped.
 */
export function detectionToVerifiedSpaces(
  detection: PlanDetectionResult,
): VerifiedSpace[] {
  const results: VerifiedSpace[] = [];

  for (const room of detection.rooms) {
    if (room.verificationState === 'user_verified') {
      results.push(detectedRoomToSpace(room));
    }
  }

  return results;
}

/**
 * Convert all verified spaces to Space objects (for the Space Engine).
 */
export function verifiedSpacesToSpaces(verified: VerifiedSpace[]): Space[] {
  return verified
    .filter((v) => v.selectedForCalculation)
    .map((v) => v.space);
}

/**
 * Mark a verified space as selected for a specific calculator.
 */
export function selectForCalculation(
  verified: VerifiedSpace,
  calculator: string,
): VerifiedSpace {
  return {
    ...verified,
    selectedForCalculation: true,
    selectedCalculator: calculator,
  };
}

// =========================================================
// DETECTION SUMMARY
// =========================================================

/**
 * Get a summary of the detection result for display.
 */
export function detectionSummary(detection: PlanDetectionResult): {
  totalRooms: number;
  verified: number;
  rejected: number;
  pending: number;
  corrected: number;
  readyForConversion: boolean;
} {
  let verified = 0;
  let rejected = 0;
  let pending = 0;
  let corrected = 0;

  for (const room of detection.rooms) {
    switch (room.verificationState) {
      case 'user_verified':
        verified++;
        break;
      case 'user_rejected':
        rejected++;
        break;
      case 'user_corrected':
        corrected++;
        pending++;
        break;
      default:
        pending++;
        break;
    }
  }

  return {
    totalRooms: detection.rooms.length,
    verified,
    rejected,
    pending,
    corrected,
    readyForConversion: detection.allRoomsVerified,
  };
}

/**
 * Get rooms grouped by verification state.
 */
export function roomsByVerificationState(
  detection: PlanDetectionResult,
): Record<RoomVerificationState, DetectedRoom[]> {
  const groups: Record<RoomVerificationState, DetectedRoom[]> = {
    ai_detected: [],
    ai_detected_review: [],
    user_corrected: [],
    user_verified: [],
    user_rejected: [],
  };

  for (const room of detection.rooms) {
    groups[room.verificationState].push(room);
  }

  return groups;
}

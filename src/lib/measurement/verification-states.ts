/**
 * FRELUX UNIFIED VERIFICATION STATES
 *
 * Feature 19: Confidence / Verification States
 *
 * Provides a single, system-wide verification state vocabulary that
 * applies to ALL data flowing through FRELUX — measurements, calculations,
 * material quantities, and market prices.
 *
 * CRITICAL DISTINCTIONS:
 *   AI DETECTION CONFIDENCE — how confident the AI is in what it detected
 *   CALCULATION CONFIDENCE  — how confident we are in the calculation result
 *   MARKET PRICE CONFIDENCE — how confident we are in the market price
 *
 * These are INDEPENDENT:
 *   - High AI detection confidence ≠ accurate calculation
 *   - A calculated quantity ≠ a verified market price
 *   - A verified market price ≠ a verified calculation
 *
 * Reuses the existing ConfidenceLevel from confidence-engine.ts.
 * Does NOT replace RoomVerificationState from plan-intelligence.ts.
 * Does NOT modify the existing confidence engine.
 *
 * Additive — no existing code is changed.
 */

import type { ConfidenceLevel } from './confidence-engine';

// =========================================================
// UNIFIED VERIFICATION STATE
// =========================================================

/**
 * Verification state for any piece of data in the FRELUX system.
 * These states track the ORIGIN and VERIFICATION status of data,
 * not its numerical confidence.
 */
export type VerificationState =
  | 'manual_input'              // User entered this data manually
  | 'ai_detected'                // AI detected this data, not yet reviewed
  | 'ai_detected_review_required' // AI detected, user must review before use
  | 'user_verified'              // User has explicitly verified this data
  | 'imported'                   // Data imported from an external source
  | 'calculated'                 // Data produced by a FRELUX calculation engine
  | 'market_price_verified';     // Market price has been validated/approved

export const VERIFICATION_STATE_LABELS: Record<VerificationState, string> = {
  manual_input: 'Manual Input',
  ai_detected: 'AI Detected',
  ai_detected_review_required: 'AI Detected — Review Required',
  user_verified: 'User Verified',
  imported: 'Imported',
  calculated: 'Calculated',
  market_price_verified: 'Market Price Verified',
};

export const VERIFICATION_STATE_DESCRIPTIONS: Record<VerificationState, string> = {
  manual_input: 'Entered manually by the user. No AI or external source involved.',
  ai_detected: 'Detected by AI. Not yet reviewed or verified by the user.',
  ai_detected_review_required: 'AI detected this data, but it requires user review before it can be used in calculations.',
  user_verified: 'The user has reviewed and explicitly confirmed this data.',
  imported: 'Imported from an external system or file.',
  calculated: 'Produced by a FRELUX calculation engine from verified inputs.',
  market_price_verified: 'The market price has been validated and approved through Market Intelligence.',
};

/**
 * Visual representation for the UI.
 * Colors are semantic, not decorative.
 */
export const VERIFICATION_STATE_COLORS: Record<VerificationState, string> = {
  manual_input: 'blue',
  ai_detected: 'purple',
  ai_detected_review_required: 'amber',
  user_verified: 'green',
  imported: 'cyan',
  calculated: 'indigo',
  market_price_verified: 'teal',
};

/**
 * Whether a state is considered "verified" (safe to use in final outputs).
 */
export const VERIFICATION_STATE_VERIFIED: Record<VerificationState, boolean> = {
  manual_input: true,           // User entered it themselves
  ai_detected: false,            // Not yet reviewed
  ai_detected_review_required: false, // Must be reviewed first
  user_verified: true,           // User confirmed it
  imported: true,                // From a trusted external source
  calculated: true,              // Engine produced it from verified inputs
  market_price_verified: true,   // Market Intelligence validated it
};

/**
 * Whether a state requires user action before use.
 */
export const VERIFICATION_STATE_REQUIRES_ACTION: Record<VerificationState, boolean> = {
  manual_input: false,
  ai_detected: false,                // Can be used but with caveat
  ai_detected_review_required: true,  // Must review first
  user_verified: false,
  imported: false,
  calculated: false,
  market_price_verified: false,
};

// =========================================================
// CONFIDENCE DIMENSIONS
// =========================================================

/**
 * AI detection confidence.
 * This is the AI's confidence in what it detected — NOT the calculation
 * accuracy and NOT the market price validity.
 *
 * IMPORTANT: Do NOT express this as a scientifically precise percentage.
 * Use qualitative levels only.
 */
export type AiDetectionConfidence = 'high' | 'moderate' | 'low' | 'not_applicable';

export const AI_CONFIDENCE_LABELS: Record<AiDetectionConfidence, string> = {
  high: 'High AI Confidence',
  moderate: 'Moderate AI Confidence',
  low: 'Low AI Confidence',
  not_applicable: 'N/A (Not AI-detected)',
};

// =========================================================
// UNIFIED CONFIDENCE ASSESSMENT
// =========================================================

/**
 * A confidence assessment that covers all three dimensions independently.
 * This does NOT replace ConfidenceAssessment from confidence-engine.ts.
 * It wraps the existing assessment with additional context.
 */
export interface UnifiedConfidenceAssessment {
  /** Verification state of the data */
  verificationState: VerificationState;
  /** AI detection confidence (independent of calculation/price) */
  aiDetectionConfidence: AiDetectionConfidence;
  /** Calculation confidence (from existing confidence engine) */
  calculationConfidence: ConfidenceLevel;
  /** Market price confidence (from existing confidence engine) */
  marketPriceConfidence: ConfidenceLevel | 'unavailable';
  /** Overall confidence — the lowest of the applicable dimensions */
  overallConfidence: ConfidenceLevel;
  /** Human-readable summary for UI display */
  summary: string;
  /** Whether this data is verified and safe to use in final outputs */
  isVerified: boolean;
  /** Whether user action is required before this data can be used */
  requiresAction: boolean;
  /** Detailed explanation of each dimension */
  dimensionBreakdown: {
    aiDetection: string;
    calculation: string;
    marketPrice: string;
  };
}

// =========================================================
// STATE TRANSITIONS
// =========================================================

/**
 * Valid state transitions.
 * AI-detected data can only become verified through user action.
 */
const VALID_TRANSITIONS: Record<VerificationState, VerificationState[]> = {
  manual_input: ['user_verified', 'calculated'],
  ai_detected: ['ai_detected_review_required', 'user_verified'],
  ai_detected_review_required: ['user_verified', 'manual_input'],
  user_verified: ['calculated'],
  imported: ['user_verified', 'calculated'],
  calculated: ['market_price_verified'],
  market_price_verified: [],
};

export function canTransition(from: VerificationState, to: VerificationState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionVerificationState(
  from: VerificationState,
  to: VerificationState,
): VerificationState {
  if (canTransition(from, to)) {
    return to;
  }
  // Invalid transition — return the original state
  return from;
}

// =========================================================
// UNIFIED CONFIDENCE ASSESSOR
// =========================================================

/**
 * Build a unified confidence assessment from the three independent dimensions.
 *
 * @param verificationState - The current verification state of the data
 * @param aiConfidence - AI detection confidence (if AI-detected)
 * @param calcConfidence - Calculation confidence (from existing engine)
 * @param priceConfidence - Market price confidence (from existing engine)
 */
export function assessUnifiedConfidence(
  verificationState: VerificationState,
  aiConfidence: AiDetectionConfidence = 'not_applicable',
  calcConfidence: ConfidenceLevel = 'high',
  priceConfidence: ConfidenceLevel | 'unavailable' = 'unavailable',
): UnifiedConfidenceAssessment {
  const levelOrder: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
    review_required: 3,
  };

  // Overall confidence is the LOWEST of all applicable dimensions
  const applicableLevels: ConfidenceLevel[] = [];

  // AI detection confidence maps to calculation confidence levels
  if (aiConfidence !== 'not_applicable') {
    const aiLevel: ConfidenceLevel =
      aiConfidence === 'high' ? 'high' :
      aiConfidence === 'moderate' ? 'medium' :
      'low';
    applicableLevels.push(aiLevel);
  }

  // Calculation confidence always applies
  applicableLevels.push(calcConfidence);

  // Market price confidence only applies if available
  if (priceConfidence !== 'unavailable') {
    applicableLevels.push(priceConfidence);
  }

  // Review-required state overrides everything
  if (verificationState === 'ai_detected_review_required') {
    applicableLevels.push('review_required');
  }

  const overallConfidence = applicableLevels.reduce(
    (lowest, level) => (levelOrder[level] > levelOrder[lowest] ? level : lowest),
    'high' as ConfidenceLevel,
  );

  const isVerified = VERIFICATION_STATE_VERIFIED[verificationState];
  const requiresAction = VERIFICATION_STATE_REQUIRES_ACTION[verificationState];

  // Build dimension breakdown
  const aiBreakdown = aiConfidence === 'not_applicable'
    ? 'Not AI-detected — no AI confidence applies.'
    : `${AI_CONFIDENCE_LABELS[aiConfidence]}. Note: AI detection confidence does NOT guarantee calculation accuracy.`;

  const calcBreakdown = `Calculation confidence: ${calcConfidence.toUpperCase()}. This reflects the quality of the calculation, independent of AI detection or market pricing.`;

  const priceBreakdown = priceConfidence === 'unavailable'
    ? 'No market price available — this calculation cannot be priced automatically.'
    : `Market price confidence: ${priceConfidence.toUpperCase()}. This reflects the quality of the market price, independent of the calculation.`;

  const summary = `${VERIFICATION_STATE_LABELS[verificationState]} — Overall: ${overallConfidence.toUpperCase()}`;

  return {
    verificationState,
    aiDetectionConfidence: aiConfidence,
    calculationConfidence: calcConfidence,
    marketPriceConfidence: priceConfidence,
    overallConfidence,
    summary,
    isVerified,
    requiresAction,
    dimensionBreakdown: {
      aiDetection: aiBreakdown,
      calculation: calcBreakdown,
      marketPrice: priceBreakdown,
    },
  };
}

// =========================================================
// VERIFICATION BADGE (for UI)
// =========================================================

/**
 * A badge object that the UI can render to show verification status.
 */
export interface VerificationBadge {
  state: VerificationState;
  label: string;
  description: string;
  color: string;
  isVerified: boolean;
  requiresAction: boolean;
  icon: string;
}

export const VERIFICATION_STATE_ICONS: Record<VerificationState, string> = {
  manual_input: 'Pencil',
  ai_detected: 'Sparkles',
  ai_detected_review_required: 'AlertCircle',
  user_verified: 'CheckCircle',
  imported: 'Download',
  calculated: 'Calculator',
  market_price_verified: 'BadgeCheck',
};

export function buildVerificationBadge(state: VerificationState): VerificationBadge {
  return {
    state,
    label: VERIFICATION_STATE_LABELS[state],
    description: VERIFICATION_STATE_DESCRIPTIONS[state],
    color: VERIFICATION_STATE_COLORS[state],
    isVerified: VERIFICATION_STATE_VERIFIED[state],
    requiresAction: VERIFICATION_STATE_REQUIRES_ACTION[state],
    icon: VERIFICATION_STATE_ICONS[state],
  };
}

// =========================================================
// VERIFICATION TRACKER
// =========================================================

/**
 * Tracks the verification state of a piece of data through its lifecycle.
 */
export interface VerificationRecord {
  /** Unique ID for this record */
  id: string;
  /** What this verification tracks (e.g., "Bedroom 1 dimensions", "Cement price") */
  label: string;
  /** Current verification state */
  state: VerificationState;
  /** History of state transitions */
  history: { from: VerificationState; to: VerificationState; timestamp: string }[];
  /** AI detection confidence (if applicable) */
  aiConfidence?: AiDetectionConfidence;
  /** Calculation confidence (if applicable) */
  calculationConfidence?: ConfidenceLevel;
  /** Market price confidence (if applicable) */
  marketPriceConfidence?: ConfidenceLevel;
  /** Whether user has reviewed this */
  userReviewed: boolean;
  /** Notes from user review */
  reviewNotes?: string;
}

let verificationIdCounter = 0;

export function createVerificationRecord(
  label: string,
  initialState: VerificationState,
  options?: {
    aiConfidence?: AiDetectionConfidence;
    calculationConfidence?: ConfidenceLevel;
    marketPriceConfidence?: ConfidenceLevel;
  },
): VerificationRecord {
  return {
    id: `verify_${++verificationIdCounter}`,
    label,
    state: initialState,
    history: [],
    aiConfidence: options?.aiConfidence,
    calculationConfidence: options?.calculationConfidence,
    marketPriceConfidence: options?.marketPriceConfidence,
    userReviewed: false,
  };
}

export function updateVerificationRecord(
  record: VerificationRecord,
  newState: VerificationState,
  options?: {
    reviewNotes?: string;
    aiConfidence?: AiDetectionConfidence;
    calculationConfidence?: ConfidenceLevel;
    marketPriceConfidence?: ConfidenceLevel;
  },
): VerificationRecord {
  const prevState = record.state;
  const actualNewState = transitionVerificationState(prevState, newState);

  if (actualNewState === prevState) {
    return record; // No transition happened
  }

  const history = [...record.history, {
    from: prevState,
    to: actualNewState,
    timestamp: new Date().toISOString(),
  }];

  return {
    ...record,
    state: actualNewState,
    history,
    userReviewed: actualNewState === 'user_verified' || actualNewState === 'market_price_verified' ? true : record.userReviewed,
    reviewNotes: options?.reviewNotes ?? record.reviewNotes,
    aiConfidence: options?.aiConfidence ?? record.aiConfidence,
    calculationConfidence: options?.calculationConfidence ?? record.calculationConfidence,
    marketPriceConfidence: options?.marketPriceConfidence ?? record.marketPriceConfidence,
  };
}

// =========================================================
// MULTI-ITEM VERIFICATION SUMMARY
// =========================================================

export interface VerificationSummary {
  totalItems: number;
  byState: Record<VerificationState, number>;
  verifiedCount: number;
  requiresActionCount: number;
  aiDetectedCount: number;
  userVerifiedCount: number;
  calculatedCount: number;
  marketPriceVerifiedCount: number;
  allVerified: boolean;
  summary: string;
}

export function buildVerificationSummary(records: VerificationRecord[]): VerificationSummary {
  const byState = {} as Record<VerificationState, number>;
  for (const state of Object.keys(VERIFICATION_STATE_LABELS) as VerificationState[]) {
    byState[state] = 0;
  }

  for (const record of records) {
    byState[record.state]++;
  }

  const verifiedCount = records.filter((r) => VERIFICATION_STATE_VERIFIED[r.state]).length;
  const requiresActionCount = records.filter((r) => VERIFICATION_STATE_REQUIRES_ACTION[r.state]).length;

  const allVerified = records.every((r) => VERIFICATION_STATE_VERIFIED[r.state]);

  const summary = `${records.length} items: ${verifiedCount} verified, ${requiresActionCount} require action${allVerified ? ' — all verified' : ''}`;

  return {
    totalItems: records.length,
    byState,
    verifiedCount,
    requiresActionCount,
    aiDetectedCount: byState.ai_detected + byState.ai_detected_review_required,
    userVerifiedCount: byState.user_verified,
    calculatedCount: byState.calculated,
    marketPriceVerifiedCount: byState.market_price_verified,
    allVerified,
    summary,
  };
}

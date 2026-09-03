// =========================================================
// FRELUX Feature Access — Unified Registry
// Phase 9
//
// Single import point for all feature access checks.
// Consolidates:
//   - subscription.ts        → plan-tier gating (which features exist at which plan)
//   - ai-access.ts           → AI usage rate-limiting (daily limits, rewarded ads)
//   - estimation-access.ts   → estimation usage rate-limiting
//   - brand-studio.ts        → brand studio feature flags
//
// Usage:
//   import { hasFeatureAccess, PAID_FEATURES, type PaidFeature } from '@/lib/feature-access';
// =========================================================

// ── Plan-tier gating (subscription) ──
export {
  PAID_FEATURES,
  FEATURE_LABELS,
  type PaidFeature,
  type SubscriptionPlan,
  type SubscriptionState,
  planHasFeature,
  getFeatureMinPlan,
  hasFeatureAccess,
  isSubscriptionActive,
  useSubscription,
  formatSubscriptionStatus,
} from './subscription';

// ── AI usage rate-limiting ──
export {
  type AiAccessConfig,
  type AiUsageStatus,
  type AiAccessDecision,
  fetchAiAccessConfig,
  getAiUsageStatus,
  checkAiAccess,
  requestRewardedAccess,
} from './ai-access';

// ── Estimation usage rate-limiting ──
export {
  fetchEstimationAccessConfig,
  getEstimationUsageStatus,
  checkUserPaidStatus,
  checkEstimationAccess,
  saveEstimationResult,
  fetchSavedEstimates,
} from './estimation-access';
export type {
  EstimationAccessConfig,
  EstimationUsageStatus,
  EstimationAccessDecision,
} from '@/types/premium-estimation';

// ── Brand studio feature flags ──
export {
  type BrandStudioAccess,
  type ResolvedBranding,
  useBrandStudioAccess,
  resolveBrandStudioAccess,
  resolveBranding,
} from './brand-studio';

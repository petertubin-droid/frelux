import { describe, it, expect } from 'vitest';
import {
  VERIFICATION_STATE_LABELS,
  VERIFICATION_STATE_VERIFIED,
  VERIFICATION_STATE_REQUIRES_ACTION,
  canTransition,
  transitionVerificationState,
  assessUnifiedConfidence,
  buildVerificationBadge,
  createVerificationRecord,
  updateVerificationRecord,
  buildVerificationSummary,
  type VerificationState,
  type AiDetectionConfidence,
} from '../verification-states';

describe('Feature 19: Confidence / Verification States', () => {
  describe('Verification States', () => {
    it('has all required states', () => {
      const requiredStates: VerificationState[] = [
        'manual_input',
        'ai_detected',
        'ai_detected_review_required',
        'user_verified',
        'imported',
        'calculated',
        'market_price_verified',
      ];
      for (const state of requiredStates) {
        expect(VERIFICATION_STATE_LABELS[state]).toBeTruthy();
      }
    });

    it('marks verified states correctly', () => {
      expect(VERIFICATION_STATE_VERIFIED.manual_input).toBe(true);
      expect(VERIFICATION_STATE_VERIFIED.ai_detected).toBe(false);
      expect(VERIFICATION_STATE_VERIFIED.ai_detected_review_required).toBe(false);
      expect(VERIFICATION_STATE_VERIFIED.user_verified).toBe(true);
      expect(VERIFICATION_STATE_VERIFIED.calculated).toBe(true);
      expect(VERIFICATION_STATE_VERIFIED.market_price_verified).toBe(true);
    });

    it('flags states requiring action', () => {
      expect(VERIFICATION_STATE_REQUIRES_ACTION.ai_detected_review_required).toBe(true);
      expect(VERIFICATION_STATE_REQUIRES_ACTION.manual_input).toBe(false);
      expect(VERIFICATION_STATE_REQUIRES_ACTION.user_verified).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('allows ai_detected → user_verified', () => {
      expect(canTransition('ai_detected', 'user_verified')).toBe(true);
    });

    it('allows ai_detected → ai_detected_review_required', () => {
      expect(canTransition('ai_detected', 'ai_detected_review_required')).toBe(true);
    });

    it('allows ai_detected_review_required → user_verified', () => {
      expect(canTransition('ai_detected_review_required', 'user_verified')).toBe(true);
    });

    it('allows calculated → market_price_verified', () => {
      expect(canTransition('calculated', 'market_price_verified')).toBe(true);
    });

    it('blocks invalid transitions', () => {
      expect(canTransition('market_price_verified', 'ai_detected')).toBe(false);
      expect(canTransition('user_verified', 'ai_detected')).toBe(false);
    });

    it('returns original state on invalid transition', () => {
      const result = transitionVerificationState('market_price_verified', 'ai_detected');
      expect(result).toBe('market_price_verified');
    });

    it('returns new state on valid transition', () => {
      const result = transitionVerificationState('ai_detected', 'user_verified');
      expect(result).toBe('user_verified');
    });
  });

  describe('Unified Confidence Assessment', () => {
    it('assesses AI-detected data with high AI confidence', () => {
      const assessment = assessUnifiedConfidence(
        'ai_detected',
        'high',
        'high',
        'unavailable',
      );
      expect(assessment.verificationState).toBe('ai_detected');
      expect(assessment.aiDetectionConfidence).toBe('high');
      expect(assessment.isVerified).toBe(false);
      expect(assessment.requiresAction).toBe(false);
    });

    it('assesses review-required state as requiring action', () => {
      const assessment = assessUnifiedConfidence(
        'ai_detected_review_required',
        'moderate',
        'high',
        'unavailable',
      );
      expect(assessment.requiresAction).toBe(true);
      expect(assessment.overallConfidence).toBe('review_required');
    });

    it('keeps dimensions independent — high AI + low calculation', () => {
      const assessment = assessUnifiedConfidence(
        'ai_detected',
        'high',
        'low',
        'unavailable',
      );
      expect(assessment.aiDetectionConfidence).toBe('high');
      expect(assessment.calculationConfidence).toBe('low');
      // Overall should be low (the lowest applicable)
      expect(assessment.overallConfidence).toBe('low');
    });

    it('keeps dimensions independent — calculated + unavailable price', () => {
      const assessment = assessUnifiedConfidence(
        'calculated',
        'not_applicable',
        'high',
        'unavailable',
      );
      expect(assessment.marketPriceConfidence).toBe('unavailable');
      expect(assessment.calculationConfidence).toBe('high');
      expect(assessment.overallConfidence).toBe('high');
    });

    it('keeps dimensions independent — calculated + verified price', () => {
      const assessment = assessUnifiedConfidence(
        'market_price_verified',
        'not_applicable',
        'high',
        'high',
      );
      expect(assessment.isVerified).toBe(true);
      expect(assessment.overallConfidence).toBe('high');
    });

    it('provides dimension breakdown for UI', () => {
      const assessment = assessUnifiedConfidence(
        'ai_detected',
        'high',
        'medium',
        'unavailable',
      );
      expect(assessment.dimensionBreakdown.aiDetection).toContain('High AI Confidence');
      expect(assessment.dimensionBreakdown.aiDetection).toContain('does NOT guarantee');
      expect(assessment.dimensionBreakdown.calculation).toContain('MEDIUM');
      expect(assessment.dimensionBreakdown.marketPrice).toContain('No market price');
    });

    it('does not use scientifically precise percentages', () => {
      const assessment = assessUnifiedConfidence('ai_detected', 'high', 'high', 'high');
      // Summary should use qualitative labels, not percentages
      expect(assessment.summary).not.toMatch(/\d+%/);
    });
  });

  describe('Verification Badge', () => {
    it('builds badge for each state', () => {
      const states: VerificationState[] = [
        'manual_input', 'ai_detected', 'ai_detected_review_required',
        'user_verified', 'imported', 'calculated', 'market_price_verified',
      ];
      for (const state of states) {
        const badge = buildVerificationBadge(state);
        expect(badge.label).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.color).toBeTruthy();
        expect(badge.icon).toBeTruthy();
      }
    });
  });

  describe('Verification Record Lifecycle', () => {
    it('creates a verification record', () => {
      const record = createVerificationRecord('Bedroom 1 dimensions', 'ai_detected', {
        aiConfidence: 'high',
      });
      expect(record.label).toBe('Bedroom 1 dimensions');
      expect(record.state).toBe('ai_detected');
      expect(record.aiConfidence).toBe('high');
      expect(record.userReviewed).toBe(false);
    });

    it('transitions through lifecycle: ai_detected → review → verified', () => {
      let record = createVerificationRecord('Cement price', 'ai_detected');
      expect(record.state).toBe('ai_detected');

      record = updateVerificationRecord(record, 'ai_detected_review_required');
      expect(record.state).toBe('ai_detected_review_required');
      expect(record.history).toHaveLength(1);

      record = updateVerificationRecord(record, 'user_verified', { reviewNotes: 'Checked against local market' });
      expect(record.state).toBe('user_verified');
      expect(record.userReviewed).toBe(true);
      expect(record.reviewNotes).toBe('Checked against local market');
      expect(record.history).toHaveLength(2);
    });

    it('does not transition on invalid path', () => {
      let record = createVerificationRecord('Test', 'market_price_verified');
      record = updateVerificationRecord(record, 'ai_detected');
      expect(record.state).toBe('market_price_verified');
      expect(record.history).toHaveLength(0);
    });
  });

  describe('Verification Summary', () => {
    it('summarizes multiple records', () => {
      const records = [
        createVerificationRecord('Room 1', 'ai_detected'),
        createVerificationRecord('Room 2', 'user_verified'),
        createVerificationRecord('Cement price', 'calculated'),
        createVerificationRecord('Sand price', 'market_price_verified'),
      ];

      const summary = buildVerificationSummary(records);
      expect(summary.totalItems).toBe(4);
      expect(summary.byState.ai_detected).toBe(1);
      expect(summary.byState.user_verified).toBe(1);
      expect(summary.byState.calculated).toBe(1);
      expect(summary.byState.market_price_verified).toBe(1);
      expect(summary.allVerified).toBe(false); // ai_detected is not verified
    });

    it('reports all verified when everything is verified', () => {
      const records = [
        createVerificationRecord('Room 1', 'user_verified'),
        createVerificationRecord('Cement price', 'market_price_verified'),
      ];

      const summary = buildVerificationSummary(records);
      expect(summary.allVerified).toBe(true);
    });
  });
});

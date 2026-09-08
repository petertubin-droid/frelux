import { describe, it, expect } from 'vitest';
import {
  classifyFact,
  createFact,
  applyTrustEvent,
  canUseInCalculation,
  requiresUserAttention,
  toMeasurementVerificationState,
  fromExtractionStatus,
  trustBadge,
} from '../trust';
import type { AiFact } from '../types';

function fact(overrides: Partial<AiFact> = {}): Omit<AiFact, 'trust'> {
  return {
    key: 'building_length',
    label: 'Building length',
    value: 15,
    unit: 'm',
    origin: 'ai_interpretation',
    source: 'test',
    confidence: 0.8,
    ...overrides,
  };
}

describe('trust state machine', () => {
  it('classifies AI interpretations as needing confirmation, never silently trusted', () => {
    const f = createFact(fact());
    expect(f.trust).toBe('needs_confirmation');
    expect(canUseInCalculation(f)).toBe(false);
    expect(requiresUserAttention(f)).toBe(true);
  });

  it('trusts user input by origin', () => {
    const f = createFact(fact({ origin: 'user_input' }));
    expect(f.trust).toBe('system_verified');
    expect(canUseInCalculation(f)).toBe(true);
  });

  it('trusts engine calculations by origin', () => {
    const f = createFact(fact({ origin: 'engine_calculation' }));
    expect(canUseInCalculation(f)).toBe(true);
  });

  it('treats smart defaults as usable but visible assumptions', () => {
    const f = createFact(fact({ origin: 'smart_default', confidence: 0.6 }));
    expect(f.trust).toBe('detected');
    expect(canUseInCalculation(f)).toBe(true);
  });

  it('marks very low confidence as insufficient evidence', () => {
    const f = createFact(fact({ confidence: 0.1 }));
    expect(f.trust).toBe('insufficient_evidence');
    expect(canUseInCalculation(f)).toBe(false);
  });

  it('upgrades to user_confirmed ONLY on explicit user action', () => {
    let f = createFact(fact());
    f = applyTrustEvent(f, { type: 'user_confirmed' });
    expect(f.trust).toBe('user_confirmed');
    expect(f.confidence).toBe(1);
    expect(canUseInCalculation(f)).toBe(true);
  });

  it('keeps user corrections as corrected values', () => {
    let f = createFact(fact());
    f = applyTrustEvent(f, { type: 'user_edited', value: 16 });
    expect(f.trust).toBe('corrected');
    expect(f.value).toBe(16);
    expect(canUseInCalculation(f)).toBe(true);
  });

  it('rejects values stay unusable', () => {
    let f = createFact(fact({ origin: 'user_input' }));
    f = applyTrustEvent(f, { type: 'user_rejected' });
    expect(canUseInCalculation(f)).toBe(false);
  });

  it('system verification requires a named validator', () => {
    let f = createFact(fact());
    f = applyTrustEvent(f, { type: 'system_verified', validator: 'geometry-engine' });
    expect(f.trust).toBe('system_verified');
    expect(f.evidence).toContain('geometry-engine');
  });
});

describe('vocabulary interop', () => {
  it('maps to the pre-existing measurement verification states', () => {
    expect(toMeasurementVerificationState(createFact(fact({ origin: 'user_input' })))).toBe('manual_input');
    expect(toMeasurementVerificationState(createFact(fact({ origin: 'engine_calculation' })))).toBe('calculated');
    expect(toMeasurementVerificationState(createFact(fact({ origin: 'market_data' })))).toBe('market_price_verified');
    expect(toMeasurementVerificationState({ ...fact(), trust: 'user_confirmed' } as AiFact)).toBe('user_verified');
    expect(toMeasurementVerificationState(createFact(fact()))).toBe('ai_detected_review_required');
  });

  it('maps from the pre-existing extraction statuses', () => {
    expect(fromExtractionStatus('user_confirmed')).toBe('user_confirmed');
    expect(fromExtractionStatus('user_edited')).toBe('corrected');
    expect(fromExtractionStatus('rejected')).toBe('rejected');
    expect(fromExtractionStatus('requires_confirmation')).toBe('needs_confirmation');
    expect(fromExtractionStatus('ai_detected')).toBe('detected');
  });

  it('never shows a fake verified badge', () => {
    expect(trustBadge(createFact(fact()))).toContain('confirmation');
    expect(trustBadge(createFact(fact({ origin: 'engine_calculation' })))).toContain('Calculated by FRELUX');
  });
});

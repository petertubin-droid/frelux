/**
 * FRELUX ROOF PITCH — Tests
 *
 * Feature 5: Roof Pitch Per Section
 *
 * Tests:
 *   - Pitch ratio ↔ degrees conversion
 *   - Common pitch ratios table
 *   - Flat roof pitch handling (not required)
 *   - Unknown pitch state (PITCH REQUIRED / PITCH ESTIMATION)
 *   - No silent estimation of pitch
 */

import { describe, it, expect } from 'vitest';
import {
  PITCH_RATIOS,
  pitchRatioToDegrees,
  degreesToPitchRatio,
} from '@/components/roof-view/PitchInput';

// =========================================================
// Pitch Ratio → Degrees Conversion
// =========================================================

describe('Roof Pitch: Ratio → Degrees', () => {
  it('converts 4:12 to ~18.43°', () => {
    expect(pitchRatioToDegrees('4:12')).toBeCloseTo(18.43, 1);
  });

  it('converts 6:12 to ~26.57°', () => {
    expect(pitchRatioToDegrees('6:12')).toBeCloseTo(26.57, 1);
  });

  it('converts 12:12 to 45°', () => {
    expect(pitchRatioToDegrees('12:12')).toBeCloseTo(45, 1);
  });

  it('converts 1:12 to ~4.76°', () => {
    expect(pitchRatioToDegrees('1:12')).toBeCloseTo(4.76, 1);
  });

  it('handles whitespace in ratio', () => {
    expect(pitchRatioToDegrees('4 : 12')).toBeCloseTo(18.43, 1);
  });

  it('handles decimal ratios', () => {
    expect(pitchRatioToDegrees('5.5:12')).toBeCloseTo(24.62, 1);
  });

  it('returns null for invalid input', () => {
    expect(pitchRatioToDegrees('invalid')).toBeNull();
    expect(pitchRatioToDegrees('')).toBeNull();
    expect(pitchRatioToDegrees('abc:def')).toBeNull();
  });

  it('returns null for zero run', () => {
    expect(pitchRatioToDegrees('4:0')).toBeNull();
  });
});

// =========================================================
// Degrees → Pitch Ratio
// =========================================================

describe('Roof Pitch: Degrees → Ratio', () => {
  it('converts 45° to 12:12', () => {
    expect(degreesToPitchRatio(45)).toBe('12:12');
  });

  it('converts ~18.43° to 4:12', () => {
    expect(degreesToPitchRatio(18.43)).toBe('4:12');
  });

  it('converts ~26.57° to 6:12', () => {
    expect(degreesToPitchRatio(26.57)).toBe('6:12');
  });

  it('returns null for negative degrees', () => {
    expect(degreesToPitchRatio(-5)).toBeNull();
  });

  it('returns null for ≥90 degrees', () => {
    expect(degreesToPitchRatio(90)).toBeNull();
    expect(degreesToPitchRatio(100)).toBeNull();
  });
});

// =========================================================
// Common Pitch Ratios Table
// =========================================================

describe('Roof Pitch: Ratio Table', () => {
  it('has at least 10 common ratios', () => {
    expect(PITCH_RATIOS.length).toBeGreaterThanOrEqual(10);
  });

  it('each ratio has label, ratio string, and degrees', () => {
    for (const r of PITCH_RATIOS) {
      expect(r.ratio).toBeTruthy();
      expect(r.degrees).toBeGreaterThan(0);
      expect(r.degrees).toBeLessThan(90);
      expect(r.label).toBeTruthy();
    }
  });

  it('ratios are in ascending order of degrees', () => {
    for (let i = 1; i < PITCH_RATIOS.length; i++) {
      expect(PITCH_RATIOS[i].degrees).toBeGreaterThan(PITCH_RATIOS[i - 1].degrees);
    }
  });

  it('12:12 maps to exactly 45°', () => {
    const found = PITCH_RATIOS.find(r => r.ratio === '12:12');
    expect(found).toBeDefined();
    expect(found!.degrees).toBeCloseTo(45, 1);
  });
});

// =========================================================
// No Silent Estimation Rule
// =========================================================

describe('Roof Pitch: No Silent Estimation', () => {
  it('pitchRatioToDegrees does not guess — returns null for garbage', () => {
    expect(pitchRatioToDegrees('')).toBeNull();
    expect(pitchRatioToDegrees('nope')).toBeNull();
    expect(pitchRatioToDegrees('12')).toBeNull(); // missing colon
  });

  it('degreesToPitchRatio does not guess — returns null for out of range', () => {
    expect(degreesToPitchRatio(-1)).toBeNull();
    expect(degreesToPitchRatio(90)).toBeNull();
    expect(degreesToPitchRatio(180)).toBeNull();
  });
});

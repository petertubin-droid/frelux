/**
 * Calculator monitoring — wraps FRELUX calculator functions with error capture.
 *
 * This module does NOT modify calculator logic. It provides wrapped versions
 * that catch errors, report them to the error monitor, and either re-throw
 * or return a safe fallback.
 *
 * Usage in page components:
 *   import { safeCalculatePaint } from '@/lib/calculator-monitor';
 *   const result = safeCalculatePaint(input);
 *
 * Or use the generic wrapper:
 *   import { monitoredCalc } from '@/lib/calculator-monitor';
 *   const result = monitoredCalc('Paint Calculator', () => calculatePaint(input));
 */

import { captureCalculatorError } from '@/lib/errorMonitor';

// ── Generic wrapper ──

/**
 * Run a calculator function with error monitoring.
 * If it throws, the error is captured and re-thrown so the UI can handle it.
 */
export function monitoredCalc<T>(
  calculatorName: string,
  fn: () => T,
): T {
  try {
    return fn();
  } catch (error) {
    captureCalculatorError(calculatorName, error);
    throw error; // Re-throw so the UI can show its own error handling
  }
}

/**
 * Run an async calculator function with error monitoring.
 */
export async function monitoredCalcAsync<T>(
  calculatorName: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureCalculatorError(calculatorName, error);
    throw error;
  }
}

/**
 * Run a calculator function with error monitoring and a safe fallback.
 * If it throws, the error is captured and the fallback is returned instead.
 */
export function safeCalc<T>(
  calculatorName: string,
  fn: () => T,
  fallback: T,
): T {
  try {
    return fn();
  } catch (error) {
    captureCalculatorError(calculatorName, error);
    return fallback;
  }
}

// ── Calculator names registry ──

export const CALCULATOR_NAMES = {
  PAINTING: 'Painting Calculator',
  SCREEDING: 'Screeding Calculator',
  POP_CEILING: 'POP Ceiling Calculator',
  TILES: 'Tile Calculator',
  TYROLENE: 'Tyrolene Estimator',
  GRAFITEX: 'Grafitex Calculator',
  BUILD_TO_ROOF: 'Build-to-Roof Estimator',
  FOUNDATION: 'Foundation Calculator',
  STRUCTURAL: 'Structural Calculator',
  CONSTRUCTION: 'Construction Sequence',
  TIMELINE: 'Project Timeline',
  AI_PHOTO_ESTIMATOR: 'AI Photo Estimator',
  ADVANCED_ESTIMATE: 'Advanced Estimate',
  PAINT_COST: 'Paint Cost Estimator',
  SCREEDING_COST: 'Screeding Cost Estimator',
  POP_COST: 'POP Cost Estimator',
  TILE_COST: 'Tile Cost Estimator',
  FINISH: 'Finish Calculator',
} as const;

export type CalculatorName = (typeof CALCULATOR_NAMES)[keyof typeof CALCULATOR_NAMES];

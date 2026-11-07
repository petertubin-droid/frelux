/**
 * Presentation rounding for the engineering engines.
 *
 * The engines compute in SI with full double precision and round only when a
 * figure is handed to the screen, the schedule or an export. Doing that in one
 * place keeps three properties the pages depend on:
 *
 *  1. The same value rounds the same way everywhere. Inline
 *     `Math.round(x * 100) / 100` differs from a summed rounded value, and
 *     binary representation makes a true half (1.005) round down.
 *  2. A quantity never feeds the next calculation in rounded form. Callers
 *     round at the edge, so a chain of effects keeps its full precision.
 *  3. Ties round away from zero, which is what a person reading 1.005 as 1.01
 *     expects, and what stops a footing width from drifting on the last digit.
 */

/** Nudge a value that sits a hair below a true half onto the half. */
const tieBreak = (scaled: number): number =>
  scaled + Math.sign(scaled || 1) * 1e-9;

/**
 * Round to a fixed number of decimals, half away from zero.
 *
 * Non-finite input returns 0 so a missing dimension cannot leak NaN into a
 * schedule or an export.
 */
export function roundTo(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  if (decimals <= 0) return Math.round(tieBreak(value));
  const factor = 10 ** decimals;
  return Math.round(tieBreak(value * factor)) / factor;
}

export const round1 = (value: number): number => roundTo(value, 1);
export const round2 = (value: number): number => roundTo(value, 2);
export const round3 = (value: number): number => roundTo(value, 3);
export const round4 = (value: number): number => roundTo(value, 4);

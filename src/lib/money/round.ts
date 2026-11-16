/**
 * The product's one cent-rounding rule.
 *
 * `Math.round(value * 100) / 100` is not enough: 8.165 and 10.075 are stored a
 * hair below their half cent, so they round down while 1.005 rounds up, and the
 * same amount of money changes by a cent depending on which figures sit next to
 * it. `Number.EPSILON` does not repair that, because it is relative to 1 and
 * these are cent-scale values.
 *
 * The rule below applies a cent-scale tolerance in the magnitude, so a half cent
 * rounds away from zero on both sides. Every money-carrying module imports it
 * from here rather than keeping its own copy.
 */
export function roundMoney(value: number): number {
  return roundTo(value, 2);
}

/**
 * The same rule at any number of decimal places, for rates and quantities that
 * are not cents. The tolerance is scaled to the requested precision.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  const scaled = Math.abs(value) * factor;
  // A half is recognised by its position rather than by nudging the whole
  // scaled value: 816.4999999999999 is a half that the binary form lost, while
  // 816.4 is not. Nudging the scaled value by a fixed amount instead would
  // swamp the last digits of a high-precision rate.
  const floor = Math.floor(scaled);
  const withinHalf = scaled - floor >= 0.5 - 1e-6;
  const rounded = withinHalf ? floor + 1 : Math.round(scaled);
  return (value < 0 ? -rounded : rounded) / factor;
}

/**
 * A rate published next to a converted amount has to reproduce that amount, so
 * it is rounded to significant digits rather than decimal places: an exchange
 * rate of 0.0000634 needs its leading digits, not eight decimal places of
 * zeroes.
 */
export function roundSignificant(value: number, digits: number): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const decimals = Math.max(0, digits - 1 - magnitude);
  return roundTo(value, decimals);
}

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
  if (!Number.isFinite(value)) return 0;
  const scaled = Math.abs(value) * 100;
  const rounded = Math.round(scaled + 1e-6);
  return (value < 0 ? -rounded : rounded) / 100;
}

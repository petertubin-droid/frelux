/**
 * Shared admin-rule access helpers for estimation engines.
 *
 * Every engine that reads EstimationCalcRule rows (or an equivalent
 * { rule_key, rule_value } shape) was carrying its own copy of these
 * helpers. They now live here so the rule-contract (rule_value.value
 * numeric payload, is_active gating, rounding_decimals clamping) has
 * exactly one implementation.
 */
export type NumericRuleLike = {
  rule_key: string;
  rule_value?: Record<string, unknown> | null;
  is_active?: boolean | null;
};

/**
 * Numeric value of a stored rule payload, or null when it is not a number.
 *
 * Number() alone was wrong here: it turns null, "" and false into a confident
 * 0 and [] into 0 as well, so an admin rule saved with an empty value read as a
 * real zero. A zero coverage rate or a zero labour cost then produced endless
 * quantities and free work instead of the "rule is missing" refusal the engines
 * are written to give. Only real numbers and non-blank numeric strings count.
 */
export function numericPayload(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Round to `decimals` decimal places (half-up). */
export function roundTo(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

/**
 * Numeric value of the first active rule with `key`, extracted from the
 * `rule_value.value` payload. Returns `fallback` when provided and the rule
 * is missing/non-numeric, otherwise null.
 */
export function ruleNumber<T extends NumericRuleLike>(
  rules: readonly T[],
  key: string,
  fallback: number,
): number;
export function ruleNumber<T extends NumericRuleLike>(
  rules: readonly T[],
  key: string,
): number | null;
export function ruleNumber<T extends NumericRuleLike>(
  rules: readonly T[],
  key: string,
  fallback?: number,
): number | null {
  const r = rules.find(
    (x) => x.rule_key === key && (x as NumericRuleLike).is_active !== false,
  );
  const raw = (
    (r as NumericRuleLike | undefined)?.rule_value as
      | Record<string, unknown>
      | null
      | undefined
  )?.value;
  const v = numericPayload(raw);
  if (v !== null) return v;
  return fallback !== undefined ? fallback : null;
}

/**
 * Display precision from FRELUX "rounding_decimals" rule.
 * Strict: only integers in 0..6 count; anything else falls back to 2.
 */
export function ruleDecimals<T extends NumericRuleLike>(rules: readonly T[]): number {
  const v = ruleNumber(rules, "rounding_decimals");
  return v !== null && Number.isInteger(v) && v >= 0 && v <= 6 ? v : 2;
}

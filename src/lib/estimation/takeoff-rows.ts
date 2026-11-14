/**
 * Turns an engine result object into the label/value rows the takeoff page
 * shows under "Quantity summary".
 *
 * This exists because the page used to fall back to `JSON.stringify(value)` for
 * anything that was not a primitive. The plastering engine returns
 * `estimatedLaborHours: { plastererHours, tenderHours }` and a `packagingEvidence`
 * object full of source URLs, so the summary printed raw JSON
 * (`{"plastererHours":16.8,...}`) — unreadable, and a single unbreakable token
 * wide enough to drag the whole results card past the screen edge on a phone.
 *
 * The rules here are deliberately conservative: show what a person can read,
 * drop what another panel already renders, and never emit a brace.
 */

export type SummaryRow = { label: string; value: string };

/** "estimatedLaborHours" -> "Estimated labor hours" is too clever; keep it simple. */
export function humaniseResultKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

/** A short, readable rendering of a primitive. */
function primitive(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() === "" ? null : value;
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

/**
 * True for a value that is only a container for other things: a list, or an
 * object whose members are lists or objects (sources, warnings, steps). Those
 * are rendered by their own panels, or not at all. Stringifying them was the
 * defect.
 */
function isContainer(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).some(
    (member) =>
      Array.isArray(member) || (typeof member === "object" && member !== null),
  );
}

/**
 * The display string for one result value, or null when it should not appear
 * as a row at all.
 *
 * A flat object of primitives (an hours breakdown, a cost split) becomes
 * "Plasterer hours 16.8 · Tender hours 11.8" so the numbers are still visible
 * without their keys turning into JSON. Anything nested is dropped.
 */
export function summariseResultValue(value: unknown): string | null {
  const direct = primitive(value);
  if (direct !== null) return direct;
  if (isContainer(value)) return null;
  if (typeof value !== "object" || value === null) return null;

  const pairs = Object.entries(value as Record<string, unknown>)
    .map(([key, member]) => {
      const text = primitive(member);
      return text === null ? null : `${humaniseResultKey(key)} ${text}`;
    })
    .filter((pair): pair is string => pair !== null);

  return pairs.length > 0 ? pairs.join(" · ") : null;
}

/**
 * A replacement for how one result key is shown: usually two rows where the
 * engine returned one number (a volume and the purchase units it means), and an
 * empty array where another key's rows already say it.
 */
export type RowOverride = (value: unknown) => SummaryRow[] | null;

/**
 * The rows to render, in the engine's own key order, with marketCode hidden
 * (the panel already says "Calculated for NG") and empty values skipped.
 *
 * `overrides` lets a caller restate specific keys without the engine knowing
 * anything about display: the sand volume becomes "6.69 m³ · 10.7 t" plus a
 * trip plan, and the separate weight row is absorbed rather than repeated.
 */
export function buildSummaryRows(
  result: Record<string, unknown>,
  labels: Record<string, string> = {},
  overrides: Record<string, RowOverride> = {},
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  for (const [key, value] of Object.entries(result)) {
    if (key === "marketCode") continue;
    const override = overrides[key];
    if (override) {
      const replaced = override(value);
      if (replaced) {
        rows.push(...replaced);
        continue;
      }
    }
    const value_ = summariseResultValue(value);
    if (value_ === null) continue;
    rows.push({ label: labels[key] ?? humaniseResultKey(key), value: value_ });
  }
  return rows;
}

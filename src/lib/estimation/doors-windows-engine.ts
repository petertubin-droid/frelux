/**
 * Doors & Windows Engine (Tier 2, Engine 7)
 *
 * Deterministic doors/windows MATERIAL estimation.
 *
 *   USER: door counts per type (flush, panel, security),
 *         window counts per type (aluminium sliding, louvre),
 *         and whether locksets are included.
 *   RULES: hinges per door (a labelled planning allowance).
 *
 * Honesty contract:
 *  - Counts are NEVER assumed. All blank = no openings given:
 *    the engine reports the schedule missing rather than
 *    inventing doors.
 *  - Frames follow door counts (one set per door) and are
 *    labelled; hinges and locksets are labelled PLANNING
 *    ALLOWANCES from the admin's visible rule — not
 *    measurements.
 *  - Window sizes vary: the admin's unit price must reflect the
 *    typical sized unit; the result warns users to confirm
 *    sizes on site.
 *  - Prices come from the shared material database. Unpriced
 *    materials show PRICE NOT CONFIGURED; totals stay null.
 */

import type { CalcRuleRow } from "./count-vision-engine";

// ─────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────

export interface DoorsWindowsRules {
  hinges_per_door: number | null;
}

export const DEFAULT_DOORS_WINDOWS_RULES: DoorsWindowsRules = {
  hinges_per_door: null,
};

export function parseDoorsWindowsRules(rows: CalcRuleRow[]): DoorsWindowsRules {
  const rules: DoorsWindowsRules = { ...DEFAULT_DOORS_WINDOWS_RULES };
  const row = rows.find(
    (r) =>
      r.rule_key === "hinges_per_door" &&
      (r.is_active === undefined ||
        r.is_active === true ||
        r.is_active === null),
  );
  const n = Number(row?.rule_value?.value);
  if (Number.isInteger(n) && n > 0 && n <= 12) rules.hinges_per_door = n;
  return rules;
}

// ─────────────────────────────────────────────
// Input / output
// ─────────────────────────────────────────────

export interface DoorsWindowsInput {
  flush_doors: number;
  panel_doors: number;
  security_doors: number;
  aluminium_windows: number;
  louvre_windows: number;
  include_locksets: boolean;
  labour: {
    mode: "none" | "per_door" | "lump_sum";
    per_door_rate?: number | null;
    lump_sum?: number | null;
  };
}

export interface DoorsWindowsLine {
  key: string;
  label: string;
  material_slug: string;
  quantity: number | null;
  quantity_source: "user_provided" | "rule_derived" | "missing";
  unit: string;
  detail: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface DoorsWindowsStep {
  label: string;
  detail: string;
}

export interface DoorsWindowsResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: DoorsWindowsStep[];
  lines: DoorsWindowsLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
}

export type DoorsWindowsPriceMap = Record<string, number | null>;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function isCount(v: number): boolean {
  return Number.isInteger(v) && v >= 0;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateDoorsWindows(
  input: DoorsWindowsInput,
  rules: DoorsWindowsRules,
  prices: DoorsWindowsPriceMap,
): DoorsWindowsResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps: DoorsWindowsStep[] = [];
  const missing: string[] = [];
  const lines: DoorsWindowsLine[] = [];

  // ── 0. Validation ──
  const counts: [keyof DoorsWindowsInput, string][] = [
    ["flush_doors", "Flush doors"],
    ["panel_doors", "Panel doors"],
    ["security_doors", "Security doors"],
    ["aluminium_windows", "Aluminium sliding windows"],
    ["louvre_windows", "Louvre windows"],
  ];
  for (const [key, label] of counts) {
    const n = Number(input[key]);
    if (!isCount(n)) {
      errors.push(
        `${label} must be a whole number ≥ 0 (received ${String(input[key])}).`,
      );
    }
  }
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      steps,
      lines,
      priced_subtotal: 0,
      material_subtotal: null,
      labour_total: 0,
      grand_total: null,
      incomplete: true,
      missing,
    };
  }

  const totalDoors =
    input.flush_doors + input.panel_doors + input.security_doors;
  const totalWindows = input.aluminium_windows + input.louvre_windows;

  // ── 1. Door leaves per type (direct user counts) ──
  const doorTypes: { key: string; label: string; slug: string; qty: number }[] =
    [
      {
        key: "flush_doors",
        label: "Flush doors",
        slug: "door-flush",
        qty: input.flush_doors,
      },
      {
        key: "panel_doors",
        label: "Panel doors",
        slug: "door-panel",
        qty: input.panel_doors,
      },
      {
        key: "security_doors",
        label: "Security doors",
        slug: "door-security",
        qty: input.security_doors,
      },
    ];
  for (const d of doorTypes) {
    if (d.qty === 0) continue;
    const price = prices[d.slug] ?? null;
    lines.push({
      key: d.key,
      label: d.label,
      material_slug: d.slug,
      quantity: d.qty,
      quantity_source: "user_provided",
      unit: "pieces",
      detail: `${d.qty} × (your count)`,
      unit_price: price,
      line_total: price !== null ? money(d.qty * price) : null,
    });
  }

  // ── 2. Door frames (one set per door, labelled) ──
  if (totalDoors > 0) {
    const price = prices["door-frame"] ?? null;
    steps.push({
      label: "Door frames",
      detail: `${totalDoors} doors × 1 frame set each = ${totalDoors} sets (labelled: one set per door).`,
    });
    lines.push({
      key: "door_frames",
      label: "Door frame sets",
      material_slug: "door-frame",
      quantity: totalDoors,
      quantity_source: "rule_derived",
      unit: "sets",
      detail: `${totalDoors} doors × 1 frame set = ${totalDoors} sets (labelled assumption: one set per door)`,
      unit_price: price,
      line_total: price !== null ? money(totalDoors * price) : null,
    });
  }

  // ── 3. Hinges (visible planning rule) ──
  if (totalDoors > 0) {
    if (rules.hinges_per_door === null) {
      missing.push(
        "Hinges: no planning rule configured (hinges_per_door). Count them on site or configure the rule.",
      );
    } else {
      const qty = totalDoors * rules.hinges_per_door;
      const price = prices["door-hinge"] ?? null;
      steps.push({
        label: "Hinges",
        detail: `${totalDoors} doors × ${rules.hinges_per_door} per door = ${qty} (admin's visible planning allowance).`,
      });
      lines.push({
        key: "hinges",
        label: "Door hinges",
        material_slug: "door-hinge",
        quantity: qty,
        quantity_source: "rule_derived",
        unit: "pieces",
        detail: `${totalDoors} doors × ${rules.hinges_per_door} = ${qty} (planning allowance — heavy doors may need more)`,
        unit_price: price,
        line_total: price !== null ? money(qty * price) : null,
      });
    }
  }

  // ── 4. Locksets (user decides, one per door) ──
  if (input.include_locksets && totalDoors > 0) {
    const price = prices["door-lockset"] ?? null;
    steps.push({
      label: "Locksets",
      detail: `${totalDoors} doors × 1 lockset each = ${totalDoors} (labelled: one per door — adjust on site for double doors).`,
    });
    lines.push({
      key: "locksets",
      label: "Door locksets",
      material_slug: "door-lockset",
      quantity: totalDoors,
      quantity_source: "rule_derived",
      unit: "sets",
      detail: `${totalDoors} doors × 1 = ${totalDoors} sets (labelled assumption: one per door)`,
      unit_price: price,
      line_total: price !== null ? money(totalDoors * price) : null,
    });
  }

  // ── 5. Windows per type (direct user counts) ──
  const windowTypes: {
    key: string;
    label: string;
    slug: string;
    qty: number;
  }[] = [
    {
      key: "aluminium_windows",
      label: "Aluminium sliding windows",
      slug: "window-aluminium",
      qty: input.aluminium_windows,
    },
    {
      key: "louvre_windows",
      label: "Louvre windows",
      slug: "window-louver",
      qty: input.louvre_windows,
    },
  ];
  for (const w of windowTypes) {
    if (w.qty === 0) continue;
    const price = prices[w.slug] ?? null;
    lines.push({
      key: w.key,
      label: w.label,
      material_slug: w.slug,
      quantity: w.qty,
      quantity_source: "user_provided",
      unit: "units",
      detail: `${w.qty} × (your count)`,
      unit_price: price,
      line_total: price !== null ? money(w.qty * price) : null,
    });
  }

  // ── 6. All-blank schedule check ──
  if (totalDoors === 0 && totalWindows === 0) {
    missing.push(
      "Door/window schedule: enter at least one door or window count — the engine will not invent openings.",
    );
  }

  // ── 7. Labour — separate, never automatic ──
  let labourTotal = 0;
  const openables = totalDoors + totalWindows;
  if (input.labour.mode === "per_door") {
    const rate = input.labour.per_door_rate ?? null;
    if (rate === null || !Number.isFinite(rate) || rate < 0) {
      errors.push(
        "Labour: a per-unit rate is required when labour mode is per unit.",
      );
    } else {
      labourTotal = money(openables * rate);
      steps.push({
        label: "Labour",
        detail: `${openables} doors + windows × ${rate} per unit = ${labourTotal} (user-provided rate).`,
      });
    }
  } else if (input.labour.mode === "lump_sum") {
    const sum = input.labour.lump_sum ?? null;
    if (sum === null || !Number.isFinite(sum) || sum < 0) {
      errors.push(
        "Labour: a lump sum is required when labour mode is lump-sum.",
      );
    } else {
      labourTotal = money(sum);
      steps.push({
        label: "Labour",
        detail: `Lump sum ${sum} (user-provided).`,
      });
    }
  } else {
    steps.push({
      label: "Labour",
      detail: "Excluded — not added to the total.",
    });
  }

  // ── 8. Totals — never fabricated ──
  const pricedLines = lines.filter((l) => l.line_total !== null);
  const pricedSubtotal = money(
    pricedLines.reduce((s, l) => s + (l.line_total ?? 0), 0),
  );
  const allSizedAndPriced = lines.every(
    (l) => l.quantity !== null && l.line_total !== null,
  );
  const materialSubtotal = allSizedAndPriced
    ? money(lines.reduce((s, l) => s + (l.line_total ?? 0), 0))
    : null;

  for (const l of lines) {
    if (l.quantity !== null && l.unit_price === null) {
      warnings.push(
        `${l.label}: PRICE NOT CONFIGURED in the material database — quantity shown, no price invented.`,
      );
    }
  }
  warnings.push(
    "Window and door prices must match the size and finish the admin configured — confirm actual unit sizes on site. This is material ESTIMATION, not a fixing specification.",
  );

  const incomplete =
    lines.some((l) => l.quantity === null || l.line_total === null) ||
    missing.length > 0;
  const grandTotal =
    materialSubtotal !== null && errors.length === 0 && missing.length === 0
      ? money(materialSubtotal + labourTotal)
      : null;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    steps,
    lines,
    priced_subtotal: pricedSubtotal,
    material_subtotal: materialSubtotal,
    labour_total: labourTotal,
    grand_total: grandTotal,
    incomplete,
    missing,
  };
}

/**
 * FRELUX Warranty & Dispute Engine (Future Engine 14)
 *
 * Snapshots the exact configuration behind every estimate so a
 * claim or dispute can be replayed deterministically.
 *
 * What it does:
 * 1. Freezes the estimate's stored configuration (inputs,
 *    calculated quantities, per-line price snapshots) into a
 *    certificate snapshot.
 * 2. Computes a deterministic config_hash over that frozen
 *    configuration - the same estimate always hashes the
 *    same, so any later tampering is detectable.
 * 3. Replays the stored line math (quantity x snapshot price)
 *    against the stored line totals. A mismatch is reported as
 *    a dispute flag - it is NEVER silently repaired.
 * 4. Applies the admin-configured warranty period (months,
 *    copied onto the record at issue time so later rule
 *    changes never rewrite history).
 *
 * Philosophy (unchanged): the engine never guesses.
 * - No warranty rule configured → no expiry is invented; the
 *   certificate is issued without one plus a warning.
 * - Invalid or missing line data → flagged, never smoothed over.
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface WarrantyItemInput {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  /** Price the item was saved at (stored unit_price column) */
  unit_price: number;
  /** Stored line total to verify against */
  stored_total: number;
}

export interface WarrantyInput {
  estimate_ref: string;
  estimate_id: string;
  calculator_type: string;
  currency: string;
  /** When the estimate was created / quoted */
  quoted_at: string;
  total_material_cost: number;
  inputs: Record<string, unknown>;
  calculated_quantities: Record<string, unknown>;
  items: WarrantyItemInput[];
  /** Active calc rules (calculator_type = 'warranty') */
  rules: EstimationCalcRule[];
  /** ISO datetime the certificate is issued at (tests pin this) */
  now: string;
}

export interface ReplayCheck {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  replayed_total: number;
  stored_total: number;
  matches: boolean;
}

export interface WarrantyResult {
  ok: boolean;
  certificate_ref: string | null;
  estimate_snapshot: Record<string, unknown> | null;
  config_hash: string | null;
  warranty_months: number | null;
  issued_at: string | null;
  expires_at: string | null;
  within_warranty: boolean | null;
  status: "active" | "expired" | "disputed";
  replay_checks: ReplayCheck[];
  dispute_flags: string[];
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

function ruleNumber(rules: EstimationCalcRule[], key: string): number | null {
  const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isFinite(v) ? v : null;
}

/** Deterministic canonical JSON: object keys sorted recursively. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

/** FNV-1a 32-bit over the canonical JSON - deterministic, dependency-free. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Clamp month-overflow (Jan 31 + 1 month → Feb 28/29, not Mar 3)
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString();
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function issueWarrantyCertificate(input: WarrantyInput): WarrantyResult {
  const result: WarrantyResult = {
    ok: false,
    certificate_ref: null,
    estimate_snapshot: null,
    config_hash: null,
    warranty_months: null,
    issued_at: null,
    expires_at: null,
    within_warranty: null,
    status: "active",
    replay_checks: [],
    dispute_flags: [],
    warnings: [],
    steps: [],
  };

  // ── 1. Validation ──
  const ref = input.estimate_ref?.trim();
  if (!ref || !input.estimate_id?.trim()) {
    result.warnings.push(
      "An estimate must be selected: the engine never certifies without one.",
    );
    return result;
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    result.warnings.push(
      "The selected estimate has no line items, so there is nothing to certify.",
    );
    return result;
  }
  if (!input.now || Number.isNaN(new Date(input.now).getTime())) {
    result.warnings.push("Certificate issue time is invalid.");
    return result;
  }

  // ── 2. Freeze the configuration exactly as stored ──
  const snapshot: Record<string, unknown> = {
    estimate_ref: ref,
    estimate_id: input.estimate_id,
    calculator_type: input.calculator_type,
    currency: input.currency,
    quoted_at: input.quoted_at,
    total_material_cost: input.total_material_cost,
    inputs: input.inputs ?? {},
    calculated_quantities: input.calculated_quantities ?? {},
    items: input.items.map((it) => ({
      item_id: it.item_id,
      item_name: it.item_name,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      stored_total: it.stored_total,
    })),
  };
  result.estimate_snapshot = snapshot;

  // ── 3. Deterministic config hash (tamper-evident, never secret) ──
  result.config_hash = fnv1a(canonicalJson(snapshot));
  result.certificate_ref = `FRELUX-WAR-${ref}-${result.config_hash}`;
  result.steps.push({
    label: "Configuration frozen",
    detail: `Snapshot of ${input.items.length} line${input.items.length === 1 ? "" : "s"} + inputs + calculated quantities hashed to ${result.config_hash}. The same stored configuration always hashes the same: any later change is detectable.`,
  });

  // ── 4. Replay the stored line math - flag mismatches, never repair ──
  let hasDispute = false;
  for (const it of input.items) {
    const qty = Number(it.quantity);
    const price = Number(it.unit_price);
    if (
      !Number.isFinite(qty) ||
      !Number.isFinite(price) ||
      qty < 0 ||
      price < 0
    ) {
      result.dispute_flags.push(
        `Line '${it.item_name}' has invalid stored data (quantity or price): it cannot be replayed and is flagged for manual review.`,
      );
      hasDispute = true;
      result.replay_checks.push({
        item_id: it.item_id,
        item_name: it.item_name,
        quantity: qty,
        unit_price: price,
        replayed_total: NaN,
        stored_total: Number(it.stored_total),
        matches: false,
      });
      continue;
    }
    const replayed = roundMoney(qty * price);
    const stored = Number(it.stored_total);
    const matches =
      Number.isFinite(stored) && Math.abs(replayed - stored) <= 0.01;
    result.replay_checks.push({
      item_id: it.item_id,
      item_name: it.item_name,
      quantity: qty,
      unit_price: price,
      replayed_total: replayed,
      stored_total: Number.isFinite(stored) ? stored : NaN,
      matches,
    });
    if (!matches) {
      result.dispute_flags.push(
        `Line '${it.item_name}' stored total ${stored} does not match the replayed math ${qty} × ${price} = ${replayed}. Flagged for dispute review: the engine never repairs stored data.`,
      );
      hasDispute = true;
    }
  }
  const okLines = result.replay_checks.filter((c) => c.matches).length;
  result.steps.push({
    label: "Replay verification",
    detail: `Replayed ${okLines}/${result.replay_checks.length} line${result.replay_checks.length === 1 ? "" : "s"} exactly (quantity × snapshot price = stored total, 2dp). ${hasDispute ? `${result.replay_checks.length - okLines} mismatch${result.replay_checks.length - okLines === 1 ? "" : "es"} flagged: never repaired.` : "All lines replay exactly."}`,
  });

  // ── 5. Warranty period from the configured rule - copied at issue time ──
  const months = ruleNumber(input.rules, "warranty_months");
  const issued = new Date(input.now).toISOString();
  result.issued_at = issued;
  if (
    months !== null &&
    Number.isFinite(months) &&
    months > 0 &&
    Number.isInteger(months)
  ) {
    result.warranty_months = months;
    const expires = addMonths(input.quoted_at || issued, months);
    result.expires_at = expires || null;
    if (result.expires_at) {
      result.within_warranty =
        new Date(issued).getTime() <= new Date(result.expires_at).getTime();
      result.steps.push({
        label: "Warranty period",
        detail: `${months} month${months === 1 ? "" : "s"} from the quote date: copied onto this certificate now, so later rule changes never rewrite this record. Expires ${result.expires_at.slice(0, 10)}.`,
      });
    }
  } else {
    result.warnings.push(
      "No valid warranty_months rule is configured for the warranty calculator: the certificate is issued WITHOUT an expiry. FRELUX never invents a warranty period.",
    );
  }

  result.status = hasDispute
    ? "disputed"
    : result.within_warranty === false
      ? "expired"
      : "active";
  result.ok = true;
  return result;
}

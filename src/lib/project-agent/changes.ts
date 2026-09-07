// =========================================================
// FRELUX PROJECT AGENT — CHANGE DETECTION (Phase 6, Stage 8)
//
// Project-change intelligence: compare the previous recorded
// baseline against the current recorded state and EXPLAIN
// changes — What changed → Why it changed → What effect it
// has. Never merely "two numbers are different".
//
// Honesty rules, all enforced:
//   - Only RECORDED state is compared. Both sides are captured
//     snapshots of real project data — nothing is simulated.
//   - "Why" is derived from the recorded data itself (a
//     completion date, a purchase record, a price-history
//     entry). When the cause is not captured, the change says
//     so explicitly — no invented reasons.
//   - "Effect" is derived only where it is quantifiable from
//     recorded data (line totals, spend roll-ups, stage
//     fractions). Where it is not quantifiable, the change
//     says what is missing instead of guessing.
//   - Measurement inputs and waste factors are not carried in
//     the captured state — reported as limitations, never as
//     fabricated deltas.
//   - Regressions (a completed stage undone, a purchase
//     un-recorded) are flagged as MAJOR — the honest system
//     notices when the record moves backwards.
// =========================================================

import { supabase } from "@/lib/supabase";
import type { AgentResult } from "./types";
import { assertProjectVisible, recordActivity } from "./session";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import { formatMoney, formatSignedMoney } from "./region";
import type {
  Evidence,
  PredictiveProjectSnapshot,
} from "@/lib/predictive-intelligence/types";
import {
  estimatedShoppingTotal,
  lineEstimatedTotal,
  recordedSpend,
  unpurchasedEstimatedTotal,
} from "@/lib/predictive-intelligence/spend";

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------

export type ChangeCategory =
  | "measurement"
  | "quantity"
  | "material_requirement"
  | "price"
  | "waste"
  | "scope"
  | "budget"
  | "schedule"
  | "regional_context";

export type ChangeSeverity = "info" | "minor" | "major";

export interface ProjectChange {
  /** Stable, deterministic id — same change, same id. */
  id: string;
  category: ChangeCategory;
  severity: ChangeSeverity;
  /** What changed — a sentence with the actual before → after. */
  whatChanged: string;
  /** Why it changed — from recorded data, or an explicit unknown. */
  whyItChanged: string;
  /** What effect it has — derived, quantified where possible. */
  effect: string;
  before: { at: string; value: string };
  after: { at: string; value: string };
  /** The recorded rows behind this change — traceable, never invented. */
  evidence: Evidence[];
  detectedAt: string;
}

export interface ChangeDetectionResult {
  projectId: string;
  comparedAt: string;
  /** When the baseline this comparison ran against was captured. */
  baselineCapturedAt: string | null;
  /** 'first_capture' — nothing to compare yet; baseline stored. */
  status: "ok" | "first_capture";
  changes: ProjectChange[];
  summary: string;
  /** What this comparison cannot see — shown, never hidden. */
  limitations: string[];
}

const LIMITATIONS = [
  "Measurement inputs (room dimensions, areas) are not captured in the recorded state — measurement changes are inferred only from saved calculation results.",
  "Waste factors are not captured in the recorded state — waste changes cannot be detected by comparison.",
];

// ---------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------

/** Stage 11 — money is formatted for the project's RECORDED
 *  market; unsupported markets get an explicit unavailable
 *  marker, never a substituted currency symbol. */
function money(n: number, market: string | null): string {
  return formatMoney(n, market);
}

/** Signed money — "+₦1,000" / "-₦800", never "₦-800". */
function signedMoney(delta: number, market: string | null): string {
  return formatSignedMoney(delta, market);
}

/** The project's recorded market, from the compared snapshots. */
function marketOf(ctx: DiffCtx): string | null {
  return (
    ctx.after.region.marketCode ?? ctx.after.region.countryCode ?? null
  );
}

function evidence(
  kind: Evidence["kind"],
  id: string | undefined,
  label: string,
  recordedAt: string | null,
): Evidence {
  return {
    kind,
    id,
    label,
    recordedAt,
    verification: "user_recorded",
  };
}

/** % change of after vs before — null when before is 0/absent. */
function pctChange(before: number, after: number): number | null {
  if (!Number.isFinite(before) || before === 0) return null;
  return (after - before) / before;
}

/** Severity for a relative magnitude. */
function magnitudeSeverity(
  pct: number | null,
  majorThreshold = 0.1,
): ChangeSeverity {
  if (pct === null) return "minor"; // absolute change, no baseline to ratio
  return Math.abs(pct) >= majorThreshold ? "major" : "minor";
}

interface DiffCtx {
  before: PredictiveProjectSnapshot;
  after: PredictiveProjectSnapshot;
  changes: ProjectChange[];
  nowIso: string;
}

function addChange(
  ctx: DiffCtx,
  change: Omit<ProjectChange, "detectedAt">,
): void {
  ctx.changes.push({ ...change, detectedAt: ctx.nowIso });
}

/**
 * Honest cause for a value change: if the recorded price history
 * contains an entry for this material captured between the two
 * snapshots, cite it; otherwise state the unknown explicitly.
 */
function recordedCauseForPriceChange(
  ctx: DiffCtx,
  itemName: string,
): string | null {
  const from = ctx.before.now;
  const to = ctx.after.now;
  const match = [...ctx.after.priceHistory]
    .filter(
      (h) =>
        h.materialName === itemName && h.changedAt > from && h.changedAt <= to,
    )
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    .pop();
  if (!match) return null;
  const oldPart =
    match.oldPrice !== null ? `from ₦${match.oldPrice.toLocaleString()} ` : "";
  return `A material price update was recorded for "${match.materialName}" on ${match.changedAt.split("T")[0]} (${oldPart}to ₦${match.newPrice.toLocaleString()}${match.priceSource ? `, source: ${match.priceSource}` : ""}).`;
}

function unknownCause(ctx: DiffCtx): string {
  return `The recorded value changed between ${ctx.before.now.split("T")[0]} and ${ctx.after.now.split("T")[0]}; the specific triggering event is not captured in the recorded state.`;
}

// ---------------------------------------------------------
// Detectors — one per category of recorded change
// ---------------------------------------------------------

function diffProjectStatus(ctx: DiffCtx): void {
  const b = ctx.before.project;
  const a = ctx.after.project;
  if (b.status === a.status) return;
  addChange(ctx, {
    id: "project:status",
    category: "scope",
    severity: a.status === "archived" ? "major" : "info",
    whatChanged: `The project status changed from "${b.status}" to "${a.status}".`,
    whyItChanged: `The status field was updated in the recorded project record (last record update: ${a.updatedAt.split("T")[0]}).`,
    effect:
      a.status === "on_hold"
        ? "The project is on hold — progress tracking continues, but schedule expectations should be re-planned when work resumes."
        : "No quantified budget or schedule effect is derivable from a status change alone.",
    before: { at: ctx.before.now, value: b.status },
    after: { at: ctx.after.now, value: a.status },
    evidence: [
      evidence(
        "project_record",
        undefined,
        "Project record status field",
        a.updatedAt,
      ),
    ],
  });
}

function diffStages(ctx: DiffCtx): void {
  const before = new Map(ctx.before.stages.map((s) => [s.id, s]));
  const after = new Map(ctx.after.stages.map((s) => [s.id, s]));

  // Added stages — planned scope grew.
  for (const a of ctx.after.stages) {
    if (before.has(a.id)) continue;
    addChange(ctx, {
      id: `stage:${a.id}:added`,
      category: "scope",
      severity: "minor",
      whatChanged: `A construction stage "${a.stageName}" was added to the recorded plan.`,
      whyItChanged: `The stage exists in the recorded progress stages (created/updated ${a.updatedAt.split("T")[0]}); the specific addition event is not captured in the recorded state.`,
      effect: `Planned scope now includes "${a.stageName}" — its completion is not yet recorded.`,
      before: { at: ctx.before.now, value: "not in plan" },
      after: { at: ctx.after.now, value: "in plan (incomplete)" },
      evidence: [
        evidence(
          "progress_stage",
          a.id,
          `Progress stage "${a.stageName}"`,
          a.updatedAt,
        ),
      ],
    });
  }

  // Removed stages — planned scope shrank.
  for (const b of ctx.before.stages) {
    if (after.has(b.id)) continue;
    addChange(ctx, {
      id: `stage:${b.id}:removed`,
      category: "scope",
      severity: b.isCompleted ? "major" : "minor",
      whatChanged: `The construction stage "${b.stageName}" was removed from the recorded plan.`,
      whyItChanged: unknownCause(ctx),
      effect: b.isCompleted
        ? `A COMPLETED stage was removed from the plan — recorded stage progress moves from ${ctx.before.stages.filter((s) => s.isCompleted).length}/${ctx.before.stages.length} to ${ctx.after.stages.filter((s) => s.isCompleted).length}/${ctx.after.stages.length}. Verify this removal was intentional.`
        : `Recorded stage progress is now ${ctx.after.stages.filter((s) => s.isCompleted).length}/${ctx.after.stages.length}.`,
      before: { at: ctx.before.now, value: "in plan" },
      after: { at: ctx.after.now, value: "removed" },
      evidence: [
        evidence(
          "progress_stage",
          b.id,
          `Progress stage "${b.stageName}"`,
          b.updatedAt,
        ),
      ],
    });
  }

  // Completion flips — the schedule signal.
  for (const a of ctx.after.stages) {
    const b = before.get(a.id);
    if (!b || b.isCompleted === a.isCompleted) continue;
    const beforeDone = ctx.before.stages.filter((s) => s.isCompleted).length;
    const afterDone = ctx.after.stages.filter((s) => s.isCompleted).length;
    const total = ctx.after.stages.length;
    if (a.isCompleted) {
      const when = a.completedAt
        ? a.completedAt.split("T")[0]
        : "an unrecorded date";
      addChange(ctx, {
        id: `stage:${a.id}:completed`,
        category: "schedule",
        severity: "minor",
        whatChanged: `The stage "${a.stageName}" was completed.`,
        whyItChanged: `Completion was recorded in the project's progress stages${a.completedAt ? ` with a completion date of ${when}` : " (no completion date recorded)"}.`,
        effect: `Recorded stage progress moved from ${beforeDone}/${total} to ${afterDone}/${total}${total > 0 ? ` (${((afterDone / total) * 100).toFixed(0)}%)` : ""}.`,
        before: { at: ctx.before.now, value: "incomplete" },
        after: { at: ctx.after.now, value: `completed ${when}` },
        evidence: [
          evidence(
            "progress_stage",
            a.id,
            `Progress stage "${a.stageName}" completed`,
            a.updatedAt,
          ),
        ],
      });
    } else {
      // Regression — a completed stage became incomplete again.
      addChange(ctx, {
        id: `stage:${a.id}:regressed`,
        category: "schedule",
        severity: "major",
        whatChanged: `The stage "${a.stageName}" changed from completed back to incomplete.`,
        whyItChanged: unknownCause(ctx),
        effect: `This is a REGRESSION — recorded stage progress moved backwards from ${beforeDone}/${total} to ${afterDone}/${total}. Verify the project records are correct.`,
        before: { at: ctx.before.now, value: "completed" },
        after: { at: ctx.after.now, value: "incomplete" },
        evidence: [
          evidence(
            "progress_stage",
            a.id,
            `Progress stage "${a.stageName}"`,
            a.updatedAt,
          ),
        ],
      });
    }
  }
}

function diffShoppingItems(ctx: DiffCtx): void {
  const mkt = marketOf(ctx);
  const before = new Map(ctx.before.shoppingItems.map((i) => [i.id, i]));
  const after = new Map(ctx.after.shoppingItems.map((i) => [i.id, i]));

  // Added / removed lines — material requirement scope.
  for (const a of ctx.after.shoppingItems) {
    if (before.has(a.id)) continue;
    addChange(ctx, {
      id: `item:${a.id}:added`,
      category: "material_requirement",
      severity: "minor",
      whatChanged: `A material line was added to the shopping list: "${a.name}" (${a.quantity} ${a.unit}, ${money(lineEstimatedTotal(a), mkt)} estimated).`,
      whyItChanged: `The line exists in the recorded shopping list; the specific addition event is not captured in the recorded state.`,
      effect: `Estimated material budget for the project increases by ${money(lineEstimatedTotal(a), mkt)}.`,
      before: { at: ctx.before.now, value: "not in list" },
      after: {
        at: ctx.after.now,
        value: `${a.quantity} ${a.unit} — ${money(lineEstimatedTotal(a), mkt)}`,
      },
      evidence: [
        evidence(
          "shopping_item",
          a.id,
          `Shopping item "${a.name}"`,
          a.updated_at ?? null,
        ),
      ],
    });
  }
  for (const b of ctx.before.shoppingItems) {
    if (after.has(b.id)) continue;
    addChange(ctx, {
      id: `item:${b.id}:removed`,
      category: "material_requirement",
      severity: b.is_purchased ? "major" : "minor",
      whatChanged: `The material line "${b.name}" (${b.quantity} ${b.unit}, ${money(lineEstimatedTotal(b), mkt)} estimated) was removed from the shopping list.`,
      whyItChanged: unknownCause(ctx),
      effect: b.is_purchased
        ? `A PURCHASED line was removed — recorded spend loses the ${money(lineEstimatedTotal(b), mkt)} this line contributed. Verify the removal was intentional.`
        : `Estimated material budget for the project decreases by ${money(lineEstimatedTotal(b), mkt)}.`,
      before: {
        at: ctx.before.now,
        value: `${b.quantity} ${b.unit} — ${money(lineEstimatedTotal(b), mkt)}`,
      },
      after: { at: ctx.after.now, value: "removed" },
      evidence: [
        evidence(
          "shopping_item",
          b.id,
          `Shopping item "${b.name}"`,
          b.updated_at ?? null,
        ),
      ],
    });
  }

  // Field-level changes on surviving lines.
  for (const a of ctx.after.shoppingItems) {
    const b = before.get(a.id);
    if (!b) continue;

    // Quantity
    if (b.quantity !== a.quantity) {
      const estDelta = (a.quantity - b.quantity) * (a.estimated_price || 0);
      addChange(ctx, {
        id: `item:${a.id}:quantity`,
        category: "quantity",
        severity: magnitudeSeverity(pctChange(b.quantity, a.quantity)),
        whatChanged: `The quantity of "${a.name}" changed from ${b.quantity} ${b.unit} to ${a.quantity} ${a.unit}.`,
        whyItChanged: unknownCause(ctx),
        effect:
          a.estimated_price > 0
            ? `At the recorded unit estimate of ${money(a.estimated_price, mkt)}/${a.unit}, the line's estimated total moves by ${signedMoney(estDelta, mkt)} (${money(lineEstimatedTotal(b), mkt)} → ${money(lineEstimatedTotal(a), mkt)})${a.is_purchased ? " — the line is already purchased, so this affects the estimate, not recorded spend." : " — the line is not yet purchased, so remaining planned spend is affected."}`
            : `No unit price is recorded for this line — the spend effect cannot be quantified.`,
        before: { at: ctx.before.now, value: `${b.quantity} ${b.unit}` },
        after: { at: ctx.after.now, value: `${a.quantity} ${a.unit}` },
        evidence: [
          evidence(
            "shopping_item",
            a.id,
            `Shopping item "${a.name}" quantity`,
            a.updated_at ?? null,
          ),
        ],
      });
    }

    // Estimated unit price
    if (b.estimated_price !== a.estimated_price) {
      const cause = recordedCauseForPriceChange(ctx, a.name);
      const lineDelta = (a.estimated_price - b.estimated_price) * a.quantity;
      addChange(ctx, {
        id: `item:${a.id}:estimated_price`,
        category: "price",
        severity: magnitudeSeverity(
          pctChange(b.estimated_price, a.estimated_price),
        ),
        whatChanged: `The estimated unit price of "${a.name}" changed from ${money(b.estimated_price, mkt)} to ${money(a.estimated_price, mkt)}.`,
        whyItChanged: cause ?? unknownCause(ctx),
        effect: `The line's estimated total moves by ${signedMoney(lineDelta, mkt)} (${money(lineEstimatedTotal(b), mkt)} → ${money(lineEstimatedTotal(a), mkt)})${a.is_purchased ? " — the line is already purchased, so this changes the estimate only." : " — the line is not yet purchased, so remaining planned spend is affected."}`,
        before: { at: ctx.before.now, value: money(b.estimated_price, mkt) },
        after: { at: ctx.after.now, value: money(a.estimated_price, mkt) },
        evidence: [
          evidence(
            "shopping_item",
            a.id,
            `Shopping item "${a.name}" estimated price`,
            a.updated_at ?? null,
          ),
        ],
      });
    }

    // Actual unit price recorded or changed
    if (b.actual_price !== a.actual_price) {
      const was = b.actual_price ?? null;
      const now = a.actual_price ?? null;
      if (now !== null) {
        const est = a.estimated_price;
        const lineEffect = (now - est) * a.quantity;
        addChange(ctx, {
          id: `item:${a.id}:actual_price`,
          category: "price",
          severity: magnitudeSeverity(pctChange(est, now), 0.15),
          whatChanged:
            was !== null
              ? `The recorded actual unit price of "${a.name}" changed from ${money(was, mkt)} to ${money(now, mkt)}.`
              : `An actual unit price was recorded for "${a.name}": ${money(now, mkt)} (estimated ${money(est, mkt)}).`,
          whyItChanged: a.is_purchased
            ? "The price was recorded against a purchase in the shopping list."
            : unknownCause(ctx),
          effect: `Compared to the recorded estimate, this line's cost moves by ${signedMoney(lineEffect, mkt)} (${((pctChange(est, now) ?? 0) * 100).toFixed(1)}% per unit).`,
          before: {
            at: ctx.before.now,
            value: was === null ? "not recorded" : money(was, mkt),
          },
          after: { at: ctx.after.now, value: money(now, mkt) },
          evidence: [
            evidence(
              "shopping_item",
              a.id,
              `Shopping item "${a.name}" actual price`,
              a.updated_at ?? null,
            ),
          ],
        });
      }
    }

    // Purchase flag flips
    if (b.is_purchased !== a.is_purchased) {
      if (a.is_purchased) {
        const at = a.actual_price ?? a.estimated_price;
        addChange(ctx, {
          id: `item:${a.id}:purchased`,
          category: "material_requirement",
          severity: "minor",
          whatChanged: `"${a.name}" was recorded as purchased.`,
          whyItChanged: "The purchase was recorded in the shopping list.",
          effect: `Recorded spend for this line is ${money(at * a.quantity, mkt)} (at the ${a.actual_price !== null ? "recorded actual" : "estimated — no actual price recorded"} unit price of ${money(at, mkt)}). Remaining planned spend decreases by ${money(lineEstimatedTotal(a), mkt)}.`,
          before: { at: ctx.before.now, value: "not purchased" },
          after: { at: ctx.after.now, value: "purchased" },
          evidence: [
            evidence(
              "shopping_item",
              a.id,
              `Shopping item "${a.name}" purchase`,
              a.updated_at ?? null,
            ),
          ],
        });
      } else {
        addChange(ctx, {
          id: `item:${a.id}:unpurchased`,
          category: "material_requirement",
          severity: "major",
          whatChanged: `"${a.name}" changed from purchased back to not purchased.`,
          whyItChanged: unknownCause(ctx),
          effect: `This is a REGRESSION — the purchase record was undone. The line's ${money(lineEstimatedTotal(a), mkt)} returns to remaining planned spend. Verify the project records are correct.`,
          before: { at: ctx.before.now, value: "purchased" },
          after: { at: ctx.after.now, value: "not purchased" },
          evidence: [
            evidence(
              "shopping_item",
              a.id,
              `Shopping item "${a.name}" purchase flag`,
              a.updated_at ?? null,
            ),
          ],
        });
      }
    }
  }
}

function diffCalculations(ctx: DiffCtx): void {
  const mkt = marketOf(ctx);
  const beforeIds = new Set(ctx.before.calculations.map((c) => c.id));
  const afterIds = new Set(ctx.after.calculations.map((c) => c.id));

  for (const c of ctx.after.calculations) {
    if (beforeIds.has(c.id)) continue;
    addChange(ctx, {
      id: `calc:${c.id}:added`,
      category: "measurement",
      severity: "info",
      whatChanged: `A saved calculation "${c.title}" was added${c.estimatedTotal !== null ? ` with a total of ${money(c.estimatedTotal, mkt)}` : " (no recorded total)"}.`,
      whyItChanged: `The calculation was saved to the project on ${c.createdAt.split("T")[0]} — this usually means measurements or requirements were re-run.`,
      effect:
        c.estimatedTotal !== null
          ? `The latest recorded estimate reference is now ${money(c.estimatedTotal, mkt)}. Measurement inputs themselves are not captured, so the exact re-measurement cannot be shown.`
          : "No recorded total — no quantified effect can be derived from this calculation.",
      before: { at: ctx.before.now, value: "not saved" },
      after: {
        at: ctx.after.now,
        value:
          c.estimatedTotal !== null
            ? money(c.estimatedTotal, mkt)
            : "saved (no total)",
      },
      evidence: [
        evidence(
          "calculation",
          c.id,
          `Saved calculation "${c.title}"`,
          c.createdAt,
        ),
      ],
    });
  }

  for (const c of ctx.before.calculations) {
    if (afterIds.has(c.id)) continue;
    addChange(ctx, {
      id: `calc:${c.id}:removed`,
      category: "measurement",
      severity: "info",
      whatChanged: `The saved calculation "${c.title}" was removed.`,
      whyItChanged: unknownCause(ctx),
      effect:
        "No quantified effect — the calculation no longer contributes to the recorded estimate timeline.",
      before: {
        at: ctx.before.now,
        value:
          c.estimatedTotal !== null
            ? money(c.estimatedTotal, mkt)
            : "saved (no total)",
      },
      after: { at: ctx.after.now, value: "removed" },
      evidence: [
        evidence(
          "calculation",
          c.id,
          `Saved calculation "${c.title}"`,
          c.createdAt,
        ),
      ],
    });
  }
}

function diffRegion(ctx: DiffCtx): void {
  const mkt = marketOf(ctx);
  const b = ctx.before.region;
  const a = ctx.after.region;
  const parts = (r: typeof a) =>
    [r.marketCode, r.countryCode, r.city]
      .filter((p) => p !== null && p !== undefined)
      .join(", ") || "unspecified";
  if (parts(b) === parts(a)) return;
  addChange(ctx, {
    id: "region:change",
    category: "regional_context",
    severity: "info",
    whatChanged: `The project's recorded regional context changed from "${parts(b)}" to "${parts(a)}".`,
    whyItChanged: `The region fields in the recorded project record changed${ctx.after.project.updatedAt ? ` (last record update: ${ctx.after.project.updatedAt.split("T")[0]})` : ""}.`,
    effect:
      "Market-specific rules, material profiles and pricing for the new region apply to future calculations — existing recorded figures are unchanged.",
    before: { at: ctx.before.now, value: parts(b) },
    after: { at: ctx.after.now, value: parts(a) },
    evidence: [
      evidence(
        "project_record",
        undefined,
        "Project region fields",
        ctx.after.project.updatedAt,
      ),
    ],
  });
}

/** Budget roll-up — one honest change per metric that actually moved. */
function diffBudget(ctx: DiffCtx): void {
  const mkt = marketOf(ctx);
  const metrics: Array<{
    id: string;
    label: string;
    before: number;
    after: number;
    why: string;
  }> = [
    {
      id: "budget:estimated_total",
      label: "estimated material budget",
      before: estimatedShoppingTotal(ctx.before.shoppingItems),
      after: estimatedShoppingTotal(ctx.after.shoppingItems),
      why: "This is the roll-up of every recorded shopping line's estimated total — line-level changes above drive this movement.",
    },
    {
      id: "budget:recorded_spend",
      label: "recorded spend",
      before: recordedSpend(ctx.before.shoppingItems),
      after: recordedSpend(ctx.after.shoppingItems),
      why: "This is the roll-up of purchased lines at their recorded actual (or estimated-proxy) prices — purchase and price changes above drive this movement.",
    },
    {
      id: "budget:remaining",
      label: "remaining planned spend",
      before: unpurchasedEstimatedTotal(ctx.before.shoppingItems),
      after: unpurchasedEstimatedTotal(ctx.after.shoppingItems),
      why: "This is the roll-up of unpurchased lines' estimated totals — purchases, removals and estimate changes above drive this movement.",
    },
  ];
  for (const m of metrics) {
    if (m.before === m.after) continue;
    const delta = m.after - m.before;
    const pct = pctChange(m.before, m.after);
    addChange(ctx, {
      id: m.id,
      category: "budget",
      severity: magnitudeSeverity(pct),
      whatChanged: `The project's ${m.label} changed from ${money(m.before, mkt)} to ${money(m.after, mkt)} (${signedMoney(delta, mkt)}${pct !== null ? `, ${(pct * 100).toFixed(1)}%` : ""}).`,
      whyItChanged: m.why,
      effect: `This is a derived roll-up of recorded lines, not an independent event — the line-level changes listed above are the actual cause${pct !== null && Math.abs(pct) >= 0.1 ? ", and a movement of this size materially changes the project's cost position." : "."}`,
      before: { at: ctx.before.now, value: money(m.before, mkt) },
      after: { at: ctx.after.now, value: money(m.after, mkt) },
      evidence: [
        evidence(
          "shopping_item",
          undefined,
          "All recorded shopping lines",
          ctx.after.now,
        ),
      ],
    });
  }
}

// ---------------------------------------------------------
// The pure diff — deterministic, no DB, fully testable.
// ---------------------------------------------------------

export function diffSnapshots(
  before: PredictiveProjectSnapshot,
  after: PredictiveProjectSnapshot,
  nowIso: string,
): ProjectChange[] {
  const ctx: DiffCtx = { before, after, changes: [], nowIso };
  diffProjectStatus(ctx);
  diffStages(ctx);
  diffShoppingItems(ctx);
  diffCalculations(ctx);
  diffRegion(ctx);
  diffBudget(ctx);
  // Stable order: category, then id — identical inputs, identical output.
  return ctx.changes.sort((x, y) => x.id.localeCompare(y.id));
}

// ---------------------------------------------------------
// Orchestrator — capture, compare, store, audit.
// ---------------------------------------------------------

interface BaselineRow {
  id: string;
  project_id: string;
  state: PredictiveProjectSnapshot;
  captured_at: string;
}

function persistError(step: string, message: string): AgentResult<never> {
  return {
    ok: false,
    error: { code: "persistence_error", message: `${step}: ${message}` },
  };
}

async function loadBaseline(
  projectId: string,
): Promise<AgentResult<BaselineRow | null>> {
  try {
    const { data, error } = await supabase
      .from("project_agent_state_baselines")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) return persistError("Baseline load failed", error.message);
    return { ok: true, data: (data as BaselineRow | null) ?? null };
  } catch (e) {
    return persistError("Baseline load failed", String(e));
  }
}

async function saveBaseline(
  projectId: string,
  state: PredictiveProjectSnapshot,
  nowIso: string,
): Promise<AgentResult<true>> {
  // The unique constraint is (project_id, created_by) — a clean
  // replace inside the caller's RLS scope, not an upsert.
  try {
    const { error: delError } = await supabase
      .from("project_agent_state_baselines")
      .delete()
      .eq("project_id", projectId);
    if (delError) return persistError("Baseline save failed", delError.message);
    const { error: insError } = await supabase
      .from("project_agent_state_baselines")
      .insert({
        project_id: projectId,
        state,
        captured_at: nowIso,
      });
    if (insError) return persistError("Baseline save failed", insError.message);
    return { ok: true, data: true as const };
  } catch (e) {
    return persistError("Baseline save failed", String(e));
  }
}

export async function detectProjectChanges(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<ChangeDetectionResult>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  // Current recorded state — re-derived fresh, never cached.
  let current: PredictiveProjectSnapshot;
  try {
    const snap = await buildProjectSnapshot(projectId, { now: nowIso });
    if (!snap)
      return persistError(
        "Snapshot build failed",
        "The recorded project state could not be read.",
      );
    current = snap;
  } catch (e) {
    return persistError("Snapshot build failed", String(e));
  }

  const baseline = await loadBaseline(projectId);
  if (!baseline.ok) return baseline;

  // First capture — nothing to compare; store the baseline.
  if (!baseline.data) {
    const saved = await saveBaseline(projectId, current, nowIso);
    if (!saved.ok) return saved;
    const result: ChangeDetectionResult = {
      projectId,
      comparedAt: nowIso,
      baselineCapturedAt: null,
      status: "first_capture",
      changes: [],
      summary:
        "Baseline recorded — this is the first comparison point for the project, so no changes can be reported yet.",
      limitations: LIMITATIONS,
    };
    await recordActivity(
      projectId,
      {
        kind: "analysis",
        state: "observed",
        summary:
          "Change detection: first baseline captured — no comparison yet.",
      },
      nowIso,
    );
    return { ok: true, data: result };
  }

  const changes = diffSnapshots(baseline.data.state, current, nowIso);

  // The new state becomes the baseline for the next comparison —
  // only after the comparison itself succeeded.
  const saved = await saveBaseline(projectId, current, nowIso);
  if (!saved.ok) return saved;

  const majors = changes.filter((c) => c.severity === "major").length;
  const result: ChangeDetectionResult = {
    projectId,
    comparedAt: nowIso,
    baselineCapturedAt: baseline.data.captured_at,
    status: "ok",
    changes,
    summary:
      changes.length === 0
        ? `No changes detected since ${baseline.data.captured_at.split("T")[0]} — the recorded state is unchanged.`
        : `${changes.length} change${changes.length === 1 ? "" : "s"} detected since ${baseline.data.captured_at.split("T")[0]}${majors > 0 ? ` (${majors} major — verify these are intentional)` : ""}.`,
    limitations: LIMITATIONS,
  };

  await recordActivity(
    projectId,
    {
      kind: "analysis",
      state: "observed",
      summary: `Change detection: ${changes.length === 0 ? "no changes" : `${changes.length} change(s) detected`}${majors > 0 ? `, ${majors} major` : ""}.`,
      payload: {
        changeIds: changes.map((c) => c.id),
        majorIds: changes
          .filter((c) => c.severity === "major")
          .map((c) => c.id),
      },
    },
    nowIso,
  );

  return { ok: true, data: result };
}

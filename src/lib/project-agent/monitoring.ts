// =========================================================
// FRELUX PROJECT AGENT — PROACTIVE MONITORING (Phase 6, Stage 9)
//
// Controlled proactive monitoring: evaluate the recorded
// project state periodically and raise an alert ONLY when a
// meaningful condition exists. Alert spam is a design failure —
// a quiet project produces ZERO alerts.
//
// Every alert carries, per the Stage 9 contract:
//   - evidence (the recorded rows behind it — traceable)
//   - timestamp (detectedAt / lastSeenAt)
//   - confidence (deterministic, computed from data coverage,
//     freshness and verification — never a guess)
//   - severity (low / medium / high)
//   - affected project
//   - recommended action
//
// Reconciliation rules (no duplicates, no zombies):
//   - Same condition, still true → the SAME alert is refreshed
//     (lastSeenAt), never duplicated.
//   - Condition gone → the alert is resolved (stale alerts
//     expire with the condition that created them).
//   - Dismissed stays dismissed while the condition is unchanged;
//     it re-opens ONLY if the condition escalates.
//   - A resolved alert whose condition returns is re-opened.
//
// Honesty rules:
//   - "Completed" claims derive ONLY from recorded stage
//     completions — never from the user-entered progress
//     percentage (which may be stale).
//   - Thresholds are configuration, not scattered magic
//     numbers (MONITORING_RULES below).
//   - A project whose records claim "completed" with
//     incomplete stages is flagged as a data-quality alert —
//     the system does not propagate a false completed state.
// =========================================================

import { supabase } from "@/lib/supabase";
import type { AgentResult } from "./types";
import { assertProjectVisible, recordActivity } from "./session";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import type {
  ConfidenceAssessment,
  Evidence,
  PredictiveProjectSnapshot,
  ShoppingItemWithActual,
} from "@/lib/predictive-intelligence/types";
import {
  estimateTimeline,
  recordedSpend,
  unpurchasedEstimatedTotal,
} from "@/lib/predictive-intelligence/spend";
import { detectProjectChanges, type ChangeDetectionResult } from "./changes";

// ---------------------------------------------------------
// Configuration — one place, no scattered magic numbers.
// ---------------------------------------------------------

export const MONITORING_RULES = {
  /** Alert when projected total exceeds the latest recorded
   *  estimate by this fraction or more. */
  budgetOverrunPct: 0.1,
  /** Overshoot at which the budget alert becomes HIGH. */
  budgetOverrunHighPct: 0.25,
  /** Days without any project-record update before the data is
   *  flagged as stale. */
  staleDataDays: 14,
  /** Days without progress (no completed stages, no updates)
   *  before an in-progress project is flagged as stalled. */
  stalledProjectDays: 21,
  /** Days a purchased item may go without a recorded actual
   *  price before it is flagged. */
  missingActualPriceDays: 7,
} as const;

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------

export type AlertKind =
  | "budget"
  | "schedule"
  | "data_quality"
  | "stale_data"
  | "material_requirement"
  | "project_change";

export type AlertSeverity = "low" | "medium" | "high";
export type AlertStatus = "open" | "dismissed" | "resolved";

export interface AlertCandidate {
  /** Stable key — the same condition maps to the same key, so
   *  re-runs refresh instead of duplicating. */
  alertKey: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  /** The measured condition, in plain language with the numbers. */
  condition: string;
  recommendedAction: string;
  evidence: Evidence[];
  confidence: ConfidenceAssessment;
  payload: Record<string, unknown>;
}

export interface AlertRow {
  id: string;
  project_id: string;
  alert_key: string;
  kind: AlertKind;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  condition_text: string;
  recommended_action: string;
  evidence: Evidence[];
  confidence: ConfidenceAssessment;
  payload: Record<string, unknown>;
  detected_at: string;
  last_seen_at: string;
  dismissed_at: string | null;
  resolved_at: string | null;
}

export interface MonitoringReconciliation {
  created: AlertCandidate[];
  /** Refreshed open alerts (condition persisted). */
  refreshed: Array<{ existing: AlertRow; candidate: AlertCandidate }>;
  /** Dismissed alerts whose condition ESCALATED — re-opened. */
  reopened: Array<{ existing: AlertRow; candidate: AlertCandidate }>;
  /** Dismissed alerts whose condition persisted unchanged. */
  stillDismissed: Array<{ existing: AlertRow; candidate: AlertCandidate }>;
  /** Alerts whose condition cleared — expired with it. */
  resolved: AlertRow[];
}

export interface MonitoringResult {
  projectId: string;
  evaluatedAt: string;
  /** Alerts open right now (after this run). */
  openAlerts: Array<AlertRow>;
  counts: {
    created: number;
    refreshed: number;
    reopened: number;
    resolved: number;
    stillDismissed: number;
  };
  summary: string;
}

// ---------------------------------------------------------
// Deterministic confidence — data coverage, freshness, verification.
// ---------------------------------------------------------

function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.floor(ms / 86_400_000);
}

function coverageConfidence(
  snap: PredictiveProjectSnapshot,
  nowIso: string,
): ConfidenceAssessment {
  const items = snap.shoppingItems;
  const priced = items.filter((i) => i.estimated_price > 0).length;
  const priceCoverage = items.length === 0 ? 0 : priced / items.length;
  const hasStages = snap.stages.length > 0;
  const fresh =
    daysBetween(snap.project.updatedAt, nowIso) <=
    MONITORING_RULES.staleDataDays;
  const stagesPart = hasStages ? 0.3 : 0;
  const pricePart = 0.4 * priceCoverage;
  const freshPart = fresh ? 0.3 : 0;
  const score = stagesPart + pricePart + freshPart;
  const band = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";
  return {
    score: Number(score.toFixed(2)),
    band,
    method: `Computed from data coverage: stages recorded (${hasStages ? "yes" : "no"}, 0.3), material price coverage ${priced}/${items.length || 0} lines (0.4), project record updated within ${MONITORING_RULES.staleDataDays} days (0.3).`,
  };
}

function itemEvidence(item: ShoppingItemWithActual, label: string): Evidence {
  return {
    kind: "shopping_item",
    id: item.id,
    label,
    recordedAt: item.updated_at ?? null,
    verification: "user_recorded",
  };
}

// ---------------------------------------------------------
// Condition evaluation — pure, snapshot + changes in, alerts out.
// ---------------------------------------------------------

export function evaluateMonitoringAlerts(
  snap: PredictiveProjectSnapshot,
  changes: ChangeDetectionResult | null,
  nowIso: string,
): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  const confidence = coverageConfidence(snap, nowIso);
  const daysSinceUpdate = daysBetween(snap.project.updatedAt, nowIso);

  // --- 1. Budget: projected total vs latest recorded estimate.
  const timeline = estimateTimeline(snap.calculations);
  const latestEstimate =
    timeline.length > 0 ? timeline[timeline.length - 1] : null;
  if (latestEstimate) {
    const projected =
      recordedSpend(snap.shoppingItems) +
      unpurchasedEstimatedTotal(snap.shoppingItems);
    const overrunPct =
      (projected - latestEstimate.total) / latestEstimate.total;
    if (overrunPct >= MONITORING_RULES.budgetOverrunPct) {
      const high = overrunPct >= MONITORING_RULES.budgetOverrunHighPct;
      alerts.push({
        alertKey: "budget:overrun",
        kind: "budget",
        severity: high ? "high" : "medium",
        title: high ? "Budget overrun risk (high)" : "Budget overrun risk",
        condition: `Recorded spend plus remaining planned spend projects to ₦${projected.toLocaleString()}, which is ${(overrunPct * 100).toFixed(1)}% above the latest recorded estimate of ₦${latestEstimate.total.toLocaleString()} ("${latestEstimate.title}").`,
        recommendedAction:
          "Re-estimate the remaining lines (or re-run the calculation) with the recorded actual prices, and adjust the budget or scope before the next purchases.",
        evidence: [
          {
            kind: "calculation",
            id: latestEstimate.id,
            label: `Recorded estimate "${latestEstimate.title}" (₦${latestEstimate.total.toLocaleString()})`,
            recordedAt: latestEstimate.createdAt,
            verification: "user_recorded",
          },
          ...snap.shoppingItems
            .filter((i) => !i.is_purchased)
            .slice(0, 5)
            .map((i) =>
              itemEvidence(
                i,
                `Unpurchased line "${i.name}" (₦${(i.quantity * i.estimated_price).toLocaleString()} estimated)`,
              ),
            ),
        ],
        confidence,
        payload: {
          projectedTotal: projected,
          latestEstimateTotal: latestEstimate.total,
          overrunPct: Number(overrunPct.toFixed(4)),
        },
      });
    }
  }

  // --- 2. False completed state: status says completed, recorded stages don't.
  const incompleteStages = snap.stages.filter((s) => !s.isCompleted);
  if (snap.project.status === "completed" && incompleteStages.length > 0) {
    alerts.push({
      alertKey: "data_quality:false_completed",
      kind: "data_quality",
      severity: "high",
      title: "Project marked completed with incomplete stages",
      condition: `The project record says "completed", but ${incompleteStages.length} of ${snap.stages.length} recorded construction stage(s) are incomplete: ${incompleteStages.map((s) => s.stageName).join(", ")}.`,
      recommendedAction:
        "Either complete the remaining stages' records or correct the project status — a completed status with incomplete stages misrepresents the recorded progress.",
      evidence: incompleteStages.map((s) => ({
        kind: "progress_stage" as const,
        id: s.id,
        label: `Stage "${s.stageName}" — recorded incomplete`,
        recordedAt: s.updatedAt,
        verification: "user_recorded" as const,
      })),
      confidence,
      payload: {
        incompleteStageCount: incompleteStages.length,
        totalStages: snap.stages.length,
      },
    });
  }

  // --- 3. Stalled project: in progress, zero completed stages, no updates.
  const completedCount = snap.stages.filter((s) => s.isCompleted).length;
  const latestItemUpdate = snap.shoppingItems.reduce<string | null>(
    (max, i) =>
      i.updated_at && (!max || i.updated_at > max) ? i.updated_at : max,
    null,
  );
  const lastActivity =
    [snap.project.updatedAt, latestItemUpdate]
      .filter((x): x is string => x !== null)
      .sort()
      .pop() ?? snap.project.updatedAt;
  const daysSinceActivity = daysBetween(lastActivity, nowIso);
  if (
    snap.project.status === "in_progress" &&
    snap.stages.length > 0 &&
    completedCount === 0 &&
    daysSinceActivity >= MONITORING_RULES.stalledProjectDays
  ) {
    alerts.push({
      alertKey: "schedule:stalled",
      kind: "schedule",
      severity: "medium",
      title: "Project appears stalled",
      condition: `The project is in progress with ${snap.stages.length} planned stage(s), but no stage completion is recorded and there has been no recorded activity for ${daysSinceActivity} days.`,
      recommendedAction:
        "Record current progress (stage completions, purchases) or update the plan — a project with no recorded movement needs either data or a decision.",
      evidence: snap.stages.map((s) => ({
        kind: "progress_stage" as const,
        id: s.id,
        label: `Planned stage "${s.stageName}" — not completed`,
        recordedAt: s.updatedAt,
        verification: "user_recorded" as const,
      })),
      confidence,
      payload: { daysSinceActivity, plannedStages: snap.stages.length },
    });
  }

  // --- 4. Stale data: in-progress project with an outdated record.
  if (
    snap.project.status === "in_progress" &&
    daysSinceUpdate >= MONITORING_RULES.staleDataDays
  ) {
    alerts.push({
      alertKey: "stale_data:no_updates",
      kind: "stale_data",
      severity: "low",
      title: "Project records are stale",
      condition: `The project is in progress but its record has not been updated for ${daysSinceUpdate} days — budget, schedule and requirement analysis may be running on outdated information.`,
      recommendedAction:
        "Update the project records (progress, prices, purchases) so analyses reflect the current state of the build.",
      evidence: [
        {
          kind: "project_record",
          id: undefined,
          label: `Project record last updated ${snap.project.updatedAt.split("T")[0]}`,
          recordedAt: snap.project.updatedAt,
          verification: "user_recorded",
        },
      ],
      confidence,
      payload: { daysSinceUpdate },
    });
  }

  // --- 5. Purchased items missing actual prices.
  const unpricedPurchases = snap.shoppingItems.filter(
    (i) =>
      i.is_purchased &&
      (i.actual_price === null || !Number.isFinite(i.actual_price)) &&
      i.updated_at !== undefined &&
      daysBetween(i.updated_at, nowIso) >=
        MONITORING_RULES.missingActualPriceDays,
  );
  if (unpricedPurchases.length > 0) {
    alerts.push({
      alertKey: "data_quality:missing_actual_prices",
      kind: "data_quality",
      severity: "medium",
      title: "Purchases without recorded actual prices",
      condition: `${unpricedPurchases.length} purchased material line(s) have no recorded actual price${unpricedPurchases.length === 1 ? "" : "s"} (older than ${MONITORING_RULES.missingActualPriceDays} days): ${unpricedPurchases.map((i) => `"${i.name}"`).join(", ")}. Recorded spend for these lines is an estimate-based proxy.`,
      recommendedAction:
        "Record the actual prices paid so recorded spend reflects reality instead of a proxy.",
      evidence: unpricedPurchases.map((i) =>
        itemEvidence(
          i,
          `Purchased line "${i.name}" — actual price not recorded`,
        ),
      ),
      confidence,
      payload: { unpricedPurchaseIds: unpricedPurchases.map((i) => i.id) },
    });
  }

  // --- 6. Change-driven alerts (from Stage 8).
  if (changes && changes.status === "ok") {
    const priceIncreases = changes.changes.filter(
      (c) =>
        c.id.endsWith(":estimated_price") && !c.id.endsWith(":actual_price"),
    );
    if (priceIncreases.length > 0) {
      alerts.push({
        alertKey: "material:price_increases",
        kind: "material_requirement",
        severity: priceIncreases.some((c) => c.severity === "major")
          ? "high"
          : "medium",
        title: "Material prices increased since the last check",
        condition: `${priceIncreases.length} material line(s) show recorded estimated-price increases since ${changes.baselineCapturedAt?.split("T")[0] ?? "the last baseline"}: ${priceIncreases.map((c) => c.whatChanged).join(" ")}`,
        recommendedAction:
          "Re-check the affected line estimates against current market prices and adjust the remaining budget before purchasing.",
        evidence: priceIncreases.flatMap((c) => c.evidence),
        confidence,
        payload: { changeIds: priceIncreases.map((c) => c.id) },
      });
    }

    const majorNonPrice = changes.changes.filter(
      (c) => c.severity === "major" && c.category !== "price",
    );
    if (majorNonPrice.length > 0) {
      alerts.push({
        alertKey: "project:major_changes",
        kind: "project_change",
        severity: "high",
        title: "Major change(s) detected in project records",
        condition: `${majorNonPrice.length} major change(s) were detected since ${changes.baselineCapturedAt?.split("T")[0] ?? "the last baseline"} — the recorded state moved in ways that should be verified: ${majorNonPrice.map((c) => c.whatChanged).join(" ")}`,
        recommendedAction:
          "Review the flagged changes and confirm they were intentional — major movements in recorded state (regressions, removals, scope growth) deserve a human decision.",
        evidence: majorNonPrice.flatMap((c) => c.evidence),
        confidence,
        payload: { changeIds: majorNonPrice.map((c) => c.id) },
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------
// Reconciliation — the anti-spam, anti-zombie core.
// ---------------------------------------------------------

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function reconcileAlerts(
  existing: AlertRow[],
  candidates: AlertCandidate[],
  nowIso: string,
): MonitoringReconciliation {
  const byKey = new Map(existing.map((r) => [r.alert_key, r]));
  const candidateKeys = new Set(candidates.map((c) => c.alertKey));

  const plan: MonitoringReconciliation = {
    created: [],
    refreshed: [],
    reopened: [],
    stillDismissed: [],
    resolved: [],
  };

  for (const c of candidates) {
    const row = byKey.get(c.alertKey);
    if (!row) {
      plan.created.push(c);
      continue;
    }
    if (row.status === "dismissed") {
      // Dismissed stays dismissed — UNLESS the condition escalated.
      if (SEVERITY_RANK[c.severity] > SEVERITY_RANK[row.severity]) {
        plan.reopened.push({ existing: row, candidate: c });
      } else {
        plan.stillDismissed.push({ existing: row, candidate: c });
      }
      continue;
    }
    if (row.status === "resolved") {
      // Condition returned after resolving — re-open it.
      plan.reopened.push({ existing: row, candidate: c });
      continue;
    }
    plan.refreshed.push({ existing: row, candidate: c });
  }

  // Open/dismissed alerts whose condition vanished expire now.
  for (const row of existing) {
    if (!candidateKeys.has(row.alert_key) && row.status !== "resolved") {
      plan.resolved.push(row);
    }
  }

  return plan;
}

// ---------------------------------------------------------
// Persistence + orchestrator.
// ---------------------------------------------------------

function persistError(step: string, message: string): AgentResult<never> {
  return {
    ok: false,
    error: { code: "persistence_error", message: `${step}: ${message}` },
  };
}

function candidateToRow(
  projectId: string,
  c: AlertCandidate,
  nowIso: string,
): Omit<AlertRow, "id"> {
  return {
    project_id: projectId,
    alert_key: c.alertKey,
    kind: c.kind,
    severity: c.severity,
    status: "open",
    title: c.title,
    condition_text: c.condition,
    recommended_action: c.recommendedAction,
    evidence: c.evidence,
    confidence: c.confidence,
    payload: c.payload,
    detected_at: nowIso,
    last_seen_at: nowIso,
    dismissed_at: null,
    resolved_at: null,
  };
}

async function loadAlerts(projectId: string): Promise<AgentResult<AlertRow[]>> {
  try {
    const { data, error } = await supabase
      .from("project_agent_alerts")
      .select("*")
      .eq("project_id", projectId);
    if (error) return persistError("Alert load failed", error.message);
    return { ok: true, data: (data ?? []) as AlertRow[] };
  } catch (e) {
    return persistError("Alert load failed", String(e));
  }
}

async function applyReconciliation(
  projectId: string,
  plan: MonitoringReconciliation,
  nowIso: string,
): Promise<AgentResult<true>> {
  try {
    for (const c of plan.created) {
      const { error } = await supabase
        .from("project_agent_alerts")
        .insert(candidateToRow(projectId, c, nowIso));
      if (error) return persistError("Alert insert failed", error.message);
    }
    for (const { existing, candidate } of [
      ...plan.refreshed,
      ...plan.reopened,
    ]) {
      const { error } = await supabase
        .from("project_agent_alerts")
        .update({
          kind: candidate.kind,
          severity: candidate.severity,
          title: candidate.title,
          condition_text: candidate.condition,
          recommended_action: candidate.recommendedAction,
          evidence: candidate.evidence,
          confidence: candidate.confidence,
          payload: candidate.payload,
          status: "open",
          last_seen_at: nowIso,
          dismissed_at: null,
          resolved_at: null,
        })
        .eq("id", existing.id);
      if (error) return persistError("Alert update failed", error.message);
    }
    for (const row of plan.resolved) {
      const { error } = await supabase
        .from("project_agent_alerts")
        .update({ status: "resolved", resolved_at: nowIso })
        .eq("id", row.id);
      if (error) return persistError("Alert resolve failed", error.message);
    }
    // Dismissed-but-persisting conditions: keep the dismissal, just
    // note that the condition was still seen.
    for (const { existing } of plan.stillDismissed) {
      const { error } = await supabase
        .from("project_agent_alerts")
        .update({ last_seen_at: nowIso, payload: existing.payload })
        .eq("id", existing.id);
      if (error) return persistError("Alert refresh failed", error.message);
    }
    return { ok: true, data: true as const };
  } catch (e) {
    return persistError("Alert persistence failed", String(e));
  }
}

export async function runProactiveMonitoring(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<MonitoringResult>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  let snap: PredictiveProjectSnapshot;
  try {
    const s = await buildProjectSnapshot(projectId, { now: nowIso });
    if (!s)
      return persistError(
        "Snapshot build failed",
        "The recorded project state could not be read.",
      );
    snap = s;
  } catch (e) {
    return persistError("Snapshot build failed", String(e));
  }

  // Stage 8 change detection runs as part of the evaluation — its
  // result feeds the change-driven alerts.
  const changes = await detectProjectChanges(projectId, nowIso);
  if (!changes.ok) return changes;

  const candidates = evaluateMonitoringAlerts(snap, changes.data, nowIso);
  const existing = await loadAlerts(projectId);
  if (!existing.ok) return existing;

  const plan = reconcileAlerts(existing.data, candidates, nowIso);
  const applied = await applyReconciliation(projectId, plan, nowIso);
  if (!applied.ok) return applied;

  // Re-read is unnecessary: compute the post-run open set from the plan.
  const dismissedKeys = new Set(
    plan.stillDismissed.map(({ existing }) => existing.alert_key),
  );
  const openAlerts: AlertRow[] = [
    ...plan.created.map((c) => ({
      ...candidateToRow(projectId, c, nowIso),
      id: "new",
    })),
    ...[...plan.refreshed, ...plan.reopened].map(({ existing, candidate }) => ({
      ...existing,
      kind: candidate.kind,
      severity: candidate.severity,
      title: candidate.title,
      status: "open" as const,
      last_seen_at: nowIso,
    })),
    ...existing.data.filter(
      (r) =>
        r.status === "open" &&
        !plan.refreshed.some(({ existing: x }) => x.id === r.id) &&
        !plan.resolved.some((x) => x.id === r.id) &&
        !dismissedKeys.has(r.alert_key),
    ),
  ];

  const counts = {
    created: plan.created.length,
    refreshed: plan.refreshed.length,
    reopened: plan.reopened.length,
    resolved: plan.resolved.length,
    stillDismissed: plan.stillDismissed.length,
  };

  const total =
    counts.created + counts.refreshed + counts.reopened + counts.resolved;
  const summary =
    total === 0
      ? "Monitoring run: no meaningful conditions — no alerts raised or changed."
      : `Monitoring run: ${counts.created} new, ${counts.refreshed} refreshed, ${counts.reopened} re-opened, ${counts.resolved} resolved.${counts.stillDismissed > 0 ? ` ${counts.stillDismissed} dismissed alert(s) remain dismissed.` : ""}`;

  await recordActivity(
    projectId,
    {
      kind: "analysis",
      state: "observed",
      summary,
      payload: {
        openCount: openAlerts.length,
        ...counts,
      },
    },
    nowIso,
  );

  return {
    ok: true,
    data: {
      projectId,
      evaluatedAt: nowIso,
      openAlerts,
      counts,
      summary,
    },
  };
}

// ---------------------------------------------------------
// User actions on alerts — dismissal is a HUMAN decision.
// ---------------------------------------------------------

/** Dismiss an open alert. The condition's next occurrence at the
 *  same severity stays dismissed; an escalation re-opens it. */
export async function dismissProjectAlert(
  alertId: string,
  nowIso: string,
): Promise<AgentResult<true>> {
  try {
    const { data, error } = await supabase
      .from("project_agent_alerts")
      .update({ status: "dismissed", dismissed_at: nowIso })
      .eq("id", alertId)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (error) return persistError("Alert dismiss failed", error.message);
    if (!data)
      return persistError(
        "Alert dismiss failed",
        "The alert is not open (already dismissed or resolved) or is not visible to this account.",
      );
    return { ok: true, data: true as const };
  } catch (e) {
    return persistError("Alert dismiss failed", String(e));
  }
}

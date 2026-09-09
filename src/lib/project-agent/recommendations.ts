// =========================================================
// FRELUX PROJECT AGENT, RECOMMENDATION ENGINE (Stage 4)
//
// Proactive intelligence: identifies meaningful conditions in the
// project state, budget risk, schedule risk, missing information,
// conflicting measurements, stale market data, procurement risk,
// quantity changes, forecast changes, incomplete tasks and
// project blockers.
//
// Hard rules:
//   1. Recommendations are DERIVED from recorded project state :
//      the deterministic Predictive Intelligence analysis (risk
//      register, OAR recommendations, data quality), the Stage-2
//      controlled context (gaps, conflicts) and the project
//      snapshot. Nothing is invented; progress, purchases and
//      site conditions are never assumed.
//   2. Every recommendation carries ALL required fields:
//      recommendation, evidence, affected element, severity,
//      confidence, assumptions, data freshness, next step.
//   3. Where evidence is insufficient for a condition, the
//      condition is reported as INSUFFICIENT DATA with the
//      honest reason, never a fabricated recommendation, and
//      never another project's or region's data.
//   4. Confidence and freshness are computed by the existing
//      deterministic helpers, never guessed.
// =========================================================

import { assertProjectVisible } from "./session";
import { formatMoney } from "./region";
import type { AgentResult } from "./types";
import {
  buildProjectAgentContext,
  type ProjectAgentContext,
} from "./context";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";
import { analyzeProject } from "@/lib/predictive-intelligence/analysis";
import type {
  ProjectPredictiveAnalysis,
  RiskItem,
  ConfidenceAssessment,
  DataFreshness,
} from "@/lib/predictive-intelligence/types";
import {
  classifyFreshness,
  worstFreshness,
  assessConfidence,
} from "@/lib/predictive-intelligence/freshness";
import { linesWithRecordedPriceIncrease } from "@/lib/predictive-intelligence/spend";

// =========================================================
// Types, the agent recommendation contract
// =========================================================

export type RecommendationCondition =
  | "budget_risk"
  | "schedule_risk"
  | "missing_information"
  | "conflicting_measurements"
  | "stale_market_data"
  | "procurement_risk"
  | "quantity_change"
  | "forecast_change"
  | "incomplete_task"
  | "project_blocker";

export type RecommendationSeverity = "low" | "medium" | "high" | "critical";

export const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface AgentRecommendation {
  id: string;
  condition: RecommendationCondition;
  /** What the agent recommends (the headline). */
  recommendation: string;
  /** Concrete recorded facts the recommendation rests on. */
  evidence: string[];
  /** Which project element is affected (budget, stage, material…). */
  affectedElement: string;
  severity: RecommendationSeverity;
  /** Deterministic confidence, never guessed. */
  confidence: ConfidenceAssessment | null;
  /** Explicit, visible assumptions. */
  assumptions: string[];
  /** Freshness of the data behind this recommendation. */
  dataFreshness: DataFreshness;
  /** When the underlying data was last recorded. */
  freshnessBasis: string;
  /** The recommended next step (decision support, not a command). */
  nextStep: string;
  /** Traceability, which engine output produced this. */
  source: string;
}

export interface InsufficientCondition {
  condition: RecommendationCondition;
  reason: string;
}

export interface RecommendationReport {
  projectId: string;
  generatedAt: string;
  status: "ok" | "insufficient_data";
  recommendations: AgentRecommendation[];
  /** Conditions that could NOT be assessed, with honest reasons. */
  insufficientData: InsufficientCondition[];
  summary: string;
}

// =========================================================
// Entry point
// =========================================================

export async function buildRecommendations(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<RecommendationReport>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  // Authoritative recorded state (RLS-scoped).
  const snapshot = await buildProjectSnapshot(projectId, { now: nowIso });
  if (!snapshot) {
    return {
      ok: true,
      data: {
        projectId,
        generatedAt: nowIso,
        status: "insufficient_data",
        recommendations: [],
        insufficientData: ALL_CONDITIONS.map((condition) => ({
          condition,
          reason: "no recorded project data could be loaded for this project",
        })),
        summary:
          "INSUFFICIENT DATA, the project could not be assessed because no recorded project state could be loaded. No recommendations were fabricated.",
      },
    };
  }

  // Stage-2 controlled context (gaps + conflicts, deterministic) and
  // the deterministic analysis (risk register + OAR + data quality).
  const context = await buildProjectAgentContext(projectId, nowIso);
  const analysis = context.ok ? context.data.analysis : analyzeProject(snapshot);

  const recommendations: AgentRecommendation[] = [];
  const insufficientData: InsufficientCondition[] = [];

  // Risk-register conditions (budget / schedule / procurement /
  // blockers) come from the deterministic analysis, verbatim.
  collectRiskConditions(
    analysis,
    snapshot,
    nowIso,
    recommendations,
    insufficientData,
  );
  collectMissingInformation(context.ok ? context.data : null, recommendations);
  collectConflictingMeasurements(
    context.ok ? context.data : null,
    recommendations,
  );
  collectIncompleteTasks(snapshot, analysis, recommendations, insufficientData);
  collectStaleMarketData(snapshot, nowIso, recommendations, insufficientData);
  collectProcurementPriceIncreases(snapshot, analysis, recommendations);
  collectQuantityChanges(snapshot, recommendations);
  collectForecastChanges(snapshot, nowIso, recommendations, insufficientData);

  // Deterministic ordering: worst severity first, then condition.
  recommendations.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.condition.localeCompare(b.condition) ||
      a.id.localeCompare(b.id),
  );

  const summary =
    recommendations.length === 0
      ? "No risk conditions identified from the recorded project state. Data quality and any coverage limitations are reported, absence of a recommendation is not a guarantee."
      : `${recommendations.length} recommendation(s) derived from recorded project state: ${[...new Set(recommendations.map((r) => r.condition))].join(", ")}. ${
          insufficientData.length > 0
            ? `${insufficientData.length} condition(s) could not be assessed and are reported as INSUFFICIENT DATA.`
            : ""
        }`.trim();

  return {
    ok: true,
    data: {
      projectId,
      generatedAt: nowIso,
      status: "ok",
      recommendations,
      insufficientData,
      summary,
    },
  };
}

const ALL_CONDITIONS: RecommendationCondition[] = [
  "budget_risk",
  "schedule_risk",
  "missing_information",
  "conflicting_measurements",
  "stale_market_data",
  "procurement_risk",
  "quantity_change",
  "forecast_change",
  "incomplete_task",
  "project_blocker",
];

// =========================================================
// 1. Risk-register conditions, verbatim from the analysis
// =========================================================

/** Risk category → agent condition (deterministic mapping). */
export function riskCondition(category: RiskItem["category"]): RecommendationCondition {
  switch (category) {
    case "Cost":
      return "budget_risk";
    case "Schedule":
      return "schedule_risk";
    case "Procurement":
      return "procurement_risk";
    case "Market":
      return "stale_market_data";
    case "Data quality":
      return "missing_information";
    case "Construction progress":
      return "incomplete_task";
  }
}

function riskSeverity(severity: RiskItem["severity"]): RecommendationSeverity {
  return severity === "high" ? "high" : severity === "medium" ? "medium" : "low";
}

function collectRiskConditions(
  analysis: ProjectPredictiveAnalysis | null,
  snapshot: PredictiveProjectSnapshot,
  nowIso: string,
  out: AgentRecommendation[],
  insufficient: InsufficientCondition[],
): void {
  const risks = analysis?.risks ?? [];
  const recs = new Map<string, ProjectPredictiveAnalysis["recommendations"][number]>();
  for (const rec of analysis?.recommendations ?? []) {
    recs.set(rec.riskId, rec);
  }

  for (const risk of risks) {
    const oar = recs.get(risk.id);
    const freshness = classifyFreshness(risk.updatedAt, nowIso);
    out.push({
      id: `risk:${risk.id}`,
      condition: riskCondition(risk.category),
      recommendation: oar
        ? `${risk.title}, ${oar.analysis}`
        : risk.title,
      evidence: risk.evidence.map(
        (e) => `${e.label}${e.recordedAt ? ` (recorded ${e.recordedAt.split("T")[0]})` : ""} [${e.verification}]`,
      ),
      affectedElement: risk.affectedArea,
      severity: riskSeverity(risk.severity),
      confidence: risk.confidence,
      assumptions: [
        ...(risk.probability ? [`Probability basis: ${risk.probability.basis}`] : []),
        ...(oar ? [`Observation: ${oar.observation}`] : []),
      ],
      dataFreshness: freshness,
      freshnessBasis: risk.updatedAt,
      nextStep: oar?.recommendation ?? risk.recommendedAction,
      source: `risk-register (${risk.id})`,
    });
  }

  // If the risk register produced nothing, that is a recorded
  // absence, conditions stay assessable only where data exists.
  if (risks.length === 0) {
    insufficient.push({
      condition: "project_blocker",
      reason:
        "no open risks recorded in the project risk register, no blocker was invented",
    });
  }
}

// =========================================================
// 2. Missing information, from Stage-2 context gaps
// =========================================================

function collectMissingInformation(
  context: ProjectAgentContext | null,
  out: AgentRecommendation[],
): void {
  if (!context) return;
  const gaps = context.gaps.filter((g) => g.area !== "market_data");
  if (gaps.length === 0) return;

  const byArea = new Map<string, string[]>();
  for (const gap of gaps) {
    const list = byArea.get(gap.area) ?? [];
    list.push(gap.reason);
    byArea.set(gap.area, list);
  }

  for (const [area, reasons] of byArea) {
    out.push({
      id: `missing:${area}`,
      condition: "missing_information",
      recommendation: `Missing recorded information in "${area}" limits what the agent can assess.`,
      evidence: reasons.map((r) => `Gap: ${r}`),
      affectedElement: area,
      severity: "low",
      confidence: {
        score: 1,
        band: "high",
        method: "Absence of a recorded value is directly observed, certainty about the gap itself.",
      },
      assumptions: [],
      dataFreshness: "unavailable",
      freshnessBasis: context.generatedAt,
      nextStep: `Record ${area} data in FRELUX so analysis can use it, the agent will not guess or substitute a value.`,
      source: "context gaps (Stage-2 controlled context)",
    });
  }
}

// =========================================================
// 3. Conflicting measurements, both values reported
// =========================================================

function collectConflictingMeasurements(
  context: ProjectAgentContext | null,
  out: AgentRecommendation[],
): void {
  if (!context) return;
  // Coverage "conflicts" are missing information, not conflicts
  // of values, those are handled by the gaps collector above.
  const conflicts = context.conflicts.filter(
    (c) => !c.key.startsWith("coverage:"),
  );
  for (const conflict of conflicts) {
    out.push({
      id: `conflict:${conflict.key}`,
      condition: "conflicting_measurements",
      recommendation: `Conflicting recorded values detected: ${conflict.description}`,
      evidence: [conflict.description, `Agent policy: ${conflict.resolution}`],
      affectedElement: conflict.key,
      severity: "medium",
      confidence: {
        score: 1,
        band: "high",
        method: "Both conflicting values are directly recorded, the conflict itself is certain.",
      },
      assumptions: [conflict.resolution],
      dataFreshness: "current",
      freshnessBasis: context.generatedAt,
      nextStep:
        "Verify which recorded value is correct and update the other record, the agent will not silently pick one.",
      source: "context conflicts (Stage-2 controlled context)",
    });
  }
}

// =========================================================
// 4. Incomplete tasks, recorded stages only
// =========================================================

function collectIncompleteTasks(
  snapshot: PredictiveProjectSnapshot,
  analysis: ProjectPredictiveAnalysis | null,
  out: AgentRecommendation[],
  insufficient: InsufficientCondition[],
): void {
  // The risk register already reports progress problems with its
  // own severity, do not double-report the same condition.
  const hasProgressRisk = (analysis?.risks ?? []).some(
    (r) => r.category === "Construction progress",
  );

  if (snapshot.stages.length === 0) {
    insufficient.push({
      condition: "incomplete_task",
      reason:
        "no progress stages recorded for this project, task state is unknown, not assumed",
    });
    return;
  }

  const pending = snapshot.stages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((s) => !s.isCompleted);

  if (pending.length === 0 || hasProgressRisk) return;

  const done = snapshot.stages.length - pending.length;
  const next = pending[0];
  out.push({
    id: "tasks:pending",
    condition: "incomplete_task",
    recommendation: `${pending.length} of ${snapshot.stages.length} recorded stages are incomplete; next pending stage is "${next.stageName}".`,
    evidence: [
      `Completed stages: ${done}/${snapshot.stages.length}`,
      `Next pending (sort order ${next.sortOrder}): ${next.stageName}`,
      ...(next.updatedAt
        ? [`Stage record last updated ${next.updatedAt.split("T")[0]}`]
        : []),
    ],
    affectedElement: `progress stage: ${next.stageName}`,
    severity: pending.length === snapshot.stages.length ? "medium" : "low",
    confidence: assessConfidence({
      coverage: 1,
      freshness: classifyFreshness(next.updatedAt, snapshot.now),
      verifiedShare: 1,
      context: "incomplete task assessment",
    }),
    assumptions: [
      "Stage completion state is as recorded, no site condition is inferred.",
    ],
    dataFreshness: classifyFreshness(next.updatedAt, snapshot.now),
    freshnessBasis: next.updatedAt,
    nextStep: `When "${next.stageName}" is finished, record its completion (with photo/timestamp evidence) so schedule analysis stays grounded.`,
    source: "project_progress_stages (recorded state)",
  });
}

// =========================================================
// 5. Stale market data, the project's OWN market only
// =========================================================

function collectStaleMarketData(
  snapshot: PredictiveProjectSnapshot,
  nowIso: string,
  out: AgentRecommendation[],
  insufficient: InsufficientCondition[],
): void {
  const prices = snapshot.marketPrices;
  if (prices.length === 0) {
    insufficient.push({
      condition: "stale_market_data",
      reason: `no approved market prices recorded for this project's market (${snapshot.region.marketCode ?? snapshot.region.countryCode ?? "no market confirmed"}), NO other region's data was substituted`,
    });
    return;
  }

  const oldest = prices
    .map((p) => p.collectedAt)
    .sort()
    .find(Boolean);
  const freshness = worstFreshness(prices.map((p) => p.collectedAt), nowIso);
  if (freshness === "current") return;

  const days = oldest ? Math.round((new Date(nowIso).getTime() - new Date(oldest).getTime()) / 86_400_000) : null;
  out.push({
    id: "market:stale",
    condition: "stale_market_data",
    recommendation: `Market price data for this project's market is ${freshness}${days !== null ? ` (oldest record ${days} days old)` : ""}.`,
    evidence: prices
      .slice()
      .sort((a, b) => a.collectedAt.localeCompare(b.collectedAt))
      .slice(0, 3)
      .map((p) => `${p.label}: recorded ${p.collectedAt.split("T")[0]} (${p.freshness})`),
    affectedElement: "market price data",
    severity: freshness === "outdated" ? "high" : "medium",
    confidence: assessConfidence({
      coverage: 1,
      freshness,
      verifiedShare: 1,
      context: "market data freshness",
    }),
    assumptions: [
      "Price records are shown exactly as recorded, no price is refreshed, extrapolated or substituted.",
    ],
    dataFreshness: freshness,
    freshnessBasis: oldest ?? nowIso,
    nextStep:
      "Record or verify fresh market price observations for this market so cost analysis reflects current conditions.",
    source: "mi_approved_prices (via project snapshot)",
  });
}

// =========================================================
// 6. Procurement risk, recorded price increases on
//    unpurchased lines
// =========================================================

function collectProcurementPriceIncreases(
  snapshot: PredictiveProjectSnapshot,
  analysis: ProjectPredictiveAnalysis | null,
  out: AgentRecommendation[],
): void {
  // The risk register already reports procurement problems with
  // its own severity, do not double-report.
  if ((analysis?.risks ?? []).some((r) => r.category === "Procurement")) return;

  const increases = linesWithRecordedPriceIncrease(
    snapshot.shoppingItems as never,
  );
  if (increases.length === 0) return;
  const mkt = snapshot.region.marketCode ?? snapshot.region.countryCode;

  out.push({
    id: "procurement:increases",
    condition: "procurement_risk",
    recommendation: `${increases.length} unpurchased material line(s) show recorded price increases, remaining purchases will cost more than estimated.`,
    evidence: increases.map(
      (inc) =>
        `${inc.item.name}: estimated ${formatMoney(inc.estimated, mkt)} → actual ${formatMoney(inc.actual, mkt)} (+${(inc.increasePct * 100).toFixed(1)}%)`,
    ),
    affectedElement: "shopping list (unpurchased lines)",
    severity: increases.length > 2 ? "high" : "medium",
    confidence: assessConfidence({
      coverage: 1,
      freshness: worstFreshness([], snapshot.now),
      verifiedShare: 1,
      context: "recorded price increases",
    }),
    assumptions: [
      "Only lines with a recorded actual price above the recorded estimate are counted, no projected increase is invented.",
    ],
    dataFreshness: classifyFreshness(snapshot.now, snapshot.now),
    freshnessBasis: snapshot.now,
    nextStep:
      "Re-estimate the affected budget lines (or re-run the calculation) with the recorded actual prices so the remaining budget reflects reality.",
    source: "project_shopping_list recorded price increases (spend engine)",
  });
}

// =========================================================
// 7. Quantity changes, re-calculated saved calculations
// =========================================================

function collectQuantityChanges(
  snapshot: PredictiveProjectSnapshot,
  out: AgentRecommendation[],
): void {
  const mkt = snapshot.region.marketCode ?? snapshot.region.countryCode;
  const byType = new Map<string, typeof snapshot.calculations>();
  for (const calc of snapshot.calculations) {
    const list = byType.get(calc.calculatorType) ?? [];
    list.push(calc);
    byType.set(calc.calculatorType, list);
  }

  for (const [type, calcs] of byType) {
    const withTotals = calcs.filter((c) => c.estimatedTotal !== null);
    if (withTotals.length < 2) continue;
    const first = withTotals[0];
    const last = withTotals[withTotals.length - 1];
    if (first.estimatedTotal === last.estimatedTotal) continue;

    out.push({
      id: `quantity:${type}`,
      condition: "quantity_change",
      recommendation: `${type} has been re-calculated with a different total (${first.title} → ${last.title}).`,
      evidence: withTotals.map(
        (c) => `${c.title} (${c.createdAt.split("T")[0]}): ${formatMoney(Number(c.estimatedTotal), mkt)}`,
      ),
      affectedElement: `saved ${type} calculations`,
      severity: "low",
      confidence: assessConfidence({
        coverage: 1,
        freshness: classifyFreshness(last.createdAt, snapshot.now),
        verifiedShare: 1,
        context: "saved calculation history",
      }),
      assumptions: [
        "The most recent saved calculation supersedes older ones for the same calculator, both records are retained.",
      ],
      dataFreshness: classifyFreshness(last.createdAt, snapshot.now),
      freshnessBasis: last.createdAt,
      nextStep:
        "Confirm which calculation reflects the current plan and treat the others as superseded history.",
      source: "project_calculations (recorded history)",
    });
  }
}

// =========================================================
// 8. Forecast changes, recorded market price movements
// =========================================================

function collectForecastChanges(
  snapshot: PredictiveProjectSnapshot,
  nowIso: string,
  out: AgentRecommendation[],
  insufficient: InsufficientCondition[],
): void {
  const mkt = snapshot.region.marketCode ?? snapshot.region.countryCode;
  const history = snapshot.priceHistory;
  if (history.length === 0) {
    insufficient.push({
      condition: "forecast_change",
      reason:
        "no material price changes recorded, forecast drift cannot be assessed, and no price movement was invented",
    });
    return;
  }

  const recent = history.slice(0, 5);
  const increases = recent.filter(
    (h) => h.oldPrice !== null && h.newPrice > h.oldPrice,
  );
  const decreasing = recent.filter(
    (h) => h.oldPrice !== null && h.newPrice < h.oldPrice,
  );

  out.push({
    id: "forecast:price-history",
    condition: "forecast_change",
    recommendation: `${recent.length} recorded material price change(s) affect cost forecasts for this project.`,
    evidence: recent.map(
      (h) =>
        `${h.materialName}: ${h.oldPrice !== null ? `${formatMoney(h.oldPrice, mkt)} → ` : ""}${formatMoney(h.newPrice, mkt)} on ${h.changedAt.split("T")[0]}${h.priceSource ? ` (source: ${h.priceSource})` : ""}`,
    ),
    affectedElement: "material cost forecasts",
    severity: increases.length > 0 && decreasing.length === 0 ? "medium" : "low",
    confidence: assessConfidence({
      coverage: 1,
      freshness: worstFreshness(recent.map((h) => h.changedAt), nowIso),
      verifiedShare: 1,
      context: "recorded price history",
    }),
    assumptions: [
      "Recorded changes are facts about past prices, they are not projections of future prices.",
    ],
    dataFreshness: worstFreshness(recent.map((h) => h.changedAt), nowIso),
    freshnessBasis: recent[0]?.changedAt ?? nowIso,
    nextStep:
      "Re-run affected calculations with current market prices so forecasts reflect the recorded changes.",
    source: "material_price_history (recorded changes)",
  });
}

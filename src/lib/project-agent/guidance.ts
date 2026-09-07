// =========================================================
// FRELUX PROJECT AGENT — "WHAT SHOULD I DO NEXT?" (Stage 5)
//
// Natural project guidance. Answers questions such as:
//   What should I do next?         What is blocking my project?
//   What information is missing?   What should I buy next?
//   What is putting my budget at risk?  Are we behind schedule?
//   What should I verify?          What should I prepare before
//                                 the next construction stage?
//
// Hard rules:
//   1. Every answer is DERIVED from recorded project state —
//      the Stage-4 recommendation engine, the deterministic
//      analysis, the Stage-2 context and the project snapshot.
//      Nothing is invented: no progress, no completed work,
//      no purchases, no site conditions.
//   2. Identical project data produces an identical answer —
//      and answers CHANGE when project data changes.
//   3. Where recorded evidence is insufficient, the answer says
//      INSUFFICIENT DATA with the honest reason — no substitute
//      data, no guess.
// =========================================================

import { assertProjectVisible } from "./session";
import type { AgentResult } from "./types";
import { buildProjectAgentContext, type ProjectAgentContext } from "./context";
import {
  buildProjectSnapshot,
  type PredictiveProjectSnapshot,
} from "@/lib/predictive-intelligence/snapshot";
import { analyzeProject } from "@/lib/predictive-intelligence/analysis";
import type { ProjectPredictiveAnalysis, PredictionResult } from "@/lib/predictive-intelligence/types";
import { buildRecommendations, SEVERITY_ORDER } from "./recommendations";
import type { RecommendationReport } from "./recommendations";

// =========================================================
// Types
// =========================================================

export type GuidanceQuestion =
  | "what_next"
  | "blockers"
  | "missing_info"
  | "what_to_buy"
  | "budget_risk"
  | "schedule"
  | "what_to_verify"
  | "prepare_next_stage";

export const GUIDANCE_QUESTIONS: GuidanceQuestion[] = [
  "what_next",
  "blockers",
  "missing_info",
  "what_to_buy",
  "budget_risk",
  "schedule",
  "what_to_verify",
  "prepare_next_stage",
];

export const GUIDANCE_QUESTION_PHRASES: Record<GuidanceQuestion, string> = {
  what_next: "What should I do next?",
  blockers: "What is blocking my project?",
  missing_info: "What information is missing?",
  what_to_buy: "What should I buy next?",
  budget_risk: "What is putting my budget at risk?",
  schedule: "Are we behind schedule?",
  what_to_verify: "What should I verify?",
  prepare_next_stage: "What should I prepare before the next construction stage?",
};

export interface GuidanceItem {
  /** What the user should do (or know). */
  action: string;
  /** Recorded facts behind this item. */
  evidence: string[];
  /** Priority — derived from underlying severity, never guessed. */
  priority: "high" | "medium" | "low";
  /** Traceability. */
  source: string;
}

export interface GuidanceAnswer {
  projectId: string;
  question: GuidanceQuestion;
  questionPhrase: string;
  generatedAt: string;
  status: "ok" | "insufficient_data";
  /** Direct answer to the question, in one sentence. */
  headline: string;
  items: GuidanceItem[];
  /** Sources the answer was derived from. */
  derivedFrom: string[];
  /** Honest reasons where data was insufficient. */
  insufficientData: string[];
}

// =========================================================
// Natural-language question classification (deterministic)
// =========================================================

// Specific questions first; the generic "what next" LAST so it
// never shadows a more specific ask ("What should I buy next?").
const CLASSIFIER: Array<{ question: GuidanceQuestion; patterns: RegExp[] }> = [
  { question: "prepare_next_stage", patterns: [/prepare.*next.*stage/i, /before.*next.*(construction|stage)/i, /next construction stage/i] },
  { question: "what_to_buy", patterns: [/what.*(should|do).*(i|we).*buy/i, /what to buy/i, /buy next/i, /shopping/i] },
  { question: "what_to_verify", patterns: [/what.*(should|do).*(i|we).*verify/i, /what to verify/i, /verify.*next/i, /double[- ]check/i] },
  { question: "missing_info", patterns: [/what.*(information|info).*(is|’s|'s)? *(missing|needed)/i, /missing information/i, /what don'?t you know/i] },
  { question: "budget_risk", patterns: [/budget.*(risk|at risk|danger)/i, /putting my budget/i, /cost overrun/i, /over budget/i] },
  { question: "blockers", patterns: [/blocking/i, /blocker/i, /stuck/i, /holding.*(up|back)/i] },
  { question: "schedule", patterns: [/behind schedule/i, /on schedule/i, /schedule.*risk/i, /are we (on|behind|ahead)/i, /timeline status/i] },
  { question: "what_next", patterns: [/what('s| is) next/i, /what next/i, /next step/i, /what.*(should|do|can).*(i|we).*do.*next/i] },
];

export function classifyGuidanceQuestion(text: string): GuidanceQuestion | null {
  const t = text.trim();
  for (const { question, patterns } of CLASSIFIER) {
    if (patterns.some((p) => p.test(t))) return question;
  }
  return null;
}

// =========================================================
// Entry point
// =========================================================

export async function buildGuidance(
  projectId: string,
  question: GuidanceQuestion,
  nowIso: string,
): Promise<AgentResult<GuidanceAnswer>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const snapshot = await buildProjectSnapshot(projectId, { now: nowIso });
  if (!snapshot) {
    return {
      ok: true,
      data: {
        projectId,
        question,
        questionPhrase: GUIDANCE_QUESTION_PHRASES[question],
        generatedAt: nowIso,
        status: "insufficient_data",
        headline:
          "INSUFFICIENT DATA — no recorded project state could be loaded for this project, so this question cannot be answered honestly.",
        items: [],
        derivedFrom: [],
        insufficientData: ["no recorded project data could be loaded for this project"],
      },
    };
  }

  const contextResult = await buildProjectAgentContext(projectId, nowIso);
  const context = contextResult.ok ? contextResult.data : null;
  const analysis = context?.analysis ?? analyzeProject(snapshot);
  const reportResult = await buildRecommendations(projectId, nowIso);
  const report = reportResult.ok
    ? reportResult.data
    : null;

  return {
    ok: true,
    data: ANSWERERS[question]({
      snapshot,
      analysis,
      context,
      report,
      nowIso,
    }),
  };
}

interface GuidanceInputs {
  snapshot: PredictiveProjectSnapshot;
  analysis: ProjectPredictiveAnalysis;
  context: ProjectAgentContext | null;
  report: RecommendationReport | null;
  nowIso: string;
}

type Answerer = (inputs: GuidanceInputs) => GuidanceAnswer;

function base(
  inputs: GuidanceInputs,
  question: GuidanceQuestion,
): Pick<GuidanceAnswer, "projectId" | "question" | "questionPhrase" | "generatedAt" | "derivedFrom" | "insufficientData"> {
  return {
    projectId: inputs.snapshot.projectId,
    question,
    questionPhrase: GUIDANCE_QUESTION_PHRASES[question],
    generatedAt: inputs.nowIso,
    derivedFrom: [
      "project snapshot (RLS-scoped recorded state)",
      "predictive intelligence analysis (deterministic)",
      ...(inputs.context ? ["Stage-2 controlled context"] : []),
      ...(inputs.report ? ["Stage-4 recommendation engine"] : []),
    ],
    insufficientData: [],
  };
}

/** Recommendation → guidance item (deterministic projection). */
function fromRecommendation(
  rec: NonNullable<RecommendationReport>["recommendations"][number],
): GuidanceItem {
  return {
    action: rec.nextStep,
    evidence: rec.evidence,
    priority:
      SEVERITY_ORDER[rec.severity] <= 1 ? "high" : SEVERITY_ORDER[rec.severity] === 2 ? "medium" : "low",
    source: rec.source,
  };
}

function recsByCondition(
  report: RecommendationReport | null,
  ...conditions: string[]
): NonNullable<RecommendationReport>["recommendations"] {
  if (!report) return [];
  return report.recommendations.filter((r) => conditions.includes(r.condition));
}

function predictionsOfKind(
  analysis: ProjectPredictiveAnalysis,
  ...kinds: string[]
): PredictionResult[] {
  return analysis.predictions.filter((p) => kinds.includes(p.kind));
}

function predictionsToItems(
  preds: PredictionResult[],
): GuidanceItem[] {
  return preds.map((p) => ({
    action:
      p.status === "ok"
        ? p.prediction
        : `INSUFFICIENT DATA for ${p.kind.replace(/_/g, " ")}: ${p.missingData.join("; ")}`,
    evidence: p.status === "ok" ? [p.prediction, ...p.limitations] : p.missingData,
    priority: "medium",
    source: `predictive intelligence (${p.kind})`,
  }));
}

function pendingStages(snapshot: PredictiveProjectSnapshot) {
  return snapshot.stages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((s) => !s.isCompleted);
}

function answer(
  inputs: GuidanceInputs,
  question: GuidanceQuestion,
  headline: string,
  items: GuidanceItem[],
  extra?: Partial<GuidanceAnswer>,
): GuidanceAnswer {
  return {
    ...base(inputs, question),
    status: extra?.status ?? "ok",
    headline,
    items,
    ...extra,
  };
}

// =========================================================
// Answerers — one per supported question
// =========================================================

const ANSWERERS: Record<GuidanceQuestion, Answerer> = {
  // ---------------------------------------------------------
  // "What should I do next?"
  // ---------------------------------------------------------
  what_next: (inputs) => {
    const { report, snapshot } = inputs;
    const top = (report?.recommendations ?? [])
      .slice()
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
      .slice(0, 3)
      .map(fromRecommendation);

    const pending = pendingStages(snapshot);
    const stageItem: GuidanceItem | null =
      top.length === 0 && pending.length > 0
        ? {
            action: `Continue recorded work: the next pending stage is "${pending[0].stageName}" (${pending.length} of ${snapshot.stages.length} recorded stages incomplete).`,
            evidence: [
              `Next pending (sort order ${pending[0].sortOrder}): ${pending[0].stageName}`,
              `Completed stages: ${snapshot.stages.length - pending.length}/${snapshot.stages.length}`,
            ],
            priority: "low",
            source: "project_progress_stages (recorded state)",
          }
        : null;

    const items = [...top, ...(stageItem ? [stageItem] : [])];
    return answer(
      inputs,
      "what_next",
      items.length === 0
        ? "Nothing actionable is recorded right now — no open risks and no pending stages. This is the absence of recommendations, not a guarantee."
        : `Based on recorded project state, the next ${items.length === 1 ? "step" : `${items.length} steps, in priority order`}: ${items[0].action}`,
      items,
    );
  },

  // ---------------------------------------------------------
  // "What is blocking my project?"
  // ---------------------------------------------------------
  blockers: (inputs) => {
    const { report } = inputs;
    const blockers = [
      ...recsByCondition(report, "project_blocker"),
      ...(report?.recommendations ?? []).filter(
        (r) => r.severity === "high" || r.severity === "critical",
      ),
    ].map(fromRecommendation);

    const unknown = (report?.insufficientData ?? []).map(
      (i) => `${i.condition.replace(/_/g, " ")} could not be assessed: ${i.reason}`,
    );

    return answer(
      inputs,
      "blockers",
      blockers.length > 0
        ? `${blockers.length} recorded high-severity condition(s) are affecting this project.`
        : "No high-severity blockers are recorded for this project" +
            (unknown.length > 0
              ? ` — but ${unknown.length} condition(s) could not be assessed (see evidence), so absence of a blocker is not proof of none.`
              : ". This is the recorded state, not a guarantee."),
      blockers,
      { insufficientData: unknown },
    );
  },

  // ---------------------------------------------------------
  // "What information is missing?"
  // ---------------------------------------------------------
  missing_info: (inputs) => {
    const { context, report } = inputs;
    const gaps = context?.gaps ?? [];
    const items: GuidanceItem[] = gaps.map((g) => ({
      action: `Record ${g.area} data — ${g.reason}`,
      evidence: [`${g.area}: ${g.reason}`],
      priority: "low",
      source: "context gaps (Stage-2 controlled context)",
    }));
    // Data-quality-driven missing info from the analysis, if any
    for (const cov of inputs.analysis.dataQuality?.coverage ?? []) {
      if (!cov.available) {
        items.push({
          action: `Provide ${cov.area} data — ${cov.note ?? "not available for this project"}`,
          evidence: [`${cov.area}: ${cov.note ?? "marked unavailable by the deterministic analysis"}`],
          priority: "low",
          source: "data quality assessment (deterministic)",
        });
      }
    }
    const reportMissing = recsByCondition(report, "missing_information").map(fromRecommendation);

    return answer(
      inputs,
      "missing_info",
      items.length + reportMissing.length === 0
        ? "No information gaps are recorded for this project — the agent is not aware of anything missing."
        : `${items.length + reportMissing.length} recorded information gap(s) limit what can be assessed.`,
      [...items, ...reportMissing],
    );
  },

  // ---------------------------------------------------------
  // "What should I buy next?"
  // ---------------------------------------------------------
  what_to_buy: (inputs) => {
    const { snapshot } = inputs;
    const unpurchased = snapshot.shoppingItems
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((i) => !i.is_purchased);

    if (snapshot.shoppingItems.length === 0) {
      return answer(
        inputs,
        "what_to_buy",
        "INSUFFICIENT DATA — no shopping list has been recorded for this project, so there is nothing recorded to buy. Run a materials calculation to create one.",
        [],
        {
          status: "insufficient_data",
          insufficientData: ["no recorded shopping list for this project"],
        },
      );
    }

    if (unpurchased.length === 0) {
      return answer(
        inputs,
        "what_to_buy",
        `All ${snapshot.shoppingItems.length} recorded shopping list line(s) are marked purchased — nothing is recorded as still to buy.`,
        [],
      );
    }

    const items: GuidanceItem[] = unpurchased.map((i) => ({
      action: `Buy ${i.quantity} ${i.unit} of ${i.name} (estimated ₦${Number(i.total_price).toLocaleString()})`,
      evidence: [
        `${i.name} (${i.category}): estimated ₦${Number(i.estimated_price).toLocaleString()}/${i.unit}`,
        i.supplier ? `Recorded supplier: ${i.supplier}` : "No supplier recorded",
        ...(i.actual_price !== null
          ? [`Recorded actual price: ₦${Number(i.actual_price).toLocaleString()}`]
          : []),
      ],
      priority: "low",
      source: "project_shopping_list (recorded, unpurchased lines)",
    }));

    return answer(
      inputs,
      "what_to_buy",
      `${unpurchased.length} recorded shopping list line(s) are not yet purchased; next in recorded order: ${items[0].action}.`,
      items,
    );
  },

  // ---------------------------------------------------------
  // "What is putting my budget at risk?"
  // ---------------------------------------------------------
  budget_risk: (inputs) => {
    const { report, analysis, snapshot } = inputs;
    const recs = recsByCondition(
      report,
      "budget_risk",
      "procurement_risk",
      "forecast_change",
      "stale_market_data",
    ).map(fromRecommendation);

    const predItems = predictionsToItems(
      predictionsOfKind(analysis, "cost_overrun", "cashflow", "material_price_trend"),
    );

    const spendNote: GuidanceItem = {
      action: `Recorded spend is tracked against the recorded shopping-list budget (current estimate ₦${snapshot.shoppingItems
        .reduce((sum, i) => sum + (Number.isFinite(i.total_price) ? i.total_price : 0), 0)
        .toLocaleString()}).`,
      evidence: [`${snapshot.shoppingItems.length} recorded shopping list line(s)`],
      priority: "low",
      source: "project_shopping_list (recorded state)",
    };

    const items = [...recs, ...predItems, ...(snapshot.shoppingItems.length > 0 ? [spendNote] : [])];
    return answer(
      inputs,
      "budget_risk",
      items.length === 0
        ? "No recorded condition is putting the budget at risk — the risk register has no Cost/Procurement/Market risks and no cost prediction could contradict them. This is the recorded state, not a guarantee."
        : `Based on recorded data, the budget risk factor(s) are: ${items
            .slice(0, 2)
            .map((i) => i.action)
            .join("; ")}`,
      items,
    );
  },

  // ---------------------------------------------------------
  // "Are we behind schedule?"
  // ---------------------------------------------------------
  schedule: (inputs) => {
    const { report, analysis, snapshot } = inputs;
    const pending = pendingStages(snapshot);
    const done = snapshot.stages.length - pending.length;

    const stageStatus: GuidanceItem = {
      action:
        snapshot.stages.length === 0
          ? "INSUFFICIENT DATA — no progress stages are recorded, so schedule status cannot be assessed."
          : `Recorded stage progress: ${done}/${snapshot.stages.length} completed${
              pending.length > 0 ? `; next pending is "${pending[0].stageName}"` : "; all stages complete"
            }.`,
      evidence:
        snapshot.stages.length === 0
          ? ["no project_progress_stages rows for this project"]
          : snapshot.stages.map(
              (s) => `${s.stageName}: ${s.isCompleted ? `completed${s.completedAt ? ` ${s.completedAt.split("T")[0]}` : " (no date recorded)"}` : "pending"}`,
            ),
      priority: "medium",
      source: "project_progress_stages (recorded state)",
    };

    const recs = recsByCondition(report, "schedule_risk").map(fromRecommendation);
    const predItems = predictionsToItems(
      predictionsOfKind(analysis, "schedule_risk", "progress_variance"),
    );

    const insufficient =
      snapshot.stages.length === 0
        ? ["no progress stages recorded — schedule position is unknown, not assumed"]
        : [];

    // Honest verdict: the risk register is the authority on schedule
    // risk — predictions are listed as supporting evidence either way.
    return answer(
      inputs,
      "schedule",
      recs.length > 0
        ? "Schedule risk is recorded in the project risk register — see the items below."
        : `No schedule risk is recorded in the risk register${snapshot.stages.length > 0 ? `, and ${done}/${snapshot.stages.length} stages are recorded complete` : ""}. This is the recorded state, not a guarantee.`,
      [stageStatus, ...recs, ...predItems],
      insufficient.length > 0
        ? { status: "insufficient_data", insufficientData: insufficient }
        : undefined,
    );
  },

  // ---------------------------------------------------------
  // "What should I verify?"
  // ---------------------------------------------------------
  what_to_verify: (inputs) => {
    const { report, snapshot, context } = inputs;
    const items: GuidanceItem[] = [];

    // Conflicting recorded values — both sides reported.
    for (const conflict of (context?.conflicts ?? []).filter(
      (c) => !c.key.startsWith("coverage:"),
    )) {
      items.push({
        action: `Verify: ${conflict.description}`,
        evidence: [conflict.description, `Agent policy: ${conflict.resolution}`],
        priority: "medium",
        source: "context conflicts (Stage-2 controlled context)",
      });
    }

    // Completed stages without a completion timestamp.
    const noDate = snapshot.stages.filter((s) => s.isCompleted && !s.completedAt);
    if (noDate.length > 0) {
      items.push({
        action: `Verify completion dates for ${noDate.length} stage(s) marked complete with no recorded date: ${noDate.map((s) => s.stageName).join(", ")}.`,
        evidence: noDate.map((s) => `${s.stageName}: completed, no completedAt recorded`),
        priority: "low",
        source: "project_progress_stages (recorded state)",
      });
    }

    // Unverified evidence inside open risks.
    for (const risk of inputs.analysis.risks) {
      const unverified = risk.evidence.filter((e) => e.verification === "unverified");
      if (unverified.length > 0) {
        items.push({
          action: `Verify the evidence behind "${risk.title}" — ${unverified.length} item(s) are unverified.`,
          evidence: unverified.map((e) => `${e.label} [unverified]`),
          priority: "medium",
          source: `risk-register (${risk.id})`,
        });
      }
    }

    // Stale market data.
    const stale = recsByCondition(report, "stale_market_data").map(fromRecommendation);
    const conflictsFromRecs = recsByCondition(report, "conflicting_measurements").map(fromRecommendation);

    const all = [...items, ...conflictsFromRecs, ...stale];
    return answer(
      inputs,
      "what_to_verify",
      all.length === 0
        ? "Nothing recorded currently requires verification — no conflicting values, no unverified risk evidence, no undated completions and fresh market data."
        : `${all.length} thing(s) are recorded as worth verifying; the most important: ${all[0].action}`,
      all,
    );
  },

  // ---------------------------------------------------------
  // "What should I prepare before the next construction stage?"
  // ---------------------------------------------------------
  prepare_next_stage: (inputs) => {
    const { snapshot, report, context } = inputs;
    const pending = pendingStages(snapshot);

    if (snapshot.stages.length === 0) {
      return answer(
        inputs,
        "prepare_next_stage",
        "INSUFFICIENT DATA — no progress stages are recorded, so the next construction stage is unknown.",
        [],
        {
          status: "insufficient_data",
          insufficientData: ["no progress stages recorded — the next stage cannot be identified"],
        },
      );
    }
    if (pending.length === 0) {
      return answer(
        inputs,
        "prepare_next_stage",
        `All ${snapshot.stages.length} recorded stages are complete — there is no next stage recorded to prepare for.`,
        [],
      );
    }

    const next = pending[0];
    const items: GuidanceItem[] = [];

    // Unpurchased materials (honestly noted: not stage-tagged).
    const unpurchased = snapshot.shoppingItems
      .filter((i) => !i.is_purchased)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (unpurchased.length > 0) {
      items.push({
        action: `Buy the ${unpurchased.length} unpurchased material line(s) on the recorded shopping list before starting "${next.stageName}" (shopping lines are not stage-tagged in FRELUX, so these are all outstanding recorded materials).`,
        evidence: unpurchased.map(
          (i) => `${i.name}: ${i.quantity} ${i.unit} (est ₦${Number(i.total_price).toLocaleString()})`,
        ),
        priority: "high",
        source: "project_shopping_list (recorded, unpurchased lines)",
      });
    }

    // Open risks that touch schedule or budget before the stage.
    for (const rec of recsByCondition(report, "schedule_risk", "budget_risk", "procurement_risk")) {
      items.push(fromRecommendation(rec));
    }

    // Missing information that would block honest analysis of the stage.
    for (const gap of (context?.gaps ?? []).slice(0, 5)) {
      items.push({
        action: `Record ${gap.area} data before starting: ${gap.reason}`,
        evidence: [`${gap.area}: ${gap.reason}`],
        priority: "low",
        source: "context gaps (Stage-2 controlled context)",
      });
    }

    return answer(
      inputs,
      "prepare_next_stage",
      `Before the next recorded stage ("${next.stageName}"), prepare: ${
        items.length > 0 ? items[0].action : "nothing recorded is outstanding — the recorded state has no open risks, no unpurchased materials and no gaps."
      }`,
      items,
    );
  },
};

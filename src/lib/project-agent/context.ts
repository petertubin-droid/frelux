// =========================================================
// FRELUX PROJECT AGENT — CONTROLLED CONTEXT ENGINE (Stage 2)
//
// Assembles the agent's view of ONE project from EXISTING
// authoritative sources — it never recomputes anything:
//
//   contractor_projects / stages / shopping / calculations
//     → predictive-intelligence buildProjectSnapshot
//   risks / forecasts / recommendations / data quality
//     → predictive-intelligence analyzeProject
//   property profile                → property-intelligence
//   plan documents / Building Model → plan-vision
//   market prices                   → mi_approved_prices
//
// Every item is labelled with its data class. Unverified values
// NEVER silently become verified (that upgrade happens only
// through explicit user confirmation elsewhere). Missing
// information is listed as MISSING — the agent states what is
// known and what is not.
// =========================================================

import { supabase } from "@/lib/supabase";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import { analyzeProject } from "@/lib/predictive-intelligence/analysis";
import type {
  PredictiveProjectSnapshot,
  ProjectPredictiveAnalysis,
} from "@/lib/predictive-intelligence/types";
import { assertProjectVisible } from "./session";
import type { AgentDataClass, AgentResult } from "./types";
import { AGENT_DATA_CLASS_LABELS } from "./types";

export type ContextArea =
  | "project"
  | "location"
  | "regional_profile"
  | "building_model"
  | "property_model"
  | "measurements"
  | "documents"
  | "calculations"
  | "quantities"
  | "materials"
  | "costs"
  | "schedule"
  | "tasks"
  | "risks"
  | "forecasts"
  | "assumptions"
  | "user_confirmed";

/** One piece of context, fully labelled. */
export interface ContextItem {
  area: ContextArea;
  key: string;
  label: string;
  value: string | number | boolean | null;
  dataClass: AgentDataClass;
  source: string;
  observedAt?: string;
  requiresConfirmation?: boolean;
  note?: string;
}

/** Something that is NOT known. Explicit unknowns — never filled. */
export interface ContextGap {
  area: ContextArea | "market_data";
  key: string;
  reason: string;
}

/** A conflicting pair of recorded values. */
export interface ContextConflict {
  key: string;
  description: string;
  /** How the agent treats it (deterministic policy, stated). */
  resolution: string;
}

export interface ProjectAgentContext {
  projectId: string;
  generatedAt: string;
  items: ContextItem[];
  gaps: ContextGap[];
  conflicts: ContextConflict[];
  region: {
    marketCode: string | null;
    countryCode: string | null;
    city: string | null;
  };
  /** From the deterministic data-quality assessment. */
  dataQuality: ProjectPredictiveAnalysis["dataQuality"] | null;
  analysis: ProjectPredictiveAnalysis | null;
}

// =========================================================
// Data class policies (deterministic, central)
// =========================================================

/** A saved engine calculation is deterministic output — 'estimated'. */
export const ENGINE_RESULT_CLASS: AgentDataClass = "estimated";
/** Anything the user typed or confirmed — 'user_provided' until a
 *  verification flow marks it 'verified'. */
export const USER_INPUT_CLASS: AgentDataClass = "user_provided";
/** AI vision / AI extraction — always requires confirmation. */
export const AI_EXTRACTION_CLASS: AgentDataClass = "ai_extracted";
/** Deterministic analysis of recorded data (risks, forecasts). */
export const ANALYSIS_CLASS: AgentDataClass = "ai_analysis";

// =========================================================
// Builder
// =========================================================

export async function buildProjectAgentContext(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<ProjectAgentContext>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  let snapshot: PredictiveProjectSnapshot | null;
  try {
    snapshot = await buildProjectSnapshot(projectId, { now: nowIso });
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Project snapshot failed: ${String(e)}`,
      },
    };
  }
  if (!snapshot) {
    return {
      ok: false,
      error: {
        code: "project_not_found",
        message: "Project not found or not visible to this account.",
      },
    };
  }

  const analysis = analyzeProject(snapshot);
  const items: ContextItem[] = [];
  const gaps: ContextGap[] = [];

  // --- Project identity & status (user-provided) ---
  items.push({
    area: "project",
    key: "name",
    label: "Project name",
    value: snapshot.project.name,
    dataClass: USER_INPUT_CLASS,
    source: "contractor_projects",
    observedAt: snapshot.project.updatedAt,
  });
  items.push({
    area: "project",
    key: "status",
    label: "Status",
    value: snapshot.project.status,
    dataClass: USER_INPUT_CLASS,
    source: "contractor_projects",
    observedAt: snapshot.project.updatedAt,
  });
  items.push({
    area: "project",
    key: "progress",
    label: "Recorded progress",
    value: snapshot.project.progressPercentage,
    dataClass: USER_INPUT_CLASS,
    source: "contractor_projects (user-entered — may be stale)",
    note:
      snapshot.project.progressPercentage === null
        ? "No progress percentage recorded."
        : undefined,
  });
  if (snapshot.project.progressPercentage === null) {
    gaps.push({
      area: "project",
      key: "progress",
      reason: "No user-entered progress percentage.",
    });
  }

  // --- Location & regional profile ---
  items.push({
    area: "location",
    key: "region",
    label: "Location",
    value:
      [snapshot.region.city, snapshot.region.countryCode]
        .filter(Boolean)
        .join(", ") || null,
    dataClass: USER_INPUT_CLASS,
    source: "project location record",
  });
  if (snapshot.region.countryCode) {
    items.push({
      area: "regional_profile",
      key: "market",
      label: "Regional market profile",
      value: snapshot.region.marketCode ?? snapshot.region.countryCode,
      dataClass: USER_INPUT_CLASS,
      source: "location-intelligence regional profile",
    });
  } else {
    gaps.push({
      area: "regional_profile",
      key: "market",
      reason:
        "No confirmed country on the project location — no regional profile applies, and none is substituted.",
    });
  }

  // --- Tasks / schedule ---
  for (const stage of snapshot.stages) {
    items.push({
      area: "tasks",
      key: `stage:${stage.id}`,
      label: stage.stageName,
      value: stage.isCompleted ? "completed" : "not completed",
      dataClass: USER_INPUT_CLASS,
      source: "project_progress_stages",
      observedAt: stage.updatedAt,
      note: stage.isCompleted
        ? stage.completedAt
          ? `completed at ${stage.completedAt}`
          : "completed (no timestamp)"
        : undefined,
    });
  }
  if (snapshot.stages.length === 0) {
    gaps.push({
      area: "tasks",
      key: "stages",
      reason:
        "No progress stages recorded — schedule variance cannot be assessed.",
    });
  }

  // --- Documents ---
  const documentCount = await countPlanDocuments(projectId);
  if (documentCount.ok) {
    if (documentCount.data > 0) {
      items.push({
        area: "documents",
        key: "plan_documents",
        label: "Plan documents",
        value: documentCount.data,
        dataClass: USER_INPUT_CLASS,
        source: "plan_documents",
      });
    } else {
      gaps.push({
        area: "documents",
        key: "plan_documents",
        reason:
          "No plan documents uploaded — Building Model and takeoff cannot be produced.",
      });
    }
  }

  // --- Building Model (verified plan-vision output) ---
  if (documentCount.ok && documentCount.data > 0) {
    items.push({
      area: "building_model",
      key: "building_model",
      label: "Building Model",
      value: "present (verified spaces/facts only; unverified facts excluded)",
      dataClass: "verified",
      source: "plan-vision canonical Building Model",
      note: "Only user-confirmed or user-edited extractions enter the Building Model.",
    });
  } else {
    gaps.push({
      area: "building_model",
      key: "building_model",
      reason:
        "No Building Model — no verified plan extraction exists for this project.",
    });
  }

  // --- Property Model link ---
  const property = await findLinkedProperty(projectId);
  if (property.ok && property.data) {
    items.push({
      area: "property_model",
      key: "linked_property",
      label: "Linked property",
      value: property.data.name,
      dataClass: "verified",
      source: "properties.construction_project_id",
    });
  } else {
    gaps.push({
      area: "property_model",
      key: "linked_property",
      reason: "No property profile linked to this project.",
    });
  }

  // --- Calculations & costs (deterministic engine results) ---
  for (const calc of snapshot.calculations) {
    items.push({
      area: "calculations",
      key: `calc:${calc.id}`,
      label: calc.title || calc.calculatorType,
      value: calc.estimatedTotal,
      dataClass: ENGINE_RESULT_CLASS,
      source: `saved ${calc.calculatorType} calculation`,
      observedAt: calc.createdAt,
    });
  }
  if (snapshot.calculations.length === 0) {
    gaps.push({
      area: "calculations",
      key: "calculations",
      reason:
        "No saved calculations — no deterministic quantities or costs exist yet.",
    });
  }

  // --- Materials / procurement (shopping list) ---
  for (const item of snapshot.shoppingItems) {
    items.push({
      area: "materials",
      key: `shopping:${item.id}`,
      label: item.name,
      value:
        item.actual_price !== null
          ? `${item.actual_price} (actual) / ${item.estimated_price} (estimated)`
          : `${item.estimated_price} (estimated — no actual price yet)`,
      dataClass: USER_INPUT_CLASS,
      source: "project_shopping_list",
    });
  }
  if (snapshot.shoppingItems.length === 0) {
    gaps.push({
      area: "materials",
      key: "shopping_list",
      reason: "No shopping list items — procurement status is unknown.",
    });
  }

  // --- Market data ---
  if (snapshot.marketPrices.length === 0) {
    gaps.push({
      area: "market_data",
      key: "market_prices",
      reason:
        "No approved market prices for this region — no price data is substituted from another region.",
    });
  }

  // --- AI vision observations (unverified until confirmed) ---
  for (const obs of snapshot.visualObservations) {
    items.push({
      area: "user_confirmed",
      key: `observation:${obs.id}`,
      label: "Site observation",
      value: obs.observation,
      dataClass: AI_EXTRACTION_CLASS,
      source: `visual observation (AI-assisted, ${obs.verification})`,
      observedAt: obs.observedAt,
      requiresConfirmation: obs.verification !== "user_confirmed",
    });
  }

  // --- Risks / forecasts / assumptions from the deterministic analysis ---
  for (const risk of analysis.risks) {
    items.push({
      area: "risks",
      key: `risk:${risk.id}`,
      label: risk.title,
      value: `${risk.severity} risk in ${risk.affectedArea} — evidence: ${risk.evidence.map((e) => e.label).join("; ")}`,
      dataClass: ANALYSIS_CLASS,
      source: "predictive-intelligence deterministic analysis",
    });
  }
  for (const prediction of analysis.predictions) {
    items.push({
      area: "forecasts",
      key: `forecast:${prediction.kind}`,
      label: prediction.kind,
      value:
        prediction.status === "ok"
          ? prediction.prediction
          : `unavailable (${prediction.status})`,
      dataClass: ANALYSIS_CLASS,
      source: "predictive-intelligence forecast (deterministic formulas)",
    });
  }
  for (const limitation of analysis.limitations) {
    items.push({
      area: "assumptions",
      key: `limitation:${items.length}`,
      label: "Analysis limitation",
      value: limitation,
      dataClass: "assumption",
      source: "predictive-intelligence limitations",
    });
  }

  // --- Conflicts (deterministic detection, stated policy) ---
  const conflicts = detectConflicts(snapshot, analysis);

  return {
    ok: true,
    data: {
      projectId,
      generatedAt: nowIso,
      items,
      gaps,
      conflicts,
      region: snapshot.region,
      dataQuality: analysis.dataQuality,
      analysis,
    },
  };
}

// =========================================================
// Conflict detection — deterministic, with stated resolution
// =========================================================

function detectConflicts(
  snapshot: PredictiveProjectSnapshot,
  analysis: ProjectPredictiveAnalysis,
): ContextConflict[] {
  const conflicts: ContextConflict[] = [];

  // 1. Recorded progress vs completed stages.
  if (
    snapshot.project.progressPercentage !== null &&
    snapshot.stages.length > 0
  ) {
    const done = snapshot.stages.filter((s) => s.isCompleted).length;
    const stagePct = Math.round((done / snapshot.stages.length) * 100);
    const diff = Math.abs(stagePct - snapshot.project.progressPercentage);
    if (diff >= 20) {
      conflicts.push({
        key: "progress_vs_stages",
        description: `User-entered progress (${snapshot.project.progressPercentage}%) differs from completed stages (${stagePct}% — ${done}/${snapshot.stages.length}).`,
        resolution:
          "Both values are reported side by side; stage evidence (timestamps/photos) is preferred for schedule analysis. The agent does NOT pick one silently.",
      });
    }
  }

  // 2. Stage marked completed without a completion timestamp.
  const noTimestamp = snapshot.stages.filter(
    (s) => s.isCompleted && !s.completedAt,
  );
  if (noTimestamp.length > 0) {
    conflicts.push({
      key: "completed_without_timestamp",
      description: `${noTimestamp.length} completed stage(s) have no completion date (${noTimestamp.map((s) => s.stageName).join(", ")}).`,
      resolution:
        "Treated as completed (user-asserted) but flagged — schedule variance dates cannot be verified for them.",
    });
  }

  // 3. Data-quality-driven conflicts surfaced by the deterministic analysis.
  for (const cov of analysis.dataQuality.coverage) {
    if (!cov.available && cov.note) {
      conflicts.push({
        key: `coverage:${cov.area}`,
        description: `${cov.area}: ${cov.note}`,
        resolution: "Reported as missing — no value substituted.",
      });
    }
  }

  return conflicts;
}

// =========================================================
// Helpers (RLS-scoped reads via the user client)
// =========================================================

async function countPlanDocuments(
  projectId: string,
): Promise<AgentResult<number>> {
  try {
    const { count, error } = await supabase
      .from("plan_documents")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Document count failed: ${error.message}`,
        },
      };
    return { ok: true, data: count ?? 0 };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Document count failed: ${String(e)}`,
      },
    };
  }
}

async function findLinkedProperty(
  projectId: string,
): Promise<AgentResult<{ id: string; name: string } | null>> {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("id, name")
      .eq("construction_project_id", projectId)
      .maybeSingle();
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Property lookup failed: ${error.message}`,
        },
      };
    if (!data) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        id: String(data.id),
        name: String((data as { name?: string }).name ?? "Property"),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Property lookup failed: ${String(e)}`,
      },
    };
  }
}

/** Human summary: what is known and what is missing. */
export function summariseContext(context: ProjectAgentContext): string {
  const byClass = new Map<AgentDataClass, number>();
  for (const item of context.items) {
    byClass.set(item.dataClass, (byClass.get(item.dataClass) ?? 0) + 1);
  }
  const known = [...byClass.entries()]
    .map(([cls, n]) => `${AGENT_DATA_CLASS_LABELS[cls]}: ${n}`)
    .join("; ");
  const missing = context.gaps
    .map((g) => `- ${g.area}.${g.key}: ${g.reason}`)
    .join("\n");
  return [
    `Known — ${known || "nothing"}.`,
    context.conflicts.length > 0
      ? `Conflicts (${context.conflicts.length}):\n${context.conflicts.map((c) => `- ${c.description} → ${c.resolution}`).join("\n")}`
      : "",
    context.gaps.length > 0
      ? `Missing (${context.gaps.length}):\n${missing}`
      : "Nothing reported missing by the recorded data — this is not a claim that nothing is missing.",
  ]
    .filter(Boolean)
    .join("\n");
}

// =========================================================
// FRELUX PROJECT AGENT — TOOL ORCHESTRATION LAYER (Stage 3)
//
// Connects the Project Agent to EXISTING authoritative FRELUX
// tools. Hard rules:
//
//   1. The agent CALLS engines — it never reproduces their
//      mathematics. Every number in `result` was produced by
//      the credited engine, verbatim.
//   2. Every tool is project-scoped: a project the caller
//      cannot see resolves to project_not_found. There is no
//      path that touches another user's or project's data.
//   3. All Stage-3 tools are READ / analysis operations —
//      permission "read", no approval flow, no mutation of
//      project data. (Prepare/confirm actions arrive later,
//      in Stage 6+.)
//   4. Missing inputs are reported as insufficient_data with
//      what is missing and where it comes from. The agent
//      NEVER guesses an input, never borrows another region's
//      data, and never fabricates a result.
//   5. Every result carries provenance: which engine ran,
//      which inputs (with data classes) fed it, what was
//      assumed, and how fresh the data is.
// =========================================================

import { supabase } from "@/lib/supabase";
import { assertProjectVisible } from "./session";
import type { AgentDataClass, AgentResult } from "./types";
import { buildProjectSnapshot } from "@/lib/predictive-intelligence/snapshot";
import type { PredictiveProjectSnapshot } from "@/lib/predictive-intelligence/types";
import { analyzeProject } from "@/lib/predictive-intelligence/analysis";
import {
  listEngines,
  executeEngine,
  getEngineDescriptor,
  defaultBuildToRoofInput,
  type BuildToRoofInputLike,
} from "@/lib/ai-foundation/engines-registry";
import type { EngineResult } from "@/lib/ai-foundation/types";
import { fetchLatestExtraction } from "@/lib/plan-vision/persistence";
import {
  planRoomTakeoff,
  executeTakeoffPlan,
  TAKEOFF_KIND_LABELS,
  type TakeoffKind,
  type RoomTakeoffItem,
} from "@/lib/plan-vision/takeoff";
import type { PlanExtraction } from "@/lib/plan-vision/types";
import {
  findImpossibleRooms,
  findDuplicateRooms,
  findContradictoryFacts,
  checkAreaTotals,
} from "@/lib/plan-vision/consistency";
import { estimateTimeline } from "@/lib/measurement/timeline-engine";
import { buildQuotation } from "@/lib/measurement/quotation-engine";
import type { CostEstimate } from "@/lib/measurement/cost-integration";
import {
  materialPriceChangeScenario,
  taskDelayScenario,
  materialChangeScenario,
} from "@/lib/predictive-intelligence/scenario-analysis";
import { rowToProfile } from "@/lib/property-intelligence/queries";
import { buildPropertyIntelligenceReport } from "@/lib/property-intelligence/intelligence";
import { fetchApprovedPrices } from "@/lib/market-intelligence/queries";

// =========================================================
// Tool registry (metadata)
// =========================================================

export type AgentToolId =
  | "calculator_lookup"
  | "quantity_takeoff"
  | "build_to_roof"
  | "project_timeline"
  | "shopping_list"
  | "quotation_preview"
  | "cost_analysis"
  | "scenario_analysis"
  | "property_analysis"
  | "document_analysis"
  | "market_intelligence";

export interface AgentToolDescriptor {
  id: AgentToolId;
  title: string;
  /** Who actually does the work — shown in agent responses. */
  creditedAs: string;
  description: string;
  /** What the tool needs — human-readable, used for the agent's
   *  "determine required information" step and for UI copy. */
  requiredInputs: string[];
  /** Stage 3: every tool is read/analysis only. */
  permission: "read";
}

export const AGENT_TOOLS: Record<AgentToolId, AgentToolDescriptor> = {
  calculator_lookup: {
    id: "calculator_lookup",
    title: "Calculator lookup",
    creditedAs: "FRELUX engines registry + saved project calculations",
    description:
      "List registered authoritative calculators and the calculations already saved on this project.",
    requiredInputs: ["a visible project"],
    permission: "read",
  },
  quantity_takeoff: {
    id: "quantity_takeoff",
    title: "Quantity takeoff",
    creditedAs: "Plan Vision takeoff planner + FRELUX engines registry",
    description:
      "Plan and execute an AI quantity takeoff from the project's latest verified plan extraction, room by room.",
    requiredInputs: [
      "an uploaded plan document with an extraction (Building Model source)",
    ],
    permission: "read",
  },
  build_to_roof: {
    id: "build_to_roof",
    title: "Build-to-Roof estimate",
    creditedAs: "Build-to-Roof engine (authoritative)",
    description:
      "Run the Build-to-Roof whole-building estimate with the provided (or default) building inputs.",
    requiredInputs: ["building inputs (or the engine's own smart defaults)"],
    permission: "read",
  },
  project_timeline: {
    id: "project_timeline",
    title: "Project timeline",
    creditedAs: "Construction timeline engine (authoritative)",
    description:
      "Estimate the project phase timeline from a scope map (trade → quantity).",
    requiredInputs: ["scope map: trade → quantity (user-supplied)"],
    permission: "read",
  },
  shopping_list: {
    id: "shopping_list",
    title: "Shopping list",
    creditedAs: "project_shopping_list (recorded data — no math added)",
    description:
      "Read the project's recorded shopping list with estimated and actual prices, verbatim.",
    requiredInputs: [
      "a visible project (list may be empty — stated, not guessed)",
    ],
    permission: "read",
  },
  quotation_preview: {
    id: "quotation_preview",
    title: "Quotation preview",
    creditedAs: "Quotation engine (authoritative, read-only preview)",
    description:
      "Build a quotation document (preview only — nothing is saved or sent) from a cost estimate the caller supplies.",
    requiredInputs: ["costEstimate (from a FRELUX cost calculation)"],
    permission: "read",
  },
  cost_analysis: {
    id: "cost_analysis",
    title: "Cost & project analysis",
    creditedAs: "Predictive Construction Intelligence (deterministic)",
    description:
      "Run the deterministic project analysis: data quality, predictions, risks, health and scenarios.",
    requiredInputs: ["a visible project"],
    permission: "read",
  },
  scenario_analysis: {
    id: "scenario_analysis",
    title: "Scenario analysis",
    creditedAs: "Predictive Intelligence scenario engine (deterministic)",
    description:
      "Answer what-if questions (material price change, task delay, single material change) from recorded project data.",
    requiredInputs: [
      "scenario kind + its parameter (changePct / delayDays / material name & price)",
    ],
    permission: "read",
  },
  property_analysis: {
    id: "property_analysis",
    title: "Property analysis",
    creditedAs: "Property Intelligence engine",
    description:
      "Analyze the property profile linked to this project (condition gaps, value inputs, risks).",
    requiredInputs: ["a property profile linked to the project"],
    permission: "read",
  },
  document_analysis: {
    id: "document_analysis",
    title: "Plan document analysis",
    creditedAs: "Plan Vision consistency checks (deterministic)",
    description:
      "Run the geometric consistency checks (impossible rooms, duplicates, contradictions, area totals) on the latest plan extraction.",
    requiredInputs: ["an uploaded plan document with an extraction"],
    permission: "read",
  },
  market_intelligence: {
    id: "market_intelligence",
    title: "Market intelligence",
    creditedAs: "Market Intelligence approved prices (mi_approved_prices)",
    description:
      "Read approved market prices for the project's own region. Another region's data is NEVER substituted.",
    requiredInputs: ["a confirmed project location (market or country)"],
    permission: "read",
  },
};

export function describeAgentTool(toolId: string): AgentToolDescriptor | null {
  return (AGENT_TOOLS as Record<string, AgentToolDescriptor>)[toolId] ?? null;
}

export function listAgentTools(): AgentToolDescriptor[] {
  return Object.values(AGENT_TOOLS);
}

// =========================================================
// Invocation envelope
// =========================================================

export interface ToolInputUsed {
  key: string;
  value: unknown;
  dataClass: AgentDataClass;
  source: string;
}

export interface ToolInvocation {
  tool: AgentToolId;
  /** Stage 3 — always "read". */
  permission: "read";
  status: "ok" | "insufficient_data";
  executedAt: string;
  /** The authoritative engine/module that produced `result`. */
  engineUsed: string;
  /** The engine's output, VERBATIM — never transformed by the agent. */
  result: unknown;
  /** What was missing when status = insufficient_data. */
  missingData: string[];
  /** Traceable inputs with data classes. */
  inputsUsed: ToolInputUsed[];
  assumptions: string[];
  dataFreshness: string;
  note?: string;
}

export interface ToolRequest {
  tool: AgentToolId;
  /** Tool parameters — validated per tool; unknown keys are ignored. */
  params?: Record<string, unknown>;
}

const ENGINE_CLASS: AgentDataClass = "estimated";
const USER_CLASS: AgentDataClass = "user_provided";
const RECORDED_CLASS: AgentDataClass = "user_provided";

// =========================================================
// Dispatcher — the single entry point
// =========================================================

export async function invokeAgentTool(
  projectId: string,
  request: ToolRequest,
  nowIso: string,
): Promise<AgentResult<ToolInvocation>> {
  const descriptor = describeAgentTool(request.tool);
  if (!descriptor) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Unknown agent tool "${request.tool}". The agent only invokes registered tools — no fallbacks.`,
      },
    };
  }

  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  try {
    switch (request.tool) {
      case "calculator_lookup":
        return ok(await runCalculatorLookup(projectId, nowIso));
      case "quantity_takeoff":
        return ok(await runQuantityTakeoff(projectId, request.params, nowIso));
      case "build_to_roof":
        return ok(await runBuildToRoof(request.params, nowIso));
      case "project_timeline":
        return ok(runProjectTimeline(request.params, nowIso));
      case "shopping_list":
        return ok(await runShoppingList(projectId, nowIso));
      case "quotation_preview":
        return ok(runQuotationPreview(request.params, nowIso));
      case "cost_analysis":
        return ok(await runCostAnalysis(projectId, nowIso));
      case "scenario_analysis":
        return ok(
          await runScenarioAnalysis(projectId, request.params, nowIso),
        );
      case "property_analysis":
        return ok(await runPropertyAnalysis(projectId, nowIso));
      case "document_analysis":
        return ok(await runDocumentAnalysis(projectId, nowIso));
      case "market_intelligence":
        return ok(await runMarketIntelligence(projectId, nowIso));
    }
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Tool "${request.tool}" failed: ${String(e)}`,
      },
    };
  }
}

function ok(invocation: ToolInvocation): AgentResult<ToolInvocation> {
  return { ok: true, data: invocation };
}

// =========================================================
// Shared helpers
// =========================================================

async function loadSnapshot(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<PredictiveProjectSnapshot>> {
  const snapshot = await buildProjectSnapshot(projectId, { now: nowIso });
  if (!snapshot) {
    return {
      ok: false,
      error: {
        code: "project_not_found",
        message: "Project not found or not visible to this account.",
      },
    };
  }
  return { ok: true, data: snapshot };
}

function insufficient(
  tool: AgentToolId,
  engineUsed: string,
  missingData: string[],
  nowIso: string,
): ToolInvocation {
  return {
    tool,
    permission: "read",
    status: "insufficient_data",
    executedAt: nowIso,
    engineUsed,
    result: null,
    missingData,
    inputsUsed: [],
    assumptions: [],
    dataFreshness: nowIso,
  };
}

/** Latest plan document + extraction for a project (RLS-scoped). */
async function latestExtraction(
  projectId: string,
  documentId?: string,
): Promise<{ documentId: string | null; extraction: PlanExtraction | null }> {
  let docId = documentId ?? null;
  if (!docId) {
    const { data, error } = await supabase
      .from("plan_documents")
      .select("id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return { documentId: null, extraction: null };
    docId = String(data.id);
  }
  const extraction = await fetchLatestExtraction(docId);
  return { documentId: docId, extraction };
}

/** Deterministic building-fact lookup by key (no invented keys). */
function numericFact(extraction: PlanExtraction, key: string): number | null {
  const fact = extraction.buildingFacts.find(
    (f) =>
      f.key === key &&
      f.reviewStatus !== "user_rejected" &&
      typeof f.dimension === "number",
  );
  return fact && typeof fact.dimension === "number" ? fact.dimension : null;
}

// =========================================================
// 1. Calculator lookup
// =========================================================

async function runCalculatorLookup(
  projectId: string,
  nowIso: string,
): Promise<ToolInvocation> {
  const snap = await loadSnapshot(projectId, nowIso);
  const engines = listEngines().map((e) => ({
    id: e.id,
    title: e.title,
    domain: e.domain,
    creditedAs: e.creditedAs,
    authoritative: e.authoritative,
  }));
  const saved = snap.ok
    ? snap.data.calculations.map((c) => ({
        id: c.id,
        calculatorType: c.calculatorType,
        title: c.title,
        createdAt: c.createdAt,
        estimatedTotal: c.estimatedTotal,
      }))
    : [];
  return {
    tool: "calculator_lookup",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed: AGENT_TOOLS.calculator_lookup.creditedAs,
    result: { engines, savedCalculations: saved },
    missingData:
      snap.ok && saved.length === 0
        ? ["saved calculations (none recorded on this project yet)"]
        : [],
    inputsUsed: snap.ok
      ? snap.data.calculations.map((c) => ({
          key: `calc:${c.id}`,
          value: c.estimatedTotal,
          dataClass: ENGINE_CLASS,
          source: `saved ${c.calculatorType} calculation`,
        }))
      : [],
    assumptions: [],
    dataFreshness: nowIso,
    note: "Engine list comes from the registry — engines the AI may call by id. Totals are the recorded values from each saved calculation.",
  };
}

// =========================================================
// 2. Quantity takeoff (Plan Vision → engines registry)
// =========================================================

async function runQuantityTakeoff(
  projectId: string,
  params: Record<string, unknown> | undefined,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.quantity_takeoff.creditedAs;

  const { documentId, extraction } = await latestExtraction(
    projectId,
    typeof params?.documentId === "string" ? params.documentId : undefined,
  );
  if (!extraction || !documentId) {
    return insufficient(
      "quantity_takeoff",
      engineUsed,
      [
        "a plan document with an extraction for this project — upload a plan and let Plan Vision extract it first",
      ],
      nowIso,
    );
  }

  // Kinds: caller may narrow; default = every supported kind.
  const requested = params?.kinds;
  const kinds: TakeoffKind[] = Array.isArray(requested)
    ? (requested.filter((k) =>
        Object.prototype.hasOwnProperty.call(TAKEOFF_KIND_LABELS, k),
      ) as TakeoffKind[])
    : (Object.keys(TAKEOFF_KIND_LABELS) as TakeoffKind[]);
  if (kinds.length === 0) {
    return insufficient(
      "quantity_takeoff",
      engineUsed,
      [
        `at least one valid takeoff kind (valid: ${Object.keys(TAKEOFF_KIND_LABELS).join(", ")})`,
      ],
      nowIso,
    );
  }

  // Existing planner — no math added here.
  const plan = planRoomTakeoff(extraction, kinds);
  const executed = await executeTakeoffPlan(plan);

  const inputsUsed: ToolInputUsed[] = [
    {
      key: "documentId",
      value: documentId,
      dataClass: USER_CLASS,
      source: "plan_documents (latest for this project)",
    },
    {
      key: "kinds",
      value: kinds,
      dataClass: USER_CLASS,
      source: "caller request (default: all supported kinds)",
    },
  ];
  for (const room of extraction.rooms) {
    inputsUsed.push({
      key: `room:${room.id}`,
      value: room.reviewStatus,
      dataClass:
        room.reviewStatus === "user_confirmed" ||
        room.reviewStatus === "user_edited"
          ? "verified"
          : "ai_extracted",
      source: "plan extraction review state",
    });
  }

  const blocked = executed.filter(
    (i) => i.status !== "ready" && i.result === undefined,
  );
  const missing: string[] = [];
  for (const item of executed) {
    if (item.result && "ok" in item.result && item.result.ok === false) {
      missing.push(`${item.kind} (room ${item.roomId}): ${item.result.error}`);
    }
  }
  void blocked;

  return {
    tool: "quantity_takeoff",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result: executed satisfies RoomTakeoffItem[],
    missingData: missing,
    inputsUsed,
    assumptions: extraction.warnings,
    dataFreshness: extraction.extractedAt,
    note: "Each item's quantities/costs were produced by its registered engine, verbatim. Rooms not yet confirmed are excluded — the takeoff reports gaps, it never guesses them.",
  };
}

// =========================================================
// 3. Build-to-Roof (registry engine — verbatim EngineResult)
// =========================================================

async function runBuildToRoof(
  params: Record<string, unknown> | undefined,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineId = "build_to_roof";
  const descriptor = getEngineDescriptor(engineId);
  const credited = descriptor?.creditedAs ?? AGENT_TOOLS.build_to_roof.creditedAs;

  const defaults = defaultBuildToRoofInput();
  const overrides = (params?.input ?? {}) as Partial<BuildToRoofInputLike>;
  const input = { ...defaults, ...overrides };

  // The ENGINE validates its own input — the agent adds no math,
  // no unit conversion, no defaults of its own.
  const result: EngineResult = await executeEngine(engineId, input);
  const inputsUsed: ToolInputUsed[] = Object.entries(input as Record<string, unknown>).map(
    ([key, value]) => ({
      key,
      value,
      dataClass: key in overrides ? USER_CLASS : "assumption",
      source:
        key in overrides
          ? "caller-provided input"
          : "Build-to-Roof smart defaults (same as the estimator page)",
    }),
  );
  return {
    tool: "build_to_roof",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed: `${engineId} (${credited})`,
    result,
    missingData: result.ok ? [] : [result.error ?? "engine error"],
    inputsUsed,
    assumptions: result.ok
      ? [
          "Engine default wastage, prices and labour constants apply where the caller did not supply values.",
        ]
      : [],
    dataFreshness: result.calculatedAt,
    note: result.ok
      ? "Result is the engine's output verbatim — identical to running the Build-to-Roof estimator with the same inputs."
      : "The engine reported a failure honestly — no approximation was produced.",
  };
}

// =========================================================
// 4. Project timeline (timeline engine — scope is required)
// =========================================================

function runProjectTimeline(
  params: Record<string, unknown> | undefined,
  nowIso: string,
): ToolInvocation {
  const engineUsed = AGENT_TOOLS.project_timeline.creditedAs;
  const scopeRaw = params?.scope;
  if (
    !scopeRaw ||
    typeof scopeRaw !== "object" ||
    Object.keys(scopeRaw as Record<string, unknown>).length === 0
  ) {
    return insufficient(
      "project_timeline",
      engineUsed,
      [
        "scope map (trade → quantity), e.g. from a quantity takeoff or a saved calculation — the timeline engine never invents quantities",
      ],
      nowIso,
    );
  }
  const scope = new Map<string, number>();
  for (const [k, v] of Object.entries(scopeRaw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) scope.set(k, n);
  }
  if (scope.size === 0) {
    return insufficient(
      "project_timeline",
      engineUsed,
      ["a scope map with at least one finite non-negative quantity"],
      nowIso,
    );
  }

  const startDate =
    typeof params?.startDate === "string" ? params.startDate : undefined;
  const weatherBufferPercent =
    typeof params?.weatherBufferPercent === "number"
      ? params.weatherBufferPercent
      : undefined;
  const contingencyDays =
    typeof params?.contingencyDays === "number"
      ? params.contingencyDays
      : undefined;

  // Existing engine — verbatim result.
  const result = estimateTimeline(scope, undefined, {
    startDate,
    weatherBufferPercent,
    contingencyDays,
  });

  return {
    tool: "project_timeline",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result,
    missingData: [],
    inputsUsed: [
      {
        key: "scope",
        value: Object.fromEntries(scope),
        dataClass: USER_CLASS,
        source: "caller-supplied scope map",
      },
      ...(
        [
          ["startDate", startDate],
          ["weatherBufferPercent", weatherBufferPercent],
          ["contingencyDays", contingencyDays],
        ] as const
      )
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ({
          key: k,
          value: v,
          dataClass: USER_CLASS,
          source: "caller-supplied option",
        })),
    ],
    assumptions: [
      "Default phase templates and productivity rates from the timeline engine apply (no project-specific template supplied).",
    ],
    dataFreshness: nowIso,
    note: "Result is the timeline engine's output verbatim.",
  };
}

// =========================================================
// 5. Shopping list (recorded data — verbatim)
// =========================================================

async function runShoppingList(
  projectId: string,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.shopping_list.creditedAs;
  const snap = await loadSnapshot(projectId, nowIso);
  if (!snap.ok)
    return insufficient("shopping_list", engineUsed, ["visible project data"], nowIso);

  const items = snap.data.shoppingItems;
  const lastTouched =
    items.length > 0
      ? (items
          .map((i) => i.updated_at)
          .filter((t): t is string => Boolean(t))
          .sort()
          .pop() ?? nowIso)
      : nowIso;
  return {
    tool: "shopping_list",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result: items,
    missingData:
      items.length === 0
        ? ["shopping list items (none recorded — procurement status is unknown)"]
        : [],
    inputsUsed: items.map((i) => ({
      key: `shopping:${String(i.id ?? "?")}`,
      value: String(i.name ?? ""),
      dataClass: RECORDED_CLASS,
      source: "project_shopping_list",
    })),
    assumptions: [],
    dataFreshness: lastTouched,
    note: "Recorded values verbatim — estimated vs actual prices are shown exactly as stored; no totals are recomputed here.",
  };
}

// =========================================================
// 6. Quotation preview (quotation engine — nothing persisted)
// =========================================================

function runQuotationPreview(
  params: Record<string, unknown> | undefined,
  nowIso: string,
): ToolInvocation {
  const engineUsed = AGENT_TOOLS.quotation_preview.creditedAs;
  const costEstimate = params?.costEstimate as CostEstimate | undefined;
  if (!costEstimate || typeof costEstimate !== "object") {
    return insufficient(
      "quotation_preview",
      engineUsed,
      [
        "costEstimate — the CostEstimate output of a FRELUX cost calculation (the quotation engine never invents line items or prices)",
      ],
      nowIso,
    );
  }
  const clientName =
    typeof params?.clientName === "string" ? params.clientName : undefined;
  const clientAddress =
    typeof params?.clientAddress === "string" ? params.clientAddress : undefined;
  const clientPhone =
    typeof params?.clientPhone === "string" ? params.clientPhone : undefined;
  const projectName =
    typeof params?.projectName === "string"
      ? params.projectName
      : "Project quotation";
  const projectDescription =
    typeof params?.projectDescription === "string"
      ? params.projectDescription
      : undefined;
  const projectLocation =
    typeof params?.projectLocation === "string"
      ? params.projectLocation
      : undefined;
  const quotationNumber =
    typeof params?.quotationNumber === "string"
      ? params.quotationNumber
      : undefined;

  // Existing engine — verbatim document, PREVIEW ONLY.
  const result = buildQuotation({
    costEstimate,
    clientName,
    clientAddress,
    clientPhone,
    projectName,
    projectDescription,
    projectLocation,
    quotationNumber,
  });

  const optionalPassthrough = (
    [
      ["clientName", clientName],
      ["clientAddress", clientAddress],
      ["clientPhone", clientPhone],
      ["projectName", projectName],
      ["projectDescription", projectDescription],
      ["projectLocation", projectLocation],
    ] as const
  ).filter(([, v]) => v !== undefined);

  return {
    tool: "quotation_preview",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result,
    missingData: [],
    inputsUsed: [
      {
        key: "costEstimate",
        value: `${String(costEstimate.grandTotal)} ${String(costEstimate.currency ?? "")}`.trim(),
        dataClass: USER_CLASS,
        source: "caller-supplied cost estimate (from a FRELUX calculation)",
      },
      ...optionalPassthrough.map(([k, v]) => ({
        key: k,
        value: v,
        dataClass: USER_CLASS,
        source: "caller-supplied",
      })),
    ],
    assumptions: [
      "Default quotation settings (validity, terms, tax) apply where none supplied.",
    ],
    dataFreshness: nowIso,
    note: "Preview only — the document is returned; nothing is saved, sent or exported by this tool.",
  };
}

// =========================================================
// 7. Cost & project analysis (predictive intelligence — verbatim)
// =========================================================

async function runCostAnalysis(
  projectId: string,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.cost_analysis.creditedAs;
  const snap = await loadSnapshot(projectId, nowIso);
  if (!snap.ok)
    return insufficient("cost_analysis", engineUsed, ["visible project data"], nowIso);

  // Existing deterministic analysis — verbatim.
  const analysis = analyzeProject(snap.data);

  return {
    tool: "cost_analysis",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result: analysis,
    missingData: analysis.dataQuality.coverage
      .filter((c) => !c.available)
      .map((c) => `${c.area}${c.note ? `: ${c.note}` : ""}`),
    inputsUsed: [
      {
        key: "snapshot",
        value: `${snap.data.stages.length} stages, ${snap.data.shoppingItems.length} shopping items, ${snap.data.calculations.length} saved calculations`,
        dataClass: RECORDED_CLASS,
        source: "predictive-intelligence project snapshot (RLS-scoped)",
      },
    ],
    assumptions: analysis.limitations,
    dataFreshness: analysis.generatedAt,
    note: "Analysis is the deterministic engine's output verbatim — every limitation is carried through, none hidden.",
  };
}

// =========================================================
// 8. Scenario analysis (deterministic scenario engine)
// =========================================================

async function runScenarioAnalysis(
  projectId: string,
  params: Record<string, unknown> | undefined,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.scenario_analysis.creditedAs;
  const scenario = params?.scenario;
  if (
    scenario !== "material_price_change" &&
    scenario !== "task_delay" &&
    scenario !== "material_change"
  ) {
    return insufficient(
      "scenario_analysis",
      engineUsed,
      [
        "scenario kind — one of: material_price_change (needs changePct), task_delay (needs delayDays), material_change (needs materialName + newUnitPrice)",
      ],
      nowIso,
    );
  }

  const snap = await loadSnapshot(projectId, nowIso);
  if (!snap.ok)
    return insufficient("scenario_analysis", engineUsed, ["visible project data"], nowIso);

  // The scenario functions return insufficient_data HONESTLY when
  // the recorded data is missing — that outcome is passed through
  // verbatim; the agent never substitutes anything.
  let result;
  if (scenario === "material_price_change") {
    const changePct = params?.changePct;
    if (typeof changePct !== "number" || !Number.isFinite(changePct)) {
      return insufficient(
        "scenario_analysis",
        engineUsed,
        ["changePct (a number, e.g. 0.1 for +10%)"],
        nowIso,
      );
    }
    result = materialPriceChangeScenario({
      now: nowIso,
      shoppingItems: snap.data.shoppingItems as never,
      changePct,
    });
  } else if (scenario === "task_delay") {
    const delayDays = params?.delayDays;
    if (typeof delayDays !== "number" || !Number.isFinite(delayDays)) {
      return insufficient(
        "scenario_analysis",
        engineUsed,
        ["delayDays (a number of days)"],
        nowIso,
      );
    }
    const pending = snap.data.stages
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find((s) => !s.isCompleted);
    result = taskDelayScenario({
      now: nowIso,
      nextPendingStage: pending?.stageName ?? null,
      dailySpendRate: null, // only a measured rate belongs here — never a guess
      delayDays,
    });
  } else {
    const materialName = params?.materialName;
    const newUnitPrice = params?.newUnitPrice;
    if (typeof materialName !== "string" || typeof newUnitPrice !== "number") {
      return insufficient(
        "scenario_analysis",
        engineUsed,
        ["materialName (an unpurchased shopping-list line) and newUnitPrice"],
        nowIso,
      );
    }
    result = materialChangeScenario({
      now: nowIso,
      shoppingItems: snap.data.shoppingItems as never,
      materialName,
      newUnitPrice,
    });
  }

  return {
    tool: "scenario_analysis",
    permission: "read",
    status: result.status === "ok" ? "ok" : "insufficient_data",
    executedAt: nowIso,
    engineUsed,
    result,
    missingData: result.missingData ?? [],
    inputsUsed: [
      {
        key: "scenario",
        value: String(scenario),
        dataClass: USER_CLASS,
        source: "caller request",
      },
      {
        key: "shoppingItems",
        value: `${snap.data.shoppingItems.length} recorded items`,
        dataClass: RECORDED_CLASS,
        source: "project_shopping_list (via project snapshot)",
      },
      {
        key: "stages",
        value: `${snap.data.stages.length} recorded stages`,
        dataClass: RECORDED_CLASS,
        source: "project_progress_stages (via project snapshot)",
      },
    ],
    assumptions: result.assumptions,
    dataFreshness: nowIso,
    note: "The scenario engine's own insufficient_data verdicts are passed through verbatim — nothing is fabricated to fill a gap.",
  };
}

// =========================================================
// 9. Property analysis (Property Intelligence — linked property)
// =========================================================

async function runPropertyAnalysis(
  projectId: string,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.property_analysis.creditedAs;

  // RLS-scoped: only a property linked to THIS project, visible to
  // this caller, resolves.
  const { data: propertyRow, error } = await supabase
    .from("properties")
    .select("*")
    .eq("construction_project_id", projectId)
    .limit(1)
    .maybeSingle();
  if (error || !propertyRow) {
    return insufficient(
      "property_analysis",
      engineUsed,
      [
        "a property profile linked to this project (create/link one in Property Intelligence)",
      ],
      nowIso,
    );
  }

  // Existing mapping + engine — verbatim.
  const profile = rowToProfile(propertyRow as never);
  const report = buildPropertyIntelligenceReport({ profile, nowIso });

  return {
    tool: "property_analysis",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result: report,
    missingData: report.condition.unassessedCategories.map(
      (category) => `condition assessment: ${category}`,
    ),
    inputsUsed: [
      {
        key: "linkedProperty",
        value: profile.name ?? profile.id,
        dataClass: "verified",
        source: "properties.construction_project_id (RLS-scoped)",
      },
    ],
    assumptions: [
      "The report is built from the recorded property profile alone — no observations, listings or investment inputs were supplied by this tool.",
    ],
    dataFreshness: nowIso,
    note: "Report is the Property Intelligence engine's output verbatim.",
  };
}

// =========================================================
// 10. Plan document analysis (consistency checks — verbatim)
// =========================================================

async function runDocumentAnalysis(
  projectId: string,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.document_analysis.creditedAs;

  const { documentId, extraction } = await latestExtraction(projectId);
  if (!extraction || !documentId) {
    return insufficient(
      "document_analysis",
      engineUsed,
      ["a plan document with an extraction for this project"],
      nowIso,
    );
  }

  // Footprint dims, if recorded as building facts (deterministic
  // lookup — null when absent; the checks handle null honestly).
  const footprintLength = numericFact(extraction, "footprint_length");
  const footprintWidth = numericFact(extraction, "footprint_width");
  const footprintArea =
    footprintLength !== null && footprintWidth !== null
      ? footprintLength * footprintWidth
      : null;

  // Existing deterministic checks — verbatim, unioned.
  const issues = [
    ...findImpossibleRooms(extraction.rooms, footprintLength, footprintWidth),
    ...findDuplicateRooms(extraction.rooms),
    ...findContradictoryFacts(extraction.buildingFacts),
    ...checkAreaTotals(extraction.rooms, footprintArea),
  ];

  return {
    tool: "document_analysis",
    permission: "read",
    status: "ok",
    executedAt: nowIso,
    engineUsed,
    result: {
      issues,
      warnings: extraction.warnings,
      precomputedIssues: extraction.issues,
      counts: {
        rooms: extraction.rooms.length,
        buildingFacts: extraction.buildingFacts.length,
      },
    },
    missingData:
      footprintLength === null || footprintWidth === null
        ? [
            "footprint dimensions (not recorded as building facts — area-total checks skipped)",
          ]
        : [],
    inputsUsed: [
      {
        key: "documentId",
        value: documentId,
        dataClass: USER_CLASS,
        source: "plan_documents (latest for this project)",
      },
      {
        key: "rooms",
        value: extraction.rooms.length,
        dataClass: "ai_extracted",
        source: "plan extraction (per-room review states carried)",
      },
    ],
    assumptions: extraction.warnings,
    dataFreshness: extraction.extractedAt,
    note: "Issues are the consistency engine's findings verbatim — nothing is auto-corrected or hidden.",
  };
}

// =========================================================
// 11. Market intelligence (approved prices, project's OWN region)
// =========================================================

async function runMarketIntelligence(
  projectId: string,
  nowIso: string,
): Promise<ToolInvocation> {
  const engineUsed = AGENT_TOOLS.market_intelligence.creditedAs;

  const snap = await loadSnapshot(projectId, nowIso);
  if (!snap.ok)
    return insufficient("market_intelligence", engineUsed, ["visible project data"], nowIso);

  const marketCode = snap.data.region.marketCode ?? snap.data.region.countryCode;
  if (!marketCode) {
    return insufficient(
      "market_intelligence",
      engineUsed,
      [
        "a confirmed project location — no market profile applies, and NO other region's prices are substituted",
      ],
      nowIso,
    );
  }

  // Existing query layer — verbatim approved prices for THIS region.
  const prices = await fetchApprovedPrices(marketCode);
  const lastUpdated = prices
    .map((p) => p.last_updated)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    tool: "market_intelligence",
    permission: "read",
    status: prices.length > 0 ? "ok" : "insufficient_data",
    executedAt: nowIso,
    engineUsed,
    result: prices,
    missingData:
      prices.length === 0
        ? [
            `approved market prices for market "${marketCode}" (none on record — none substituted)`,
          ]
        : [],
    inputsUsed: [
      {
        key: "marketCode",
        value: marketCode,
        dataClass: USER_CLASS,
        source: "project location record (via project snapshot)",
      },
    ],
    assumptions: [
      "Prices are the approved (validated) records only — raw observations and other markets' data are never shown as this project's prices.",
    ],
    dataFreshness: String(lastUpdated ?? nowIso),
    note: "Prices are returned verbatim from mi_approved_prices for the project's own market.",
  };
}

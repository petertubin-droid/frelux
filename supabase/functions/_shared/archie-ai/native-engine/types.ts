// =========================================================
// ARCHIE NATIVE INTELLIGENCE ENGINE — SHARED CORE TYPES
// supabase/functions/_shared/archie-ai/native-engine/types.ts
//
// The foundational processing layer of ARCHIE's own native
// intelligence (owner directive: "BUILD ARCHIE'S OWN NATIVE
// INDEPENDENT INTELLIGENCE ENGINE AS A FOUNDATIONAL CORE
// COMPONENT"). Zero external AI APIs. Every subsystem here is
// REAL executable code with measurable capabilities — no
// mocks, no scripts, no placeholders. Where a capability is
// not yet implemented, it is reported honestly (see
// capabilities.ts) instead of faked.
//
// Permanent architecture:
//   ARCHIE NATIVE ENGINE → MEMORY → KNOWLEDGE → REASONING →
//   TOOLS → LEARNING → VERIFICATION → IMPROVEMENT
// =========================================================

/** A knowledge fact. SPO triple + qualifiers, with
 *  confidence and full provenance. */
export interface Fact {
  id: string;
  subject: string;
  predicate: string;
  /** Object value — string or structured JSON. */
  object: unknown;
  qualifiers?: Record<string, unknown>;
  /** 0..1 calibrated confidence. */
  confidence: number;
  /** Where this fact came from: owner teaching, inference, web research. */
  provenance: {
    source: "owner-taught" | "inferred" | "web-research" | "seed";
    /** Derivation chain for inferred facts (rule + premise fact ids). */
    derivation?: {
      ruleId: string;
      premiseIds: string[];
      /** Variable bindings used by general (variable) rules —
       * part of the honest proof record (P1 unification). */
      binding?: Record<string, string>;
    };
    /** Free-form origin note (e.g. "conversation 2026-09-10"). */
    note?: string;
  };
  status: "candidate" | "validated" | "uncertain";
  validatedCount: number;
  createdAt: string;
}

/** Two facts assert different objects for the same SPO. */
export interface FactConflict {
  kind: "contradiction";
  subject: string;
  predicate: string;
  conflictingFactIds: string[];
}

export interface Rule {
  id: string;
  /** All conditions must match (conjunction). */
  conditions: FactPattern[];
  produces: { subject: string; predicate: string; object: unknown };
  /** 0..1 rule strength — derived confidence = min(premise conf) × weight. */
  weight: number;
  description: string;
}

/** SPO pattern; "" / undefined = wildcard, regex-able values. */
export interface FactPattern {
  subject?: string;
  predicate?: string;
  /** Exact value match when a non-regex primitive is given. */
  object?: unknown;
}

export interface InferenceExplanation {
  derivedFactId: string;
  ruleId: string;
  premiseFacts: Fact[];
  confidence: number;
}

/** Planner operator: a real capability step ARCHIE can execute. */
export interface Operator {
  id: string;
  description: string;
  /** Goal this operator achieves (matched against a goal pattern). */
  achieves: FactPattern;
  /** Preconditions that must hold before execution. */
  preconditions: FactPattern[];
  /** Effects asserted after execution. */
  effects: Fact[];
  /** Lower is preferred; used for plan ranking. */
  cost: number;
}

export interface PlanStep {
  operatorId: string;
  achieves: string;
  satisfies: string;
  missingPreconditions: string[];
}

export interface Plan {
  goal: string;
  steps: PlanStep[];
  /** Honest: false when preconditions are missing. */
  executable: boolean;
  totalCost: number;
  gapReport: string[];
}

export interface ToolSpecInternal {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

export interface ToolInvocation {
  tool: string;
  ok: boolean;
  output: unknown;
  /** Honest failure reason — never a fake result. */
  error?: string;
  durationMs: number;
}

/** Working-memory conversation turn. */
export interface MemoryTurn {
  role: "owner" | "archie";
  text: string;
  at: number;
  /** Token-bag vector for salience retrieval. */
  vector: Map<string, number>;
  /** Raw TF-IDF cosine relevance to the retrieval query.
   *  Episodic recall must clear a relevance floor — recency
   *  alone never counts as remembering. */
  relevance?: number;
}

export interface RetrievedContext {
  salientTurns: MemoryTurn[];
  salientFacts: Fact[];
}

/** Outcome of an engine action, used for reinforcement learning. */
export interface LearningOutcome {
  id: string;
  kind: "success" | "failure" | "correction";
  /** What was being attempted. */
  task: string;
  /** Contributing fact/rule/operator ids for credit assignment. */
  contributing: string[];
  timestamp: string;
}

/** Honest capability maturity — the heart of "never pretend". */
export type CapabilityMaturity =
  "OPERATIONAL" | "DEVELOPING" | "NOT_IMPLEMENTED";

export interface CapabilityReport {
  id: string;
  description: string;
  maturity: CapabilityMaturity;
  /** How this claim is measured (test file(s)). */
  measuredBy: string;
}

export interface EngineDiagnostics {
  engineId: string;
  uptimeMs: number;
  capabilities: CapabilityReport[];
  counts: {
    facts: number;
    validatedFacts: number;
    rules: number;
    operators: number;
    tools: number;
    memoryTurns: number;
    outcomes: number;
    inferences: number;
  };
  calibration: {
    /** Mean predicted confidence of completed inferences. */
    meanConfidence: number;
    /** Self-checks run / contradictions caught. */
    selfChecksRun: number;
    contradictionsCaught: number;
  };
  persistence: {
    facts: boolean;
    outcomes: boolean;
    note: string;
  };
}

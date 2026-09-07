// =========================================================
// FRELUX PROJECT AGENT — CORE TYPES (Phase 6, Stage 1)
//
// The Project Agent is a project-scoped intelligence layer that:
//   OBSERVES project data → ANALYZES it → RECOMMENDS → PREPARES
//   actions → obtains user APPROVAL → EXECUTES via authoritative
//   FRELUX tools → VERIFIES results — every step auditable.
//
// It NEVER replaces deterministic engines, never mutates project
// data without explicit approval, and never invents facts. Every
// piece of information carries its data class; nothing upgrades
// from "ai_extracted" to "verified" silently.
// =========================================================

import type { AgentLifecycleState, AgentPermission } from "./states";

/** Data classes — identical taxonomy to Property Intelligence. */
export type AgentDataClass =
  | "verified"
  | "user_provided"
  | "ai_extracted"
  | "estimated"
  | "assumption"
  | "ai_analysis"
  | "unavailable";

export const AGENT_DATA_CLASS_LABELS: Record<AgentDataClass, string> = {
  verified: "Verified",
  user_provided: "User provided",
  ai_extracted: "AI extracted (requires confirmation)",
  estimated: "Estimated (deterministic engine)",
  assumption: "Assumption",
  ai_analysis: "AI analysis of recorded data",
  unavailable: "Unavailable",
};

/** A single fact the agent knows, with full provenance. */
export interface AgentFact {
  id: string;
  key: string;
  value: unknown;
  dataClass: AgentDataClass;
  /** Where it came from (tool, table, document, user). */
  source: string;
  observedAt: string;
  /** Present only when dataClass is ai_extracted — must be confirmed. */
  requiresConfirmation?: boolean;
  note?: string;
}

/** A recommendation the agent produced from evidence. */
export interface AgentRecommendation {
  id: string;
  /** What is recommended. */
  recommendation: string;
  /** Evidence backing it — fact keys and what they show. */
  evidence: string[];
  /** Which project element it affects. */
  affectedElement: string;
  severity: "info" | "warning" | "critical";
  confidence: number;
  assumptions: string[];
  dataFreshness: string;
  recommendedNextStep: string;
  /** Deterministic lifecycle position. */
  state: AgentLifecycleState;
  createdAt: string;
}

/** An action the agent has prepared for user approval. */
export interface PreparedAction {
  id: string;
  kind: string;
  /** Human description of what will happen. */
  what: string;
  why: string;
  /** Data used — fact keys / engine ids, traceable. */
  dataUsed: string[];
  assumptions: string[];
  expectedResult: string;
  /** Permission level required (READ/PREPARE/CONFIRM/PROHIBITED). */
  permission: AgentPermission;
  approvalRequired: true;
  state: AgentLifecycleState;
  approval?: AgentApproval;
  createdAt: string;
}

/** An approval decision on a prepared action. */
export interface AgentApproval {
  id: string;
  actionId: string;
  state: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  requestedAt: string;
  /** Approvals expire — stale approvals must be re-requested. */
  expiresAt: string;
  decidedAt?: string;
  decidedBy?: string;
  /** Idempotency key — duplicate/double-tap submissions collapse. */
  idempotencyKey: string;
}

/** Result of an approved action's execution. */
export interface AgentExecution {
  id: string;
  actionId: string;
  approvalId: string;
  state: "pending" | "succeeded" | "failed" | "skipped";
  /** The authoritative FRELUX tool that actually did the work. */
  toolUsed?: string;
  result?: unknown;
  error?: string;
  startedAt: string;
  finishedAt?: string;
  /** One execution per approval — guards double execution. */
  attempt: number;
}

/** One auditable agent activity entry (append-only history). */
export interface AgentActivityEntry {
  id: string;
  projectId: string;
  kind:
    | "observation"
    | "analysis"
    | "recommendation"
    | "preparation"
    | "approval_request"
    | "approval_decision"
    | "execution"
    | "verification"
    | "error";
  state: AgentLifecycleState;
  /** What the agent / user did, in plain language. */
  summary: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

/** Project memory: the agent's persistent, provenance-tracked
 *  knowledge about ONE project. */
export interface ProjectAgentMemory {
  projectId: string;
  facts: AgentFact[];
  updatedAt: string;
}

/** A project-scoped agent session. */
export interface ProjectAgentSession {
  projectId: string;
  /** Current lifecycle state of the session. */
  state: AgentLifecycleState;
  /** IDs of active recommendations and prepared actions. */
  activeRecommendationIds: string[];
  activeActionIds: string[];
  startedAt: string;
  updatedAt: string;
}

/** Result envelope for agent persistence calls. */
export type AgentResult<T> =
  { ok: true; data: T } | { ok: false; error: AgentError };

export interface AgentError {
  code:
    | "project_not_found"
    | "not_authenticated"
    | "invalid_state"
    | "persistence_error"
    | "prohibited_action";
  message: string;
}

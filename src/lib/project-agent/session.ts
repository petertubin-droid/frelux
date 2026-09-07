// =========================================================
// FRELUX PROJECT AGENT — SESSION, MEMORY & ACTIVITY (Stage 1)
//
// Project-scoped persistence. Hard rules:
//   - Every read/write goes through the user-scoped supabase
//     client; RLS (created_by = auth.uid()) is the isolation wall.
//     A user can never touch another user's agent data.
//   - The agent session is resolved per project: a project that is
//     not visible to the caller resolves to project_not_found —
//     there is no "fallback" that could leak cross-project data.
//   - Reload/recovery: sessions and memory are stored server-side
//     and are re-loadable at any time; a lost in-memory state is
//     never a reason to guess.
// =========================================================

import { supabase } from "@/lib/supabase";
import type {
  AgentActivityEntry,
  AgentResult,
  ProjectAgentMemory,
  ProjectAgentSession,
  AgentFact,
} from "./types";
import {
  applyTransition,
  isTerminal,
  type AgentLifecycleState,
} from "./states";

// =========================================================
// Session
// =========================================================

interface SessionRow {
  project_id: string;
  state: AgentLifecycleState;
  active_recommendation_ids: string[];
  active_action_ids: string[];
  started_at: string;
  updated_at: string;
}

/** Does the caller own/see this project? RLS answers; we just
 *  verify a row comes back. Unseen project → project_not_found
 *  (indistinguishable from non-existent by design). */
export async function assertProjectVisible(
  projectId: string,
): Promise<AgentResult<true>> {
  try {
    const { data, error } = await supabase
      .from("contractor_projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Project visibility check failed: ${error.message}`,
        },
      };
    if (!data)
      return {
        ok: false,
        error: {
          code: "project_not_found",
          message: "Project not found or not visible to this account.",
        },
      };
    return { ok: true, data: true };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Project visibility check failed: ${String(e)}`,
      },
    };
  }
}

/** Load the agent session for a project — creating it on first use. */
export async function loadAgentSession(
  projectId: string,
  nowIso: string,
): Promise<AgentResult<ProjectAgentSession>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  try {
    const { data, error } = await supabase
      .from("project_agent_sessions")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Session load failed: ${error.message}`,
        },
      };

    if (data) {
      const row = data as SessionRow;
      return {
        ok: true,
        data: {
          projectId: row.project_id,
          state: row.state,
          activeRecommendationIds: row.active_recommendation_ids ?? [],
          activeActionIds: row.active_action_ids ?? [],
          startedAt: row.started_at,
          updatedAt: row.updated_at,
        },
      };
    }

    // First use — create the session in the observed state.
    const session: ProjectAgentSession = {
      projectId,
      state: "observed",
      activeRecommendationIds: [],
      activeActionIds: [],
      startedAt: nowIso,
      updatedAt: nowIso,
    };
    const { error: insertError } = await supabase
      .from("project_agent_sessions")
      .insert({
        project_id: projectId,
        state: session.state,
        active_recommendation_ids: [],
        active_action_ids: [],
        started_at: nowIso,
        updated_at: nowIso,
      });
    if (insertError)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Session create failed: ${insertError.message}`,
        },
      };
    return { ok: true, data: session };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Session load failed: ${String(e)}`,
      },
    };
  }
}

/** Persist a session state change (validated by the state machine). */
export async function saveAgentSessionState(
  projectId: string,
  from: AgentLifecycleState,
  to: AgentLifecycleState,
  nowIso: string,
): Promise<AgentResult<ProjectAgentSession>> {
  const check = applyTransition({ state: from }, to, nowIso);
  if (!check.ok)
    return {
      ok: false,
      error: { code: "invalid_state", message: check.reason },
    };

  try {
    const { data, error } = await supabase
      .from("project_agent_sessions")
      .update({ state: to, updated_at: nowIso })
      .eq("project_id", projectId)
      .select("*")
      .maybeSingle();
    if (error || !data) {
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Session update failed: ${error?.message ?? "row not found"}`,
        },
      };
    }
    const row = data as SessionRow;
    return {
      ok: true,
      data: {
        projectId: row.project_id,
        state: row.state,
        activeRecommendationIds: row.active_recommendation_ids ?? [],
        activeActionIds: row.active_action_ids ?? [],
        startedAt: row.started_at,
        updatedAt: row.updated_at,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Session update failed: ${String(e)}`,
      },
    };
  }
}

// =========================================================
// Project memory — provenance-tracked facts
// =========================================================

interface MemoryRow {
  project_id: string;
  facts: AgentFact[];
  updated_at: string;
}

export async function loadProjectMemory(
  projectId: string,
): Promise<AgentResult<ProjectAgentMemory>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;
  try {
    const { data, error } = await supabase
      .from("project_agent_memory")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Memory load failed: ${error.message}`,
        },
      };
    const row = data as MemoryRow | null;
    return {
      ok: true,
      data: {
        projectId,
        facts: row?.facts ?? [],
        updatedAt: row?.updated_at ?? new Date(0).toISOString(),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Memory load failed: ${String(e)}`,
      },
    };
  }
}

/**
 * Record a fact in project memory. A fact NEVER overwrites a
 * 'verified' fact with a lower-class one — the trust boundary is
 * structural (same rule as Document Intelligence §5).
 */
export async function recordFact(
  projectId: string,
  fact: AgentFact,
  nowIso: string,
): Promise<AgentResult<ProjectAgentMemory>> {
  const existing = await loadProjectMemory(projectId);
  if (!existing.ok) return existing;

  const facts = [...existing.data.facts];
  const idx = facts.findIndex((f) => f.key === fact.key);
  if (idx >= 0) {
    const current = facts[idx];
    const rank: Record<string, number> = {
      verified: 5,
      user_provided: 4,
      estimated: 3,
      assumption: 2,
      ai_extracted: 1,
      ai_analysis: 1,
      unavailable: 0,
    };
    if (
      current.dataClass === "verified" &&
      rank[fact.dataClass] < rank.verified
    ) {
      return {
        ok: false,
        error: {
          code: "invalid_state",
          message: `Refused: fact '${fact.key}' is verified; a ${fact.dataClass} value may not overwrite it.`,
        },
      };
    }
    facts[idx] = fact;
  } else {
    facts.push(fact);
  }

  try {
    const { error } = await supabase
      .from("project_agent_memory")
      .upsert(
        { project_id: projectId, facts, updated_at: nowIso },
        { onConflict: "project_id" },
      );
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Memory write failed: ${error.message}`,
        },
      };
    return { ok: true, data: { projectId, facts, updatedAt: nowIso } };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Memory write failed: ${String(e)}`,
      },
    };
  }
}

// =========================================================
// Activity history — append-only audit trail
// =========================================================

export async function recordActivity(
  projectId: string,
  entry: Omit<AgentActivityEntry, "id" | "projectId" | "createdAt">,
  nowIso: string,
): Promise<AgentResult<AgentActivityEntry>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;

  const full: AgentActivityEntry = {
    id: crypto.randomUUID(),
    projectId,
    createdAt: nowIso,
    ...entry,
  };
  try {
    const { error } = await supabase.from("project_agent_activity").insert({
      id: full.id,
      project_id: projectId,
      kind: full.kind,
      state: full.state,
      summary: full.summary,
      payload: full.payload ?? null,
      created_at: full.createdAt,
    });
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Activity write failed: ${error.message}`,
        },
      };
    return { ok: true, data: full };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Activity write failed: ${String(e)}`,
      },
    };
  }
}

export async function loadActivityHistory(
  projectId: string,
  limit = 100,
): Promise<AgentResult<AgentActivityEntry[]>> {
  const visible = await assertProjectVisible(projectId);
  if (!visible.ok) return visible;
  try {
    const { data, error } = await supabase
      .from("project_agent_activity")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error)
      return {
        ok: false,
        error: {
          code: "persistence_error",
          message: `Activity load failed: ${error.message}`,
        },
      };
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return {
      ok: true,
      data: rows.map((r) => ({
        id: String(r.id),
        projectId: String(r.project_id),
        kind: r.kind as AgentActivityEntry["kind"],
        state: r.state as AgentLifecycleState,
        summary: String(r.summary ?? ""),
        payload: (r.payload ?? undefined) as
          Record<string, unknown> | undefined,
        createdAt: String(r.created_at),
      })),
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "persistence_error",
        message: `Activity load failed: ${String(e)}`,
      },
    };
  }
}

export { isTerminal };

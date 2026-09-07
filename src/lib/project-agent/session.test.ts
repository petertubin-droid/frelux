// =========================================================
// PROJECT AGENT — SESSION / MEMORY / ACTIVITY TESTS (Stage 1)
//
// Acceptance coverage:
//   - project isolation: an unseen project → project_not_found,
//     nothing about other users' projects is ever read (RLS wall
//     is simulated by the mock returning null for unknown ids)
//   - persistence + reload/recovery: a stored session/memory is
//     faithfully reloaded; a fresh project gets a new session
//   - authentication: supabase failures surface as errors, never
//     as fabricated data
//   - memory trust boundary: verified facts are never overwritten
//     by lower-class values
//   - activity history: append + ordered read back
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => {
  interface Chain {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    onConflict: ReturnType<typeof vi.fn>;
    /** captured eq() value — the row key being selected. */
    __lastEq: string;
  }
  const state: {
    projects: Record<string, unknown>;
    sessions: Record<string, unknown>;
    memory: Record<string, unknown>;
    activity: Array<Record<string, unknown>>;
    failTables: string[];
  } = { projects: {}, sessions: {}, memory: {}, activity: [], failTables: [] };

  function makeChain(table: string): Chain {
    const chain = { __lastEq: "" } as Chain;
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn((row: Record<string, unknown>) => {
      if (state.failTables.includes(table))
        return { error: { message: "insert failed" } };
      if (table === "project_agent_activity") state.activity.push(row);
      return { error: null };
    });
    chain.update = vi.fn((patch: Record<string, unknown>) => {
      // supabase update().select().eq().maybeSingle() chain — returns
      // the patched row so callers see the persisted state.
      const sel = {
        select: vi.fn(() => sel),
        eq: vi.fn((_col: string, val: string) => {
          sel.__proj = val;
          return sel;
        }),
        maybeSingle: vi.fn(() => {
          if (state.failTables.includes(table))
            return { data: null, error: { message: "update failed" } };
          const row =
            table === "project_agent_sessions"
              ? state.sessions[sel.__proj]
              : null;
          return { data: row ? { ...row, ...patch } : null, error: null };
        }),
        __proj: "" as string,
      };
      return sel;
    });
    chain.upsert = vi.fn(() => {
      if (state.failTables.includes(table))
        return { error: { message: "upsert failed" } };
      return { error: null };
    });
    chain.eq = vi.fn((_col: string, val: string) => {
      chain.__lastEq = val;
      return chain;
    });
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => {
      if (state.failTables.includes(table))
        return { data: null, error: { message: "select failed" } };
      if (table === "contractor_projects") {
        return { data: state.projects[chain.__lastEq] ?? null, error: null };
      }
      if (table === "project_agent_sessions") {
        return { data: state.sessions[chain.__lastEq] ?? null, error: null };
      }
      if (table === "project_agent_memory") {
        return { data: state.memory[chain.__lastEq] ?? null, error: null };
      }
      return { data: null, error: null };
    });
    return chain;
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "project_agent_activity") {
          const chain = makeChain(table);
          chain.select = vi.fn(() => chain);
          chain.maybeSingle = vi.fn(() => ({ data: null, error: null }));
          // activity list read: return copy ordered desc
          chain.limit = vi.fn(() => ({
            data: [...state.activity]
              .sort((a, b) =>
                String(b.created_at).localeCompare(String(a.created_at)),
              )
              .map((r) => ({ ...r })),
            error: null,
          }));
          return chain;
        }
        return makeChain(table);
      }),
      __state: state,
    },
  };
});

import { supabase } from "@/lib/supabase";
import {
  loadAgentSession,
  saveAgentSessionState,
  loadProjectMemory,
  recordFact,
  recordActivity,
  loadActivityHistory,
} from "./session";
import type { AgentFact } from "./types";

const NOW = "2026-09-07T14:00:00Z";
const typedSupabase = supabase as unknown as {
  __state: {
    projects: Record<string, unknown>;
    sessions: Record<string, unknown>;
    memory: Record<string, unknown>;
    activity: Array<Record<string, unknown>>;
    failTables: string[];
  };
};

function fact(
  key: string,
  dataClass: AgentFact["dataClass"],
  value: unknown = 42,
): AgentFact {
  return {
    id: `${key}-id`,
    key,
    value,
    dataClass,
    source: "test",
    observedAt: NOW,
  };
}

beforeEach(() => {
  typedSupabase.__state.projects = { "proj-1": { id: "proj-1" } };
  typedSupabase.__state.sessions = {};
  typedSupabase.__state.memory = {};
  typedSupabase.__state.activity = [];
  typedSupabase.__state.failTables = [];
});

describe("project isolation (RLS-shaped)", () => {
  it("a project invisible to the caller → project_not_found", async () => {
    const result = await loadAgentSession("proj-other-user", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("project_not_found");
      expect(result.error.message).toContain("not visible");
    }
  });

  it("memory, activity write and activity read all refuse invisible projects", async () => {
    expect((await loadProjectMemory("proj-x")).ok).toBe(false);
    expect(
      (await recordFact("proj-x", fact("width", "user_provided"), NOW)).ok,
    ).toBe(false);
    expect(
      (
        await recordActivity(
          "proj-x",
          { kind: "observation", state: "observed", summary: "s" },
          NOW,
        )
      ).ok,
    ).toBe(false);
    expect((await loadActivityHistory("proj-x")).ok).toBe(false);
  });

  it("saveAgentSessionState refuses invisible projects too", async () => {
    const result = await saveAgentSessionState(
      "proj-x",
      "observed",
      "analyzed",
      NOW,
    );
    expect(result.ok).toBe(false);
  });
});

describe("session persistence & reload/recovery", () => {
  it("creates a fresh session in observed state on first use", async () => {
    const result = await loadAgentSession("proj-1", NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe("observed");
      expect(result.data.activeRecommendationIds).toEqual([]);
    }
  });

  it("reloads a stored session faithfully (recovery after reload)", async () => {
    typedSupabase.__state.sessions["proj-1"] = {
      project_id: "proj-1",
      state: "recommended",
      active_recommendation_ids: ["rec-1"],
      active_action_ids: [],
      started_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-02T00:00:00Z",
    };
    const result = await loadAgentSession("proj-1", NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.state).toBe("recommended");
      expect(result.data.activeRecommendationIds).toEqual(["rec-1"]);
      expect(result.data.startedAt).toBe("2026-09-01T00:00:00Z");
    }
  });

  it("applies a valid state transition and persists it", async () => {
    typedSupabase.__state.sessions["proj-1"] = {
      project_id: "proj-1",
      state: "analyzed",
      active_recommendation_ids: [],
      active_action_ids: [],
      started_at: NOW,
      updated_at: NOW,
    };
    const result = await saveAgentSessionState(
      "proj-1",
      "analyzed",
      "recommended",
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.state).toBe("recommended");
  });

  it("refuses an invalid transition at the persistence boundary", async () => {
    typedSupabase.__state.sessions["proj-1"] = {
      project_id: "proj-1",
      state: "observed",
      active_recommendation_ids: [],
      active_action_ids: [],
      started_at: NOW,
      updated_at: NOW,
    };
    const result = await saveAgentSessionState(
      "proj-1",
      "observed",
      "approved",
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_state");
  });

  it("supabase failures surface as persistence errors — never fabricated state", async () => {
    typedSupabase.__state.failTables = ["project_agent_sessions"];
    const result = await loadAgentSession("proj-1", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("persistence_error");
      expect(result.error.message).toContain("Session");
    }
  });
});

describe("project memory", () => {
  it("starts empty for a new project", async () => {
    const result = await loadProjectMemory("proj-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.facts).toEqual([]);
  });

  it("records and reloads facts with their data class", async () => {
    await recordFact("proj-1", fact("roof_area", "estimated", 120), NOW);
    // simulate the stored row for reload
    typedSupabase.__state.memory["proj-1"] = {
      project_id: "proj-1",
      facts: [fact("roof_area", "estimated", 120)],
      updated_at: NOW,
    };
    const result = await loadProjectMemory("proj-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.facts[0].key).toBe("roof_area");
      expect(result.data.facts[0].dataClass).toBe("estimated");
    }
  });

  it("TRUST BOUNDARY: a lower-class fact may never overwrite a verified fact", async () => {
    typedSupabase.__state.memory["proj-1"] = {
      project_id: "proj-1",
      facts: [fact("roof_area", "verified", 120)],
      updated_at: NOW,
    };
    const result = await recordFact(
      "proj-1",
      fact("roof_area", "ai_extracted", 999),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_state");
      expect(result.error.message).toContain("may not overwrite");
    }
  });

  it("a verified fact CAN replace a lower-class fact", async () => {
    typedSupabase.__state.memory["proj-1"] = {
      project_id: "proj-1",
      facts: [fact("roof_area", "ai_extracted", 999)],
      updated_at: NOW,
    };
    const result = await recordFact(
      "proj-1",
      fact("roof_area", "verified", 120),
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.data.facts.find((f) => f.key === "roof_area")?.dataClass,
      ).toBe("verified");
    }
  });
});

describe("activity history (audit trail)", () => {
  it("appends entries and reads them back newest-first", async () => {
    await recordActivity(
      "proj-1",
      {
        kind: "observation",
        state: "observed",
        summary: "Observed project data",
      },
      "2026-09-07T13:00:00Z",
    );
    await recordActivity(
      "proj-1",
      { kind: "analysis", state: "analyzed", summary: "Analyzed budget" },
      "2026-09-07T13:30:00Z",
    );
    const result = await loadActivityHistory("proj-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].summary).toBe("Analyzed budget"); // newest first
      expect(result.data[1].summary).toBe("Observed project data");
    }
  });

  it("a failed write returns an error — history is never silently lost", async () => {
    typedSupabase.__state.failTables = ["project_agent_activity"];
    const result = await recordActivity(
      "proj-1",
      { kind: "error", state: "observed", summary: "x" },
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("persistence_error");
  });
});

/**
 * Engine-1A #1 persistence tests.
 *
 * A fake Supabase client exercises the repository's real logic: payload
 * shapes, validation, duplicate-label refusal, chain validation and honest
 * error reporting. No network, no live database.
 */

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { IfcModelElement } from "../ifc-model-loader";
import {
  appendRevision,
  buildElementIndex,
  buildProjectBundle,
  deleteProject,
  listProjects,
  loadProject,
  saveProject,
  validateProjectInput,
  type BimProjectRecord,
  type BimRevisionRecord,
} from "../project-store";

interface FakeState {
  user: { id: string } | null;
  projects: BimProjectRecord[];
  revisions: BimRevisionRecord[];
  inserts: Array<{ table: string; payload: Record<string, unknown> }>;
  updates: Array<{ table: string; payload: Record<string, unknown> }>;
}

function makeClient(state: FakeState): SupabaseClient {
  function table(name: string) {
    const rows = name === "bim_projects" ? state.projects : state.revisions;
    const api: Record<string, unknown> = {};
    const chain = (predicate?: (r: never) => boolean) => {
      const filtered = predicate ? rows.filter(predicate as never) : rows;
      return {
        data: filtered,
        error: null,
        single: async () => ({ data: filtered[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
        order: () => chain(predicate),
        eq: (col: string, val: unknown) =>
          chain(
            ((r: Record<string, unknown>) => r[col] === val) as unknown as (
              r: never,
            ) => boolean,
          ),
        select: () => chain(predicate),
        insert: (payload: Record<string, unknown>) => {
          state.inserts.push({ table: name, payload });
          const created = {
            id: `id-${state.inserts.length}`,
            created_at: "2026-11-19T00:00:00Z",
            updated_at: "2026-11-19T00:00:00Z",
            ...payload,
          } as unknown as never;
          rows.push(created as never);
          return {
            select: () => ({
              single: async () => ({ data: created, error: null }),
            }),
          };
        },
        update: (payload: Record<string, unknown>) => {
          state.updates.push({ table: name, payload });
          return { eq: async () => ({ error: null }) };
        },
        delete: () => ({ eq: async () => ({ error: null }) }),
      };
    };
    api.select = () => chain();
    api.insert = (payload: Record<string, unknown>) => chain().insert(payload);
    api.update = (payload: Record<string, unknown>) => chain().update(payload);
    api.delete = () => chain().delete();
    return api;
  }

  return {
    from: (name: string) => table(name),
    auth: {
      getUser: async () =>
        state.user
          ? { data: { user: state.user }, error: null }
          : { data: { user: null }, error: null },
    },
  } as unknown as SupabaseClient;
}

function emptyState(user: string | null = "user-1"): FakeState {
  return {
    user: user ? { id: user } : null,
    projects: [],
    revisions: [],
    inserts: [],
    updates: [],
  };
}

function projectRow(
  overrides: Partial<BimProjectRecord> = {},
): BimProjectRecord {
  return {
    id: "proj-1",
    owner_id: "user-1",
    name: "Riverside house",
    description: null,
    market: "GB",
    status: "draft",
    active_revision_id: null,
    created_at: "2026-11-19T00:00:00Z",
    updated_at: "2026-11-19T00:00:00Z",
    ...overrides,
  };
}

function revisionRow(
  overrides: Partial<BimRevisionRecord> = {},
): BimRevisionRecord {
  return {
    id: "rev-1",
    project_id: "proj-1",
    label: "Rev A",
    issued_at: "2026-11-19T00:00:00Z",
    parent_revision_id: null,
    element_index: { g1: { parts: 1, type: "IFCWALL" } },
    element_count: 1,
    source_file_name: "arch.ifc",
    schema_name: "IFC4",
    notes: null,
    ...overrides,
  };
}

describe("validateProjectInput", () => {
  it("trims the name and defaults status to draft", () => {
    const r = validateProjectInput({ name: "  Riverside  " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.name).toBe("Riverside");
      expect(r.data.status).toBe("draft");
      expect(r.data.market).toBeNull();
    }
  });

  it("refuses an empty name", () => {
    const r = validateProjectInput({ name: "   " });
    expect(r).toMatchObject({ ok: false, code: "invalid_input" });
  });

  it("refuses a non ISO-3166 market code", () => {
    const r = validateProjectInput({ name: "X", market: "gb" });
    expect(r).toMatchObject({ ok: false, code: "invalid_input" });
  });
});

describe("buildElementIndex", () => {
  it("indexes GlobalId -> parts/type and counts skipped elements", () => {
    const elements = [
      { globalId: "w1", ifcClass: "IFCWALL", geometry: [{}, {}] },
      { globalId: "", ifcClass: "IFCSLAB", geometry: [{}] },
      { globalId: "s1", ifcClass: "IFCSLAB", geometry: [] },
    ] as unknown as IfcModelElement[];
    const { index, skipped } = buildElementIndex(elements);
    expect(index.w1).toEqual({ parts: 2, type: "IFCWALL" });
    expect(index.s1).toEqual({ parts: 0, type: "IFCSLAB" });
    expect(skipped).toBe(1);
  });
});

describe("saveProject", () => {
  it("inserts an owner-scoped row and returns it", async () => {
    const state = emptyState();
    const client = makeClient(state);
    const r = await saveProject(client, { name: "Riverside", market: "GB" });
    expect(r.ok).toBe(true);
    const payload = state.inserts[0].payload;
    expect(payload.owner_id).toBe("user-1");
    expect(payload.name).toBe("Riverside");
    expect(payload.market).toBe("GB");
    expect(payload.status).toBe("draft");
  });

  it("refuses to save when nobody is signed in", async () => {
    const client = makeClient(emptyState(null));
    const r = await saveProject(client, { name: "X" });
    expect(r).toMatchObject({ ok: false, code: "not_authenticated" });
  });

  it("never writes invalid input", async () => {
    const state = emptyState();
    const r = await saveProject(makeClient(state), { name: "" });
    expect(r.ok).toBe(false);
    expect(state.inserts).toHaveLength(0);
  });
});

describe("listProjects", () => {
  it("returns only the signed-in user's projects", async () => {
    const state = emptyState();
    state.projects = [
      projectRow({ id: "p1" }),
      projectRow({ id: "p2", owner_id: "someone-else" }),
    ];
    const r = await listProjects(makeClient(state));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.map((p) => p.id)).toEqual(["p1"]);
  });
});

describe("loadProject", () => {
  it("assembles the bundle with the active revision resolved", async () => {
    const state = emptyState();
    state.projects = [projectRow({ active_revision_id: "rev-2" })];
    state.revisions = [
      revisionRow({ id: "rev-1", label: "Rev A" }),
      revisionRow({ id: "rev-2", label: "Rev B", parent_revision_id: "rev-1" }),
    ];
    const r = await loadProject(makeClient(state), "proj-1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.revisions.map((v) => v.label)).toEqual(["Rev A", "Rev B"]);
      expect(r.data.active_revision?.id).toBe("rev-2");
    }
  });

  it("reports a broken stored chain instead of showing a clean history", () => {
    const bundle = buildProjectBundle(projectRow(), [
      revisionRow({
        id: "rev-2",
        label: "Rev B",
        parent_revision_id: "missing",
      }),
    ]);
    expect(bundle).toMatchObject({ ok: false, code: "broken_chain" });
  });

  it("returns not_found for a project the user cannot see", async () => {
    const r = await loadProject(makeClient(emptyState()), "nope");
    expect(r).toMatchObject({ ok: false, code: "not_found" });
  });
});

describe("appendRevision", () => {
  it("inserts the revision and points the project at it", async () => {
    const state = emptyState();
    state.projects = [projectRow()];
    const r = await appendRevision(makeClient(state), {
      projectId: "proj-1",
      label: "Rev A",
      elementIndex: { g1: { parts: 1, type: "IFCWALL" } },
      schemaName: "IFC4",
    });
    expect(r.ok).toBe(true);
    const insert = state.inserts.find((i) => i.table === "bim_model_revisions");
    expect(insert?.payload.element_count).toBe(1);
    expect(insert?.payload.label).toBe("Rev A");
    const update = state.updates.find((u) => u.table === "bim_projects");
    expect(update?.payload.active_revision_id).toBeDefined();
  });

  it("refuses a duplicate label in the same project", async () => {
    const state = emptyState();
    state.revisions = [revisionRow({ label: "Rev A" })];
    const r = await appendRevision(makeClient(state), {
      projectId: "proj-1",
      label: "Rev A",
      elementIndex: {},
    });
    expect(r).toMatchObject({ ok: false, code: "duplicate_label" });
    expect(state.inserts).toHaveLength(0);
  });

  it("refuses a parent from another project", async () => {
    const state = emptyState();
    state.revisions = [revisionRow({ id: "rev-1" })];
    const r = await appendRevision(makeClient(state), {
      projectId: "proj-1",
      label: "Rev B",
      parentRevisionId: "other-project-rev",
      elementIndex: {},
    });
    expect(r).toMatchObject({ ok: false, code: "invalid_input" });
    expect(state.inserts).toHaveLength(0);
  });
});

describe("deleteProject", () => {
  it("returns the deleted id", async () => {
    const r = await deleteProject(makeClient(emptyState()), "proj-1");
    expect(r).toEqual({ ok: true, data: { id: "proj-1" } });
  });
});

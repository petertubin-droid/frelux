// =========================================================
// WORKFLOW CROSS-ROLE HANDOFF — contract tests
//
// Pinned here:
//   * invites are validated client-side (email shape, role)
//     and always stored lowercased
//   * a duplicate invite surfaces the unique violation (23505)
//     as a friendly "already on this document" error
//   * grant/remove write an audit comment AFTER the row
//     operation, fire-and-forget (never blocks, never throws)
//   * removeWorkflowParticipant is idempotent — a missing row
//     is not an error
//   * list returns rows scoped by document_id
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const insertResult = { data: null as Row | null, error: null as unknown };
const deleteError = { error: null as unknown };
const selectRows = { rows: [] as Row[] };

// Chainable mock: builder methods return the chain; awaiting
// the chain (its then()) resolves with the terminal result
// chosen by the initiating method (select/insert/delete).
// single() is the insert-chain terminator returning the
// single() result shape.
function makeFrom() {
  const chain: Record<string, unknown> = {};
  let mode = "select";
  const terminal = () => {
    if (mode === "insert") return insertResult;
    if (mode === "delete") return { data: null, error: deleteError.error };
    return { data: selectRows.rows, error: null };
  };
  chain.select = vi.fn(() => {
    mode = "select";
    return chain;
  });
  chain.insert = vi.fn(() => {
    mode = "insert";
    return chain;
  });
  chain.delete = vi.fn(() => {
    mode = "delete";
    return chain;
  });
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(insertResult));
  chain.then = (res: (v: unknown) => unknown, rej: (v: unknown) => unknown) =>
    Promise.resolve(terminal()).then(res, rej);
  return chain;
}

const from = vi.fn((_table: string) => makeFrom());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => from(...(args as [string])),
  },
  isSupabaseConfigured: true,
}));

import {
  validateInvite,
  listWorkflowParticipants,
  inviteWorkflowParticipant,
  removeWorkflowParticipant,
} from "./participants";
import type { WorkflowDocument } from "./workflow-engine";

const DOC = {
  id: "99999999-9999-4999-8999-999999999999",
  project_id: "88888888-8888-4888-8888-888888888888",
  doc_type: "rfi",
  reference_code: "RFI-0001",
  title: "Ceiling void clearance",
  status: "open",
} as unknown as WorkflowDocument;

/** Calls to insert(), in order, across all from() chains. */
const insertCalls = (): Row[] =>
  from.mock.results.flatMap((r) => {
    const chain = r.value as Record<string, unknown>;
    const insert = chain.insert as unknown as {
      mock: { calls: unknown[][] };
    };
    return (insert.mock?.calls ?? []).map((c) => c[0] as Row);
  });

beforeEach(() => {
  insertResult.data = {
    id: "p1",
    document_id: DOC.id,
    email: "eng@site.com",
    participant_role: "reviewer",
    granted_by: null,
    created_at: "2026-10-14T12:00:00Z",
  };
  insertResult.error = null;
  deleteError.error = null;
  selectRows.rows = [];
  from.mockClear();
});

describe("validateInvite", () => {
  it("accepts valid emails for both roles", () => {
    expect(validateInvite("Eng@Site.com", "reviewer")).toBeNull();
    expect(validateInvite("a.b+c@d.co", "viewer")).toBeNull();
  });
  it("rejects broken emails and unknown roles", () => {
    expect(validateInvite("not-an-email", "reviewer")).toContain("valid email");
    expect(validateInvite("", "reviewer")).toContain("valid email");
    expect(validateInvite("a@b.co", "admin")).toContain("reviewer or viewer");
  });
});

describe("inviteWorkflowParticipant", () => {
  it("stores the invite lowercased and records an audit comment", async () => {
    const p = await inviteWorkflowParticipant(DOC, "ENG@Site.COM", "reviewer");
    expect(p.participant_role).toBe("reviewer");
    const calls = insertCalls();
    expect(calls.length).toBe(2);
    // First insert: the participant row, email lowercased.
    expect(calls[0].email).toBe("eng@site.com");
    expect(calls[0].document_id).toBe(DOC.id);
    expect(calls[0].participant_role).toBe("reviewer");
    // Second insert: the append-only audit comment.
    expect(calls[1].event_type).toBe("comment");
    expect(calls[1].note).toBe("Shared with eng@site.com as reviewer");
  });

  it("surfaces a duplicate invite as a friendly error", async () => {
    insertResult.data = null;
    insertResult.error = { code: "23505", message: "duplicate" };
    await expect(
      inviteWorkflowParticipant(DOC, "eng@site.com", "viewer"),
    ).rejects.toThrow("already on this document");
  });

  it("refuses an invalid email before any DB write", async () => {
    await expect(
      inviteWorkflowParticipant(DOC, "nope", "reviewer"),
    ).rejects.toThrow("valid email");
    expect(insertCalls().length).toBe(0);
  });
});

describe("removeWorkflowParticipant", () => {
  it("deletes by document + lowercased email and audits", async () => {
    await removeWorkflowParticipant(DOC, "ENG@site.com");
    const chain = from.mock.results[0].value as Record<string, unknown>;
    const del = chain.delete as unknown as { mock: { calls: unknown[][] } };
    expect(del.mock.calls.length).toBe(1);
    const eq = chain.eq as unknown as { mock: { calls: unknown[][] } };
    expect(eq.mock.calls[0][0]).toBe("document_id");
    expect(eq.mock.calls[0][1]).toBe(DOC.id);
    expect(eq.mock.calls[1][0]).toBe("email");
    expect(eq.mock.calls[1][1]).toBe("eng@site.com");
    // Audit comment lands after the delete.
    const calls = insertCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].note).toBe("Access removed for eng@site.com");
  });

  it("is idempotent — a missing row is not an error", async () => {
    deleteError.error = null;
    await expect(
      removeWorkflowParticipant(DOC, "gone@site.com"),
    ).resolves.toBeUndefined();
  });
});

describe("listWorkflowParticipants", () => {
  it("returns rows for the document", async () => {
    selectRows.rows = [
      {
        id: "p1",
        document_id: DOC.id,
        email: "eng@site.com",
        participant_role: "reviewer",
        granted_by: null,
        created_at: "2026-10-14T12:00:00Z",
      },
    ];
    const rows = await listWorkflowParticipants(DOC.id);
    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe("eng@site.com");
    const chain = from.mock.results[0].value as Record<string, unknown>;
    const eq = chain.eq as unknown as { mock: { calls: unknown[][] } };
    expect(eq.mock.calls[0][0]).toBe("document_id");
    expect(eq.mock.calls[0][1]).toBe(DOC.id);
  });
});

// =========================================================
// WORKFLOW QUERIES — OFFLINE-CONFLICT CONTRACT TESTS
//
// The workflow engine's core promise is an immutable audit
// trail. These tests pin the offline/failure behavior:
//
//   * transition: if the audit write fails AFTER the status
//     update persisted, the user gets an HONEST partial-state
//     error and the notification is NEVER fired (the edge
//     function delivers the latest event; firing without the
//     audit row would notify from stale data)
//   * transition: if the status update itself fails, nothing
//     else runs — no audit row, no notify
//   * revision: each of the three writes (revision row,
//     document pointer, audit row) reports its own partial
//     state honestly; a silent pass would make the NEXT
//     revision collide with the UNIQUE constraint
//   * comment: a failed insert throws (nothing persisted)
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

// Per-table, per-call results the tests drive.
const documentUpdate = { data: null as Row | null, error: null as unknown };
const eventInsert = { data: null, error: null as unknown };
const revisionInsert = { data: null, error: null as unknown };

function makeFrom(table: string) {
  const chain: Record<string, unknown> = {};
  let mode = table === "workflow_documents" ? "update" : "insert";
  const terminal = () => {
    if (table === "workflow_documents") return documentUpdate;
    if (table === "workflow_revisions") return revisionInsert;
    return eventInsert;
  };
  chain.update = vi.fn(() => {
    mode = "update";
    return chain;
  });
  chain.insert = vi.fn(() => {
    mode = "insert";
    return chain;
  });
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(documentUpdate));
  chain.then = (res: (v: unknown) => unknown, rej: (v: unknown) => unknown) =>
    Promise.resolve(terminal()).then(res, rej);
  void mode;
  return chain;
}

const from = vi.fn((table: string) => makeFrom(table));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (t: string) => from(t) },
  isSupabaseConfigured: true,
}));

vi.mock("./notifications", () => ({
  notifyWorkflowEvent: vi.fn(async () => undefined),
}));

import {
  transitionWorkflowDocument,
  addWorkflowRevision,
  addWorkflowComment,
} from "./queries";
import { notifyWorkflowEvent } from "./notifications";
import type { WorkflowDocument } from "./workflow-engine";

const notifyMock = vi.mocked(notifyWorkflowEvent);

const DOC = {
  id: "99999999-9999-4999-8999-999999999999",
  project_id: "88888888-8888-4888-8888-888888888888",
  doc_type: "rfi",
  reference_code: "RFI-0001",
  title: "Ceiling void clearance",
  status: "open",
  priority: "normal",
  revision_no: 1,
  amount: null,
  currency: "EUR",
  created_at: "2026-10-13T09:00:00Z",
  updated_at: "2026-10-13T09:00:00Z",
} as unknown as WorkflowDocument;

beforeEach(() => {
  documentUpdate.data = { ...DOC, status: "answered" };
  documentUpdate.error = null;
  eventInsert.data = null;
  eventInsert.error = null;
  revisionInsert.data = null;
  revisionInsert.error = null;
  from.mockClear();
  notifyMock.mockClear();
});

describe("transitionWorkflowDocument (offline conflicts)", () => {
  it("refuses an invalid transition before any write", async () => {
    await expect(transitionWorkflowDocument(DOC, "approved")).rejects.toThrow(
      "Invalid transition",
    );
    expect(from).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("happy path: update + audit succeed, notify fires once", async () => {
    await transitionWorkflowDocument(DOC, "answered");
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(DOC.id);
  });

  it("update failure: throws, writes NO audit row, never notifies", async () => {
    documentUpdate.data = null;
    documentUpdate.error = { message: "network unreachable" };
    await expect(transitionWorkflowDocument(DOC, "answered")).rejects.toThrow(
      "network unreachable",
    );
    expect(from).toHaveBeenCalledWith("workflow_documents");
    expect(from).not.toHaveBeenCalledWith("workflow_events");
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("audit-write failure: honest partial-state error, NO notify from a missing row", async () => {
    eventInsert.error = { message: "offline" };
    await expect(transitionWorkflowDocument(DOC, "answered")).rejects.toThrow(
      /audit record could not be written.*Refresh to verify/,
    );
    // The transition persisted, but a notify would deliver a
    // STALE latest event — so it must never fire.
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe("addWorkflowRevision (offline conflicts)", () => {
  it("happy path: all three writes succeed", async () => {
    await expect(
      addWorkflowRevision(DOC, { title: "Rev 2" }),
    ).resolves.toBeUndefined();
  });

  it("revision-row failure: throws, document and audit untouched", async () => {
    revisionInsert.error = { message: "conflict 23505" };
    await expect(addWorkflowRevision(DOC, { title: "Rev 2" })).rejects.toThrow(
      "conflict 23505",
    );
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("document-pointer failure: honest error — the revision exists but the doc still points at the old one", async () => {
    documentUpdate.data = null;
    documentUpdate.error = { message: "connection lost" };
    await expect(addWorkflowRevision(DOC, { title: "Rev 2" })).rejects.toThrow(
      /Revision saved, but the document could not be updated.*Refresh before adding another revision/,
    );
  });

  it("audit-write failure: honest partial-state error", async () => {
    eventInsert.error = { message: "offline" };
    await expect(addWorkflowRevision(DOC, { title: "Rev 2" })).rejects.toThrow(
      /audit record could not be written/,
    );
  });
});

describe("addWorkflowComment (offline conflicts)", () => {
  it("failed insert throws with the underlying error", async () => {
    eventInsert.error = { message: "offline" };
    await expect(addWorkflowComment(DOC, "note")).rejects.toThrow("offline");
  });

  it("happy path persists the comment", async () => {
    await expect(addWorkflowComment(DOC, "note")).resolves.toBeUndefined();
  });
});

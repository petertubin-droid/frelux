// =========================================================
// WORKFLOW EXPORTS — contract tests
//
// Pinned here:
//   * toCsvRows is PURE — no network, offline-safe, one row
//     per document with the exact fields the CSV carries
//     (including the computed overdue flag)
//   * exportWorkflowDocumentsCsv downloads via the shared
//     helper with a sanitized, dated filename
//   * toAuditPayload carries the document, the full event
//     trail, participants and attachment metadata (never the
//     storage paths themselves — the JSON is a record, not a
//     key to private files), plus generator + timestamp
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const downloadCsv = vi.fn();
const downloadJson = vi.fn();

vi.mock("@/lib/export-utils", () => ({
  downloadCsv: (...args: unknown[]) => downloadCsv(...(args as [])),
  downloadJson: (...args: unknown[]) => downloadJson(...(args as [])),
}));

import {
  toCsvRows,
  WORKFLOW_CSV_COLUMNS,
  exportWorkflowDocumentsCsv,
  toAuditPayload,
  exportWorkflowAudit,
} from "./exports";
import type { WorkflowDocument, WorkflowEvent } from "./workflow-engine";

const DOC = {
  id: "d1",
  project_id: "p1",
  doc_type: "change_order",
  reference_code: "CO-0001",
  title: "Terrace waterproofing, extra scope",
  status: "approved",
  priority: "high",
  assignee: "Eng. Ada",
  due_date: "2026-10-10",
  amount: 1250.5,
  currency: "EUR",
  revision_no: 2,
  description: null,
  created_by: null,
  created_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-13T09:00:00Z",
} as unknown as WorkflowDocument;

const CLOSED = {
  ...DOC,
  id: "d2",
  doc_type: "rfi",
  reference_code: "RFI-0002",
  status: "closed",
  due_date: "2026-10-01",
  amount: null,
  assignee: null,
  revision_no: 1,
} as unknown as WorkflowDocument;

const EVENT: WorkflowEvent = {
  id: "e1",
  document_id: "d1",
  event_type: "transition",
  from_status: "open",
  to_status: "approved",
  actor: "owner",
  note: null,
  created_at: "2026-10-12T10:00:00Z",
};

beforeEach(() => {
  downloadCsv.mockClear();
  downloadJson.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
});

describe("toCsvRows", () => {
  it("maps every document to a spreadsheet row, computing overdue honestly", () => {
    const rows = toCsvRows([DOC, CLOSED]);
    expect(rows.length).toBe(2);
    // DOC: approved CO due 2026-10-10 — closed/approved states
    // never count as overdue.
    expect(rows[0]).toMatchObject({
      reference_code: "CO-0001",
      doc_type: "change_order",
      status: "approved",
      overdue: "no",
      amount: "1250.5",
      currency: "EUR",
      assignee: "Eng. Ada",
      revision_no: "2",
    });
    expect(rows[1].overdue).toBe("no");
    expect(rows[1].assignee).toBe("");
  });

  it("flags a genuinely overdue open item", () => {
    const open = { ...DOC, status: "open" } as unknown as WorkflowDocument;
    const rows = toCsvRows([open]);
    expect(rows[0].overdue).toBe("yes");
  });

  it("has a row for every CSV column key — no silent data drops", () => {
    const rows = toCsvRows([DOC]);
    for (const col of WORKFLOW_CSV_COLUMNS) {
      expect(rows[0]).toHaveProperty(col.key);
    }
  });
});

describe("exportWorkflowDocumentsCsv", () => {
  it("downloads with a sanitized, dated filename and all columns", () => {
    exportWorkflowDocumentsCsv([DOC], "Lekki Tower Fitout");
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, rows, columns] = downloadCsv.mock.calls[0];
    expect(filename).toBe("workflow-Lekki-Tower-Fitout-2026-10-14");
    expect(rows.length).toBe(1);
    expect(columns.map((c: { header: string }) => c.header)).toContain(
      "Reference",
    );
  });
});

describe("toAuditPayload", () => {
  it("carries document, events, participants and attachment metadata — but never storage paths", () => {
    const payload = toAuditPayload(
      DOC,
      [EVENT],
      [
        {
          id: "p1",
          document_id: "d1",
          email: "eng@site.com",
          participant_role: "reviewer",
          granted_by: null,
          created_at: "2026-10-13T09:00:00Z",
        },
      ],
      [
        {
          id: "a1",
          document_id: "d1",
          file_name: "site photo.jpg",
          storage_path: "d1/123-site_photo.jpg",
          size_bytes: 2048,
          content_type: "image/jpeg",
          uploaded_by: null,
          created_at: "2026-10-13T10:00:00Z",
        },
      ],
    );
    expect(payload.generator).toBe("FRELUX workflow export v1");
    expect(payload.exported_at).toBe("2026-10-14T12:00:00.000Z");
    expect(payload.document.reference_code).toBe("CO-0001");
    expect(payload.events.length).toBe(1);
    expect(payload.participants[0].email).toBe("eng@site.com");
    expect(payload.attachments[0].file_name).toBe("site photo.jpg");
    expect(payload.attachments[0]).not.toHaveProperty("storage_path");
  });
});

describe("exportWorkflowAudit", () => {
  it("downloads the record JSON with a reference-code filename", () => {
    exportWorkflowAudit(DOC, [EVENT], [], []);
    expect(downloadJson).toHaveBeenCalledTimes(1);
    const [filename, payload] = downloadJson.mock.calls[0];
    expect(filename).toBe("CO-0001-record");
    expect(payload.events.length).toBe(1);
  });
});

// =========================================================
// WORKFLOW ATTACHMENTS — contract tests
//
// Pinned here:
//   * sanitizeFileName keeps the name honest but path-safe
//   * validateAttachment refuses executables, empty and
//     oversized files before any network work
//   * upload stores under <doc-id>/<timestamp>-<safe-name>,
//     inserts the row AFTER storage success, and cleans up
//     the orphaned object if the row insert fails
//   * every upload/delete writes an audit comment after the
//     operation, fire-and-forget
//   * downloads go through a signed URL from a private
//     bucket — never a public URL
//   * delete removes the row first; a missing storage object
//     is not an error
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const insertResult = { data: null as Row | null, error: null as unknown };
const deleteError = { error: null as unknown };
const selectRows = { rows: [] as Row[] };
const uploadResult = { error: null as unknown };
const removeResult = { error: null as unknown };
const signedUrl = { url: "https://signed.example/file" };

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

const storageFrom = vi.fn((_bucket: string) => ({
  upload: vi.fn(() => Promise.resolve(uploadResult)),
  remove: vi.fn(() => Promise.resolve(removeResult)),
  createSignedUrl: vi.fn(() =>
    Promise.resolve({ data: { signedUrl: signedUrl.url }, error: null }),
  ),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => from(...(args as [string])),
    storage: {
      from: (...args: unknown[]) => storageFrom(...(args as [string])),
    },
  },
  isSupabaseConfigured: true,
}));

import {
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_BYTES,
  sanitizeFileName,
  validateAttachment,
  listWorkflowAttachments,
  uploadWorkflowAttachment,
  getAttachmentUrl,
  deleteWorkflowAttachment,
} from "./attachments";
import type { WorkflowDocument } from "./workflow-engine";

const DOC = {
  id: "99999999-9999-4999-8999-999999999999",
  project_id: "88888888-8888-4888-8888-888888888888",
  doc_type: "rfi",
  reference_code: "RFI-0001",
  title: "Ceiling void clearance",
  status: "open",
} as unknown as WorkflowDocument;

const ATT: Row = {
  id: "a1",
  document_id: DOC.id,
  file_name: "site photo.jpg",
  storage_path: `${DOC.id}/123-site_photo.jpg`,
  size_bytes: 2048,
  content_type: "image/jpeg",
  uploaded_by: null,
  created_at: "2026-10-14T12:00:00Z",
};

const insertCalls = (): Row[] =>
  from.mock.results.flatMap((r) => {
    const chain = r.value as Record<string, unknown>;
    const insert = chain.insert as unknown as { mock: { calls: unknown[][] } };
    return (insert.mock?.calls ?? []).map((c) => c[0] as Row);
  });

function fileNamed(name: string, size = 2048, type = "image/jpeg"): File {
  return new File([new Uint8Array(size)], name, { type });
}

beforeEach(() => {
  insertResult.data = ATT;
  insertResult.error = null;
  deleteError.error = null;
  selectRows.rows = [];
  uploadResult.error = null;
  removeResult.error = null;
  from.mockClear();
  storageFrom.mockClear();
  vi.useRealTimers();
});

describe("sanitizeFileName", () => {
  it("replaces unsafe characters but keeps a recognizable name", () => {
    expect(sanitizeFileName("Site Photo (final).jpg")).toBe(
      "Site_Photo_final.jpg",
    );
    expect(sanitizeFileName("../../etc/passwd")).toBe("etc_passwd");
    expect(sanitizeFileName("")).toBe("file");
  });
});

describe("validateAttachment", () => {
  it("accepts an ordinary file", () => {
    expect(validateAttachment(fileNamed("photo.jpg"))).toBeNull();
  });
  it("refuses executables, empty and oversized files", () => {
    expect(validateAttachment(fileNamed("tool.exe"))).toContain("not allowed");
    expect(validateAttachment(fileNamed("run.bat"))).toContain("not allowed");
    expect(validateAttachment(fileNamed("empty.pdf", 0))).toContain("empty");
    const big = fileNamed("big.pdf");
    Object.defineProperty(big, "size", { value: MAX_ATTACHMENT_BYTES + 1 });
    expect(validateAttachment(big)).toContain("15 MB");
  });
});

describe("uploadWorkflowAttachment", () => {
  it("uploads under <doc>/<ts>-<safe-name> and inserts the row after", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    await uploadWorkflowAttachment(DOC, fileNamed("Site Photo (1).jpg"));
    expect(storageFrom).toHaveBeenCalledWith(ATTACHMENT_BUCKET);
    const bucket = storageFrom.mock.results[0].value as Record<string, unknown>;
    const upload = bucket.upload as unknown as { mock: { calls: unknown[][] } };
    const [path, body, opts] = upload.mock.calls[0] as [
      string,
      File,
      { contentType?: string },
    ];
    expect(path.startsWith(`${DOC.id}/`)).toBe(true);
    expect(path).toContain("Site_Photo_1.jpg");
    expect(body).toBeInstanceOf(File);
    expect(opts.contentType).toBe("image/jpeg");
    // Row insert after upload
    const rows = insertCalls();
    expect(rows[0].file_name).toBe("Site Photo (1).jpg");
    expect(rows[0].storage_path).toBe(path);
    expect(rows[0].document_id).toBe(DOC.id);
    // Audit comment last
    expect(rows[1].event_type).toBe("comment");
    expect(rows[1].note).toBe("Attachment added: Site Photo (1).jpg");
  });

  it("cleans up the orphaned object if the row insert fails", async () => {
    insertResult.data = null;
    insertResult.error = { message: "rls denied" };
    await expect(
      uploadWorkflowAttachment(DOC, fileNamed("x.pdf")),
    ).rejects.toThrow("rls denied");
    const removeCalls = storageFrom.mock.results
      .map(
        (r) =>
          (
            (r.value as Record<string, unknown>).remove as unknown as {
              mock: { calls: unknown[][] };
            }
          ).mock.calls,
      )
      .flat();
    expect(removeCalls.length).toBe(1);
  });

  it("refuses an invalid file before any storage call", async () => {
    await expect(
      uploadWorkflowAttachment(DOC, fileNamed("malware.exe")),
    ).rejects.toThrow("not allowed");
    expect(storageFrom).not.toHaveBeenCalled();
  });
});

describe("getAttachmentUrl", () => {
  it("returns a signed URL from the private bucket", async () => {
    const url = await getAttachmentUrl(ATT as never, 600);
    expect(storageFrom).toHaveBeenCalledWith(ATTACHMENT_BUCKET);
    const bucket = storageFrom.mock.results[0].value as Record<string, unknown>;
    const signed = bucket.createSignedUrl as unknown as {
      mock: { calls: unknown[][] };
    };
    expect(signed.mock.calls[0][0]).toBe(ATT.storage_path);
    expect(signed.mock.calls[0][1]).toBe(600);
    expect(url).toBe("https://signed.example/file");
  });
});

describe("deleteWorkflowAttachment", () => {
  it("deletes the row, then the object, and audits", async () => {
    await deleteWorkflowAttachment(DOC, ATT as never);
    const chain = from.mock.results[0].value as Record<string, unknown>;
    const del = chain.delete as unknown as { mock: { calls: unknown[][] } };
    const eq = chain.eq as unknown as { mock: { calls: unknown[][] } };
    expect(del.mock.calls.length).toBe(1);
    expect(eq.mock.calls[0][0]).toBe("id");
    expect(eq.mock.calls[0][1]).toBe(ATT.id);
    expect(eq.mock.calls[1][1]).toBe(DOC.id);
    const bucket = storageFrom.mock.results[0].value as Record<string, unknown>;
    const remove = bucket.remove as unknown as { mock: { calls: unknown[][] } };
    expect(remove.mock.calls[0][0]).toEqual([ATT.storage_path]);
    const rows = insertCalls();
    expect(rows[0].note).toContain("site photo.jpg");
  });
});

describe("listWorkflowAttachments", () => {
  it("returns rows scoped by document", async () => {
    selectRows.rows = [ATT];
    const rows = await listWorkflowAttachments(DOC.id);
    expect(rows.length).toBe(1);
    expect(rows[0].storage_path).toBe(ATT.storage_path);
  });
});

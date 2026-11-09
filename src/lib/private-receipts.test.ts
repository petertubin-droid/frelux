import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SQL = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261110010000_private_receipts_and_drop_invoice_counters.sql",
  ),
  "utf8",
);
const CONTRACTOR = readFileSync(
  resolve(process.cwd(), "src/lib/contractor.ts"),
  "utf8",
);

describe("private receipts migration", () => {
  it("creates the receipt bucket as private", () => {
    expect(SQL).toContain("'project-receipts', 'project-receipts', false");
    expect(SQL).toContain("ON CONFLICT (id) DO UPDATE SET public = false");
  });

  it("gates every storage verb on project ownership", () => {
    for (const policy of [
      "project_receipts_read",
      "project_receipts_write",
      "project_receipts_delete",
    ]) {
      expect(SQL).toContain(`CREATE POLICY ${policy}`);
    }
    const ownership = SQL.match(/p\.user_id = auth\.uid\(\)/g) ?? [];
    expect(ownership.length).toBe(3);
  });

  it("drops the dead numbering path", () => {
    expect(SQL).toContain(
      "DROP FUNCTION IF EXISTS public.reserve_invoice_number",
    );
    expect(SQL).toContain("DROP TABLE IF EXISTS public.invoice_counters");
  });
});

const RECEIPT_UPLOAD = CONTRACTOR.slice(
  CONTRACTOR.indexOf("export async function uploadExpenseReceipt"),
  CONTRACTOR.indexOf("export const RECEIPT_LINK_TTL_SECONDS"),
);

describe("receipt upload surface", () => {
  it("never asks storage for a public URL on the receipt path", () => {
    expect(RECEIPT_UPLOAD.length).toBeGreaterThan(0);
    expect(RECEIPT_UPLOAD).not.toContain("getPublicUrl");
    expect(RECEIPT_UPLOAD).not.toContain("project-attachments");
    expect(RECEIPT_UPLOAD).not.toContain("media");
  });

  it("targets the private bucket and stores the object path", () => {
    expect(CONTRACTOR).toContain(
      'export const RECEIPT_BUCKET = "project-receipts";',
    );
    expect(CONTRACTOR).toContain("receipt_path: storagePath");
    expect(CONTRACTOR).toContain("receipt_url: null");
  });

  it("mints a ten minute signed link", () => {
    expect(CONTRACTOR).toContain("RECEIPT_LINK_TTL_SECONDS = 600");
    expect(CONTRACTOR).toContain(
      "createSignedUrl(path, RECEIPT_LINK_TTL_SECONDS)",
    );
  });
});

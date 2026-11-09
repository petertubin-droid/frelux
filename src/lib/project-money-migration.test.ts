/**
 * Guards the invoice and payment migration.
 *
 * These tables hold money. A migration that ships without row level security,
 * or that lets the application pick its own document numbers, is the kind of
 * defect that only shows up once real client records exist, so the file itself
 * is checked here.
 */
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  "supabase/migrations/20261109210000_project_invoices_payments.sql",
  "utf8",
);

const ROLLBACK = readFileSync(
  "supabase/migrations/rollback/20261109210000_project_invoices_payments_rollback.sql",
  "utf8",
);

describe("invoice and payment migration", () => {
  it("creates both money tables", () => {
    expect(SQL).toContain("CREATE TABLE IF NOT EXISTS public.project_invoices");
    expect(SQL).toContain("CREATE TABLE IF NOT EXISTS public.project_payments");
  });

  it("locks both tables to the project owner", () => {
    for (const table of ["project_invoices", "project_payments"]) {
      expect(SQL).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`,
      );
      expect(SQL).toContain(
        `ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY;`,
      );
    }
    expect(SQL).toContain("TO authenticated");
    expect(SQL).toContain("contractor_projects WHERE user_id = auth.uid()");
    // Nothing may be readable by an anonymous visitor.
    expect(SQL).not.toMatch(/TO anon/);
  });

  it("numbers documents in the database, not in the browser", () => {
    expect(SQL).toContain("nextval('public.project_invoice_number_seq')");
    expect(SQL).toContain("nextval('public.project_payment_receipt_seq')");
    expect(SQL).toContain(
      "CONSTRAINT project_invoices_number_unique UNIQUE (number)",
    );
    expect(SQL).toContain(
      "CONSTRAINT project_payments_receipt_unique UNIQUE (receipt_no)",
    );
  });

  it("refuses a payment of zero or less at the column level", () => {
    expect(SQL).toMatch(/amount numeric NOT NULL CHECK \(amount > 0\)/);
  });

  it("stores proof of spend on the expense row", () => {
    expect(SQL).toContain("ADD COLUMN IF NOT EXISTS receipt_url text");
    expect(SQL).toContain("ADD COLUMN IF NOT EXISTS receipt_name text");
  });

  it("has a rollback that reverses every object it adds", () => {
    expect(ROLLBACK).toContain("DROP TABLE IF EXISTS public.project_payments");
    expect(ROLLBACK).toContain("DROP TABLE IF EXISTS public.project_invoices");
    expect(ROLLBACK).toContain("DROP COLUMN IF EXISTS receipt_url");
    expect(ROLLBACK).toContain(
      "DROP SEQUENCE IF EXISTS public.project_invoice_number_seq",
    );
  });
});

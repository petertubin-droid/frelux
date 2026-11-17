import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The page is reachable only if the route, the lazy import and the navigation
 * entry all exist, and it must read the supplier_bills table with the shared
 * summariser rather than computing balances of its own.
 */
const app = readFileSync("src/App.tsx", "utf8");
const layout = readFileSync("src/components/admin/AdminLayout.tsx", "utf8");
const page = readFileSync("src/pages/admin/AdminSupplierLedger.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/20261117170000_supplier_bills.sql",
  "utf8",
);

describe("supplier ledger wiring", () => {
  it("declares the lazy import and the route", () => {
    expect(app).toContain('import("@/pages/admin/AdminSupplierLedger")');
    expect(app).toContain('path="supplier-ledger"');
  });

  it("links the page from the admin navigation", () => {
    expect(layout).toContain('to: "/admin/supplier-ledger"');
  });

  it("reads supplier bills through the shared summariser", () => {
    expect(page).toContain('from "@/lib/supplier-ledger"');
    expect(page).toContain("summarisePayables");
    expect(page).toContain('from("supplier_bills")');
  });

  it("ships a migration that forces row level security and grants the table", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("created_by = auth.uid()");
    expect(migration).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_bills TO authenticated",
    );
    expect(migration).toContain(
      "REVOKE ALL ON public.supplier_bills FROM anon",
    );
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The page is only reachable if the route, the lazy import and the navigation
 * entry all exist. Three separate edits are easy to half-finish, so this holds
 * them together without rendering anything.
 */
const app = readFileSync("src/App.tsx", "utf8");
const layout = readFileSync("src/components/admin/AdminLayout.tsx", "utf8");
const page = readFileSync("src/pages/admin/AdminExpenseLedger.tsx", "utf8");

describe("expense ledger wiring", () => {
  it("declares the lazy import and the route", () => {
    expect(app).toContain('import("@/pages/admin/AdminExpenseLedger")');
    expect(app).toContain('path="expense-ledger"');
  });

  it("links the page from the admin navigation", () => {
    expect(layout).toContain('to: "/admin/expense-ledger"');
  });

  it("reads expenses through the shared summariser, not its own sums", () => {
    expect(page).toContain('from "@/lib/expense-ledger"');
    expect(page).toContain("summariseExpenses");
    expect(page).toContain('from("project_expenses")');
  });
});

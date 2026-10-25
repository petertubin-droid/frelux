// ============================================================
// Phase 3 procurement access layer: honest refusal tests.
// The database is the authority; these verify the client layer
// never fabricates progress and reports clean failures.
// ============================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcurementRecord } from "./records";
import { appendProcurementEvent } from "./records";

const record: ProcurementRecord = {
  id: "r1",
  project_ref: null,
  title: "Cement bags",
  supplier: "Dangote",
  destination: "Lagos site",
  line_items: [{ description: "Cement", quantity: 100, unit: "bags" }],
  status: "listed",
  created_by: "u1",
  created_at: "2026-10-25T00:00:00Z",
  updated_at: "2026-10-25T00:00:00Z",
};

describe("appendProcurementEvent", () => {
  beforeEach(() => {
    vi.doMock("@/lib/supabase", () => ({
      supabase: { from: () => ({ insert: () => ({ error: null }) }) },
      isSupabaseConfigured: true,
    }));
  });

  it("refuses an impossible transition with an honest reason", async () => {
    vi.resetModules();
    const { appendProcurementEvent: append } = await import("./records");
    const r = await append(record, "delivered");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("cannot move from");
    expect(r.reason).not.toMatch(/magic|auto/i);
  });

  it("refuses when the database rejects the event", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase", () => ({
      supabase: {
        from: () => ({
          insert: () => ({ error: { message: "transition rejected" } }),
        }),
      },
      isSupabaseConfigured: true,
    }));
    const { appendProcurementEvent: append } = await import("./records");
    const r = await append(record, "quote_requested");
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("was not changed");
  });

  it("succeeds on a legal transition", async () => {
    vi.resetModules();
    const { appendProcurementEvent: append } = await import("./records");
    const r = await append(record, "quote_requested");
    expect(r.ok).toBe(true);
  });
});

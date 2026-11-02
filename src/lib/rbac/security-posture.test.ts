/**
 * Security posture tests (Engine #12 — RBAC & clearance)
 *
 * Pins the review-gate honesty law: the record alone decides the
 * claim, missing records are disclosed as unreviewed, and the
 * registry mirrors the surfaces seeded in migration
 * 20261021210000 (registry-sync pattern).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SECURITY_SURFACES,
  NOT_INDEPENDENTLY_REVIEWED,
  fetchSecurityPosture,
  postureFromReview,
  type SecurityPostureReview,
} from "./security-posture";
import { supabase } from "@/lib/supabase";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("registry sync: surfaces mirror the seeded migration", () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      "../../../supabase/migrations/20261021210000_security_posture_reviews.sql",
    ),
    "utf8",
  );

  it("every registered surface is seeded as pending in the migration", () => {
    for (const surface of SECURITY_SURFACES) {
      expect(migration).toContain(`('${surface}', 'pending'`);
    }
  });

  it("the migration CHECK blocks approval without reviewer/date/findings", () => {
    expect(migration).toContain(
      "security_posture_review_approval_requires_reviewer",
    );
    expect(migration).toContain("status <> 'approved'");
  });

  it("admin-only writes via is_admin(); public read", () => {
    expect(migration).toContain("public.is_admin()");
    expect(migration).toContain("security_posture_reviews_public_read");
  });
});

describe("postureFromReview: the record alone decides the claim", () => {
  it("a missing record is disclosed as not independently reviewed", () => {
    const p = postureFromReview(null, "database_rls");
    expect(p.status).toBe("unreviewed");
    expect(p.disclosure).toContain("no review record exists");
    expect(p.disclosure).toContain("Not independently reviewed");
  });

  it("a pending record never claims more than awaiting review", () => {
    const p = postureFromReview(
      { surface: "rpc_escalation", status: "pending", findings: "audit text", reviewer_name: null, reviewed_at: null },
      "rpc_escalation",
    );
    expect(p.status).toBe("pending");
    expect(p.disclosure).toContain("awaiting independent review");
    expect(p.disclosure).toContain("Not independently reviewed");
    expect(p.reviewer_name).toBeNull();
  });

  it("an approved record names the reviewer and the date", () => {
    const p = postureFromReview(
      {
        surface: "workspace_rbac",
        status: "approved",
        findings: "Examined RLS policies and the permission matrix.",
        reviewer_name: "Ada Reviewer",
        reviewed_at: "2026-10-22T10:00:00Z",
      },
      "workspace_rbac",
    );
    expect(p.status).toBe("approved");
    expect(p.disclosure).toContain("Ada Reviewer");
    expect(p.disclosure).toContain("2026-10-22");
    expect(p.disclosure).not.toContain("Not independently reviewed");
  });

  it("an approved record without a date still discloses honestly", () => {
    const p = postureFromReview(
      {
        surface: "workspace_rbac",
        status: "approved",
        findings: "Examined.",
        reviewer_name: "Ada Reviewer",
        reviewed_at: null,
      },
      "workspace_rbac",
    );
    expect(p.status).toBe("approved");
    expect(p.disclosure).toContain("unknown date");
  });

  it("a rejected record surfaces the deficiencies verbatim", () => {
    const p = postureFromReview(
      {
        surface: "rpc_escalation",
        status: "rejected",
        findings: "One guard was found missing on a legacy RPC.",
        reviewer_name: "Ada Reviewer",
        reviewed_at: "2026-10-22T10:00:00Z",
      },
      "rpc_escalation",
    );
    expect(p.status).toBe("rejected");
    expect(p.disclosure).toContain("found deficiencies");
    expect(p.disclosure).toContain("legacy RPC");
  });

  it("an unknown surface label falls back to the raw key (no invention)", () => {
    const p = postureFromReview(null, "some_new_surface");
    expect(p.label).toBe("some_new_surface");
    expect(p.status).toBe("unreviewed");
  });
});

describe("fetchSecurityPosture", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reports every registered surface, unreviewed when the table is empty", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn(() => ({
        data: [],
        error: null,
      })),
    } as never);
    const { data, error } = await fetchSecurityPosture();
    expect(error).toBeNull();
    expect(data.map((p) => p.surface)).toEqual([...SECURITY_SURFACES]);
    for (const p of data) {
      expect(p.status).toBe("unreviewed");
      expect(p.disclosure).toContain(NOT_INDEPENDENTLY_REVIEWED);
    }
  });

  it("maps live rows to their surfaces", async () => {
    const rows: SecurityPostureReview[] = [
      {
        surface: "database_rls",
        status: "approved",
        findings: "Examined all policies.",
        reviewer_name: "Ada Reviewer",
        reviewed_at: "2026-10-22T10:00:00Z",
      },
    ];
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn(() => ({
        data: rows,
        error: null,
      })),
    } as never);
    const { data } = await fetchSecurityPosture();
    expect(data[0].status).toBe("approved");
    expect(data[1].status).toBe("unreviewed");
  });

  it("surfaces read errors honestly instead of pretending", async () => {
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn(() => ({
        data: null,
        error: { message: "row-level security policy violation" },
      })),
    } as never);
    const { data, error } = await fetchSecurityPosture();
    expect(error).toContain("row-level security policy violation");
    expect(data).toEqual([]);
  });
});

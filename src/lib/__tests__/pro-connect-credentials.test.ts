import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// PHASE 2 CREDENTIAL WORKFLOW (roadmap: precise statuses and
// transitions, never worker-supplied verification outcomes)
//
// Pins the lib layer to the transition authority in
// credential-status.ts and the DB guard semantics.
// ============================================================

const state: {
  credentials: Record<
    string,
    { id: string; verification_status: string; [k: string]: unknown }
  >;
  events: Record<string, unknown>[];
  inserts: Record<string, unknown>[];
  user: { id: string } | null;
} = { credentials: {}, events: [], inserts: [], user: { id: "admin-1" } };

const res = (rows: unknown) => ({
  then: (resolve: (v: unknown) => void) =>
    Promise.resolve({ data: rows, error: null }).then(resolve),
  select: () => res(rows),
  eq: () => res(rows),
  order: () => res(rows),
  maybeSingle: () => res(Array.isArray(rows) ? rows[0] : rows),
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "pro_credentials") {
        return {
          insert: (row: Record<string, unknown>) => {
            state.inserts.push(row);
            return res(null);
          },
          select: () => {
            const rows = Object.values(state.credentials);
            const stub = res(rows);
            const origEq = stub.eq as unknown as (
              col: string,
              val: string,
            ) => { maybeSingle: () => unknown };
            return {
              ...stub,
              eq: (col: string, val: string) => {
                const filtered = rows.filter(
                  (r) => (r as Record<string, unknown>)[col] === val,
                );
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: filtered[0] ?? null,
                      error: null,
                    }),
                };
              },
            };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: (col: string, val: string) => {
              const row = state.credentials[val];
              if (!row)
                return Promise.resolve({
                  data: null,
                  error: { message: "not found" },
                });
              Object.assign(row, patch);
              return Promise.resolve({ data: [row], error: null });
            },
          }),
        };
      }
      if (table === "pro_credential_events") {
        return {
          insert: (row: Record<string, unknown>) => {
            state.events.push(row);
            return res(null);
          },
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({ data: [...state.events], error: null }),
            }),
          }),
        };
      }
      if (table === "credential_verification_sources") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return res([]);
    },
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: state.user },
        }),
    },
  },
  isSupabaseConfigured: true,
}));

import {
  addCredential,
  adminRequestCredentialCorrection,
  adminRevokeCredential,
  adminSuspendCredential,
  adminUnableToVerifyCredential,
  adminVerifyCredentialByReviewer,
  adminVerifyCredentialBySource,
  getCredentialEvents,
  recordVerificationAttempt,
  resubmitCredential,
} from "@/lib/pro-connect";

function seed(id: string, verification_status: string): void {
  state.credentials[id] = { id, verification_status };
}

describe("Phase 2 credential workflow", () => {
  beforeEach(() => {
    state.credentials = {};
    state.events = [];
    state.inserts = [];
    state.user = { id: "admin-1" };
  });

  it("submits with the new precise status and full jurisdiction fields", async () => {
    const ok = await addCredential("profile-1", {
      professional_body: "COREN",
      registration_number: "COREN/1234",
      credential_type: "engineer",
      credential_class: "trade_registration",
      country_code: "NG",
      subnational_scope: "Lagos",
      expires_at: "2027-01-01",
    });
    expect(ok).toBe(true);
    expect(state.inserts).toHaveLength(1);
    const row = state.inserts[0];
    expect(row.verification_status).toBe("submitted");
    expect(row.country_code).toBe("NG");
    expect(row.subnational_scope).toBe("Lagos");
    expect(row.evidence_type).toBe("document_upload");
  });

  it("cannot resubmit a credential that is under review", async () => {
    seed("c1", "pending_review");
    const ok = await resubmitCredential("c1", {
      registration_number: "COREN/9999",
    });
    expect(ok).toBe(false);
    expect(state.credentials["c1"].verification_status).toBe("pending_review");
  });

  it("can resubmit a rejected credential", async () => {
    seed("c2", "rejected");
    const ok = await resubmitCredential("c2", {
      registration_number: "COREN/9999",
    });
    expect(ok).toBe(true);
    expect(state.credentials["c2"].verification_status).toBe("submitted");
  });

  it("verifies by source with registry provenance", async () => {
    seed("c3", "pending_review");
    const ok = await adminVerifyCredentialBySource("c3");
    expect(ok).toBe(true);
    expect(state.credentials["c3"].verification_status).toBe(
      "verified_by_source",
    );
    expect(state.credentials["c3"].verification_method).toBe("registry_lookup");
    expect(state.credentials["c3"].verified_by).toBe("admin-1");
  });

  it("verifies by reviewer with document-review provenance", async () => {
    seed("c4", "pending_review");
    const ok = await adminVerifyCredentialByReviewer("c4");
    expect(ok).toBe(true);
    expect(state.credentials["c4"].verification_status).toBe(
      "verified_by_reviewer",
    );
    expect(state.credentials["c4"].verification_method).toBe("manual_review");
  });

  it("never re-verifies an already source-verified credential", async () => {
    seed("c5", "verified_by_source");
    const ok = await adminVerifyCredentialByReviewer("c5");
    expect(ok).toBe(false);
    expect(state.credentials["c5"].verification_status).toBe(
      "verified_by_source",
    );
  });

  it("records a correction request and sends the credential back", async () => {
    seed("c6", "pending_review");
    const ok = await adminRequestCredentialCorrection("c6", " blurry scan");
    expect(ok).toBe(true);
    expect(state.credentials["c6"].verification_status).toBe("submitted");
    const event = state.events.find(
      (e) => e.event_type === "correction_requested",
    );
    expect(event).toBeTruthy();
  });

  it("marks unable-to-verify as the honest dead end", async () => {
    seed("c7", "pending_review");
    const ok = await adminUnableToVerifyCredential("c7", " registry down");
    expect(ok).toBe(true);
    expect(state.credentials["c7"].verification_status).toBe(
      "unable_to_verify",
    );
  });

  it("suspends and revokes from verified states; revoked is terminal", async () => {
    seed("c8", "verified_by_reviewer");
    expect(await adminSuspendCredential("c8", " investigation")).toBe(true);
    expect(state.credentials["c8"].verification_status).toBe("suspended");
    expect(await adminRevokeCredential("c8", " falsified")).toBe(true);
    expect(state.credentials["c8"].verification_status).toBe("revoked");
    // terminal: no further transitions out of revoked
    expect(await adminRevokeCredential("c8", " again")).toBe(false);
    expect(await adminSuspendCredential("c8", " again")).toBe(false);
  });

  it("records verification attempts without a decision", async () => {
    seed("c9", "pending_review");
    const ok = await recordVerificationAttempt("c9", {
      method: "registry_lookup",
      result: "error",
      reason: "registry timeout",
    });
    expect(ok).toBe(true);
    expect(state.credentials["c9"].verification_status).toBe("pending_review");
    const event = state.events.find(
      (e) => e.event_type === "verification_attempt",
    );
    expect(event).toBeTruthy();
  });

  it("returns the append-only event trail", async () => {
    state.events.push({
      credential_id: "c10",
      event_type: "submission",
      actor_role: "worker",
    });
    const events = await getCredentialEvents("c10");
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("submission");
  });
});

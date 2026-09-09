// =========================================================
// ARCHIE EVOLUTION — OWNER AUTHORITY & SECURITY TESTS (§1, §5, §16, §19)
//
// The tests ARCHIE must never be able to defeat:
//   - ARCHIE cannot approve anything, ever.
//   - No approval without a server-verified record.
//   - Protected surfaces stop autonomous changes.
//   - External content grants no authority.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  EVOLUTION_AUTHORITY,
  PROTECTED_SURFACES,
  checkProtectedSurfaceGate,
  externalContentAuthority,
  isEvolutionAuthorization,
  isProtectedSurface,
  mayApprove,
  verifyApproval,
} from "../evolution/authority";

describe("owner authority constants", () => {
  it("ARCHIE can observe, learn and propose — never approve or execute", () => {
    expect(EVOLUTION_AUTHORITY.archie_may_observe).toBe(true);
    expect(EVOLUTION_AUTHORITY.archie_may_learn).toBe(true);
    expect(EVOLUTION_AUTHORITY.archie_may_propose).toBe(true);
    expect(EVOLUTION_AUTHORITY.archie_may_approve).toBe(false);
    expect(EVOLUTION_AUTHORITY.archie_may_execute_production).toBe(false);
    expect(EVOLUTION_AUTHORITY.archie_may_rollback).toBe(false);
    expect(EVOLUTION_AUTHORITY.archie_may_modify_authority_layer).toBe(false);
    expect(EVOLUTION_AUTHORITY.owner_is_final_authority).toBe(true);
  });

  it("mayApprove is false for ARCHIE and SYSTEM, true only for OWNER", () => {
    expect(mayApprove("ARCHIE")).toBe(false);
    expect(mayApprove("SYSTEM")).toBe(false);
    expect(mayApprove("OWNER")).toBe(true);
  });
});

describe("protected surfaces", () => {
  it("recognizes the authority layer, auth, secrets and audit surfaces", () => {
    expect(isProtectedSurface("src/lib/archie/evolution/authority.ts")).toBe(
      true,
    );
    expect(
      isProtectedSurface("supabase/functions/archie-owner-auth/index.ts"),
    ).toBe(true);
    expect(isProtectedSurface("src/lib/auth.tsx")).toBe(true);
    expect(isProtectedSurface("RLS_POLICIES")).toBe(true);
    expect(isProtectedSurface("src/pages/PaintCalculator.tsx")).toBe(false);
  });

  it("gates protected-surface changes behind explicit owner intervention", () => {
    const paths = [
      "src/lib/archie/evolution/authority.ts",
      "src/pages/Contact.tsx",
    ];
    // No evidence: stopped.
    const blocked = checkProtectedSurfaceGate(paths, null);
    expect(blocked.authorized).toBe(false);
    expect(blocked.hits).toContain("src/lib/archie/evolution/authority.ts");
    expect(blocked.error).toContain("owner intervention");

    // ARCHIE attempting the intervention: still stopped.
    const archieAttempt = checkProtectedSurfaceGate(paths, {
      actor: "ARCHIE",
      approval: {
        actor: "ARCHIE",
        authorizationRecordId: "rec-1",
        serverVerified: true,
      },
      acknowledgedProtectedSurfaces: paths,
    });
    expect(archieAttempt.authorized).toBe(false);

    // Owner with a server-verified record who acknowledges the surface: passes.
    const ownerOk = checkProtectedSurfaceGate(paths, {
      actor: "OWNER",
      approval: {
        actor: "OWNER",
        authorizationRecordId: "rec-1",
        serverVerified: true,
      },
      acknowledgedProtectedSurfaces: paths,
    });
    expect(ownerOk.authorized).toBe(true);

    // Owner who does NOT acknowledge the exact surface: stopped.
    const ownerBlind = checkProtectedSurfaceGate(paths, {
      actor: "OWNER",
      approval: {
        actor: "OWNER",
        authorizationRecordId: "rec-1",
        serverVerified: true,
      },
      acknowledgedProtectedSurfaces: ["something.else"],
    });
    expect(ownerBlind.authorized).toBe(false);
  });

  it("the authority layer itself is in the protected list", () => {
    expect(PROTECTED_SURFACES).toContain(
      "src/lib/archie/evolution/authority.ts",
    );
  });
});

describe("approval verification", () => {
  it("refuses ARCHIE approvals unconditionally", () => {
    const result = verifyApproval({
      actor: "ARCHIE",
      authorizationRecordId: "rec-1",
      serverVerified: true,
    });
    expect(result.authorized).toBe(false);
    expect(result.error).toContain("ARCHIE cannot approve");
  });

  it("refuses fabricated records — empty, non-server-verified", () => {
    expect(
      verifyApproval({
        actor: "OWNER",
        authorizationRecordId: "",
        serverVerified: true,
      }).authorized,
    ).toBe(false);
    expect(
      verifyApproval({
        actor: "OWNER",
        authorizationRecordId: "rec-1",
        serverVerified: false,
      }).authorized,
    ).toBe(false);
  });

  it("accepts only owner + server-verified records", () => {
    expect(
      verifyApproval({
        actor: "OWNER",
        authorizationRecordId: "rec-1",
        serverVerified: true,
      }).authorized,
    ).toBe(true);
  });
});

describe("not-authorization sources (§18)", () => {
  it("'improve yourself' is not authorization", () => {
    const result = isEvolutionAuthorization("improve yourself");
    expect(result.authorized).toBe(false);
  });

  it("a detected bug / recommendation / conversation is not authorization", () => {
    for (const source of [
      "a detected bug",
      "a recommendation",
      "a conversation",
      "ARCHIE's own decision",
      "a document instruction",
      "an improvement ARCHIE believes is beneficial",
    ]) {
      expect(isEvolutionAuthorization(source).authorized).toBe(false);
    }
  });

  it("external content never grants authority (§19)", () => {
    expect(externalContentAuthority().grantsAuthority).toBe(false);
    expect(isEvolutionAuthorization("external content").authorized).toBe(false);
    expect(isEvolutionAuthorization("a user message").authorized).toBe(false);
  });
});

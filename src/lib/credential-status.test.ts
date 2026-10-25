import { describe, it, expect } from "vitest";
import {
  canTransition,
  isPubliclyVisible,
  isVerifiedStatus,
  publicCredentialLabel,
} from "./credential-status";

// ============================================================
// PHASE 2 CREDENTIAL STATUS SEMANTICS
//
// Roadmap non-negotiables pinned here:
//  - legacy statuses never remapped; legacy 'verified' is
//    document-reviewed, never registry-verified
//  - public cards distinguish document reviewed from registry
//    verified; no unqualified "compliant" badge
//  - failed/unavailable lookups end pending or unable_to_verify
//  - workers can never grant themselves a verification outcome
// ============================================================

describe("publicCredentialLabel", () => {
  it("labels registry verification only for verified_by_source", () => {
    expect(publicCredentialLabel("verified_by_source")).toBe(
      "registry_verified",
    );
  });

  it("labels legacy verified and verified_by_reviewer as document reviewed", () => {
    expect(publicCredentialLabel("verified")).toBe("document_reviewed");
    expect(publicCredentialLabel("verified_by_reviewer")).toBe(
      "document_reviewed",
    );
  });

  it("never labels unresolved statuses as verified", () => {
    for (const status of [
      "unverified",
      "submitted",
      "pending",
      "pending_review",
      "unable_to_verify",
      "rejected",
      "expired",
      "suspended",
      "revoked",
    ] as const) {
      expect(publicCredentialLabel(status)).toBe("not_verified");
    }
  });
});

describe("isPubliclyVisible", () => {
  it("shows only verified credentials publicly", () => {
    expect(isPubliclyVisible("verified_by_source")).toBe(true);
    expect(isPubliclyVisible("verified_by_reviewer")).toBe(true);
    expect(isPubliclyVisible("verified")).toBe(true);
    expect(isPubliclyVisible("submitted")).toBe(false);
    expect(isPubliclyVisible("rejected")).toBe(false);
    expect(isPubliclyVisible("unverified")).toBe(false);
    expect(isPubliclyVisible("unable_to_verify")).toBe(false);
  });
});

describe("canTransition — worker cannot self-verify", () => {
  it("refuses a worker moving their credential to any verified status", () => {
    for (const to of [
      "verified_by_source",
      "verified_by_reviewer",
      "verified",
    ] as const) {
      expect(canTransition("submitted", to, "worker")).toBe(false);
      expect(canTransition("pending_review", to, "worker")).toBe(false);
    }
  });

  it("allows the admin verification decisions", () => {
    expect(canTransition("pending_review", "verified_by_source", "admin")).toBe(
      true,
    );
    expect(
      canTransition("pending_review", "verified_by_reviewer", "admin"),
    ).toBe(true);
    expect(canTransition("pending_review", "rejected", "admin")).toBe(true);
    expect(canTransition("pending_review", "unable_to_verify", "admin")).toBe(
      true,
    );
  });

  it("never silently promotes a legacy verified row without an admin decision", () => {
    expect(canTransition("verified", "verified_by_source", "worker")).toBe(
      false,
    );
    expect(canTransition("verified", "verified_by_source", "admin")).toBe(true);
  });

  it("allows the worker submission and correction lifecycle", () => {
    expect(canTransition("unverified", "submitted", "worker")).toBe(true);
    expect(canTransition("submitted", "pending_review", "worker")).toBe(false);
    expect(canTransition("rejected", "submitted", "worker")).toBe(true);
    expect(canTransition("expired", "submitted", "worker")).toBe(true);
  });

  it("allows an admin to send corrections back to the worker", () => {
    expect(canTransition("pending_review", "submitted", "admin")).toBe(true);
    expect(canTransition("unable_to_verify", "pending_review", "admin")).toBe(
      true,
    );
  });

  it("refuses unknown transitions (fail closed)", () => {
    expect(canTransition("revoked", "verified_by_source", "admin")).toBe(false);
    expect(canTransition("suspended", "verified_by_source", "admin")).toBe(
      false,
    );
    expect(canTransition("submitted", "suspended", "worker")).toBe(false);
  });

  it("suspension and revocation are admin-only", () => {
    expect(canTransition("verified_by_source", "suspended", "admin")).toBe(
      true,
    );
    expect(canTransition("verified_by_reviewer", "revoked", "admin")).toBe(
      true,
    );
    expect(canTransition("verified_by_source", "suspended", "worker")).toBe(
      false,
    );
  });
});

describe("isVerifiedStatus", () => {
  it("counts only the three verified statuses", () => {
    expect(isVerifiedStatus("verified")).toBe(true);
    expect(isVerifiedStatus("verified_by_reviewer")).toBe(true);
    expect(isVerifiedStatus("verified_by_source")).toBe(true);
    expect(isVerifiedStatus("unable_to_verify")).toBe(false);
    expect(isVerifiedStatus("pending_review")).toBe(false);
  });
});

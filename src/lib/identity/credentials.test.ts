import { describe, expect, it } from "vitest";
import {
  MAX_CREDENTIAL_SUFFIX,
  isCredentialVerified,
  normaliseCredentialSuffix,
  printableCredentialSuffix,
  resolveReviewerCredential,
  reviewerCredit,
} from "./credentials";

const verified = {
  credential_suffix: "FNSE, COREN R.12345",
  credential_verified_at: "2026-11-24T09:00:00Z",
  credential_verified_by: "admin-1",
};

const unverified = {
  credential_suffix: "FNSE, COREN R.12345",
  credential_verified_at: null,
  credential_verified_by: null,
};

describe("credential suffix normalising", () => {
  it("collapses whitespace and drops stray commas", () => {
    expect(normaliseCredentialSuffix("  FNSE ,  COREN R.12345 ")).toBe(
      "FNSE, COREN R.12345",
    );
    expect(normaliseCredentialSuffix(", FNSE")).toBe("FNSE");
    expect(normaliseCredentialSuffix("FNSE,")).toBe("FNSE");
    expect(normaliseCredentialSuffix(null)).toBe("");
  });

  it("caps the length so a document cannot be flooded", () => {
    const long = "A".repeat(200);
    expect(normaliseCredentialSuffix(long).length).toBe(MAX_CREDENTIAL_SUFFIX);
  });
});

describe("verification gate", () => {
  it("treats a stamp as verified and a missing stamp as not", () => {
    expect(isCredentialVerified(verified)).toBe(true);
    expect(isCredentialVerified(unverified)).toBe(false);
    expect(isCredentialVerified(null)).toBe(false);
  });

  it("prints nothing for an unverified claim, even a well-formed one", () => {
    expect(printableCredentialSuffix(verified)).toBe("FNSE, COREN R.12345");
    expect(printableCredentialSuffix(unverified)).toBeNull();
  });

  it("prints nothing when a stamp exists but no suffix was stated", () => {
    expect(
      printableCredentialSuffix({ credential_verified_at: "2026-11-24" }),
    ).toBeNull();
  });
});

describe("reviewer credit on a document", () => {
  it("adds the suffix only when the caller can show verification", () => {
    expect(reviewerCredit("Engr. U. Okereke", "FNSE", true)).toBe(
      "Engr. U. Okereke, FNSE",
    );
    expect(reviewerCredit("Engr. U. Okereke", "FNSE", false)).toBe(
      "Engr. U. Okereke",
    );
  });

  it("never leaves a dangling comma", () => {
    expect(reviewerCredit("Engr. U. Okereke", "", true)).toBe(
      "Engr. U. Okereke",
    );
    expect(reviewerCredit("Engr. U. Okereke", "   ", true)).toBe(
      "Engr. U. Okereke",
    );
  });
});

describe("attaching a verified credential while writing", () => {
  const profile = { full_name: "Uche Okereke", ...verified };

  it("attaches the suffix when the reviewer is the verified profile holder", () => {
    expect(resolveReviewerCredential("  uche   okereke ", profile)).toEqual({
      verified: true,
      suffix: "FNSE, COREN R.12345",
    });
  });

  it("does not attach a suffix to somebody else's name", () => {
    expect(resolveReviewerCredential("A. Client", profile)).toEqual({
      verified: false,
      suffix: null,
    });
  });

  it("does not attach an unverified suffix to the holder's own name", () => {
    expect(
      resolveReviewerCredential("Uche Okereke", {
        full_name: "Uche Okereke",
        ...unverified,
      }),
    ).toEqual({ verified: false, suffix: null });
  });

  it("handles a missing profile and an empty name", () => {
    expect(resolveReviewerCredential("Uche Okereke", null)).toEqual({
      verified: false,
      suffix: null,
    });
    expect(resolveReviewerCredential("", profile)).toEqual({
      verified: false,
      suffix: null,
    });
  });
});

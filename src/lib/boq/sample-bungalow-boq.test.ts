import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  SAMPLE_BUNGALOW_VERIFICATION,
  SAMPLE_VERIFIED_BUNGALOW_BOQ,
  canonicalSampleJson,
} from "./sample-bungalow-boq";

/**
 * The page calls this sample fingerprinted, so the fingerprint has to be the
 * real one. It was not: the published hash matched no serialisation of the
 * document and nothing recomputed it, so a changed rate would have left a
 * "verified" badge sitting over different numbers.
 *
 * This test is the guarantee. If a rate, quantity or line changes, the hash
 * below changes with it and the suite fails until the constant is updated
 * deliberately.
 */
describe("sample BOQ fingerprint", () => {
  it("is the SHA-256 of the canonical document", () => {
    const digest = createHash("sha256")
      .update(canonicalSampleJson())
      .digest("hex");
    expect(digest).toBe(SAMPLE_BUNGALOW_VERIFICATION.sha256Hash);
  });

  it("breaks when a rate changes", () => {
    const tampered = JSON.parse(
      JSON.stringify(SAMPLE_VERIFIED_BUNGALOW_BOQ),
    ) as typeof SAMPLE_VERIFIED_BUNGALOW_BOQ;
    tampered.sections[0].items[0].labour_rate += 1;
    const digest = createHash("sha256")
      .update(canonicalSampleJson(tampered))
      .digest("hex");
    expect(digest).not.toBe(SAMPLE_BUNGALOW_VERIFICATION.sha256Hash);
  });

  it("breaks when a quantity changes", () => {
    const tampered = JSON.parse(
      JSON.stringify(SAMPLE_VERIFIED_BUNGALOW_BOQ),
    ) as typeof SAMPLE_VERIFIED_BUNGALOW_BOQ;
    tampered.sections[0].items[0].quantity += 0.5;
    const digest = createHash("sha256")
      .update(canonicalSampleJson(tampered))
      .digest("hex");
    expect(digest).not.toBe(SAMPLE_BUNGALOW_VERIFICATION.sha256Hash);
  });

  it("does not depend on key order", () => {
    const reordered = Object.fromEntries(
      Object.entries(SAMPLE_VERIFIED_BUNGALOW_BOQ).reverse(),
    );
    expect(canonicalSampleJson(reordered)).toBe(canonicalSampleJson());
  });

  it("makes no claim it cannot support", () => {
    // No anchored block and no blockchain attribution, because no receipt
    // exists for this sample. The reviewer is named, but carries no borrowed
    // licence number.
    const claims = JSON.stringify(SAMPLE_BUNGALOW_VERIFICATION).toLowerCase();
    expect(claims).not.toMatch(/blockchain/);
    expect(claims).not.toMatch(/opentimestamp/);
    expect(claims).not.toMatch(/qs #|fnse/);
    expect(SAMPLE_BUNGALOW_VERIFICATION.status).toMatch(/sample/i);
  });

  it("names the reviewer the owner supplied", () => {
    expect(SAMPLE_BUNGALOW_VERIFICATION.reviewerName).toBe("Engr. U. Okereke");
    expect(SAMPLE_VERIFIED_BUNGALOW_BOQ.review.reviewer_name).toBe(
      "Engr. U. Okereke",
    );
  });
});

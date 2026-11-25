/**
 * Editorial identity invariants.
 *
 * E-E-A-T only helps if the claims are true and checkable. These tests fail if
 * the module starts inventing people, drops the company's real registration,
 * or loses the publishing-principles link a reviewer follows.
 */
import { describe, expect, it } from "vitest";
import {
  EDITORIAL_DESK,
  EDITORIAL_LIMITS,
  EDITORIAL_URL,
  NAMED_REVIEWERS,
  PUBLISHER,
  REVIEW_POLICY,
  authorSchema,
  publisherSchema,
} from "./editorial";

describe("publisher identity", () => {
  it("states the real company and its registration", () => {
    expect(PUBLISHER.name).toBe("FRELUX Technologies Ltd");
    expect(PUBLISHER.registrationNumber).toMatch(/^RC-\d{6,}$/);
    expect(PUBLISHER.addressCountry).toBe("NG");
    expect(PUBLISHER.email).toContain("@");
  });

  it("publishes an Organization node that points at the editorial policy", () => {
    const schema = publisherSchema();
    expect(schema["@type"]).toBe("Organization");
    expect(schema.publishingPrinciples).toBe(EDITORIAL_URL);
    expect(schema.publishingPrinciples).toMatch(/^https:\/\//);
    expect(schema.identifier.value).toBe(PUBLISHER.registrationNumber);
  });
});

describe("authorship", () => {
  it("never invents a named reviewer", () => {
    for (const reviewer of NAMED_REVIEWERS) {
      // A named reviewer must be verifiable: real name, real credential and a
      // public profile a reader can open. Nothing here may be a placeholder.
      expect(reviewer.name.length).toBeGreaterThan(3);
      expect(reviewer.credential.length).toBeGreaterThan(3);
      expect(reviewer.sameAs).toMatch(/^https:\/\//);
      expect(reviewer.expertise.length).toBeGreaterThan(0);
      expect(reviewer.name).not.toMatch(/placeholder|tbd|example/i);
    }
  });

  it("falls back to the desk as an Organization author", () => {
    const schema = authorSchema();
    expect(schema["@type"]).toBe("Organization");
    expect(schema.name).toBe(EDITORIAL_DESK.name);
    expect(schema.url).toBe(EDITORIAL_URL);
  });

  it("emits a Person node for a named reviewer, with the credential attached", () => {
    const schema = authorSchema({
      name: "A. Reviewer",
      credential: "Registered Quantity Surveyor (NIQS)",
      role: "Reviewer",
      sameAs: "https://example.org/profile",
      expertise: ["Quantity surveying"],
    });
    expect(schema["@type"]).toBe("Person");
    expect(schema.description).toContain("NIQS");
    expect(schema.worksFor).toEqual({ "@id": expect.stringContaining("#organization") });
  });
});

describe("review policy", () => {
  it("describes a real process, not a slogan", () => {
    expect(REVIEW_POLICY.length).toBeGreaterThanOrEqual(4);
    for (const step of REVIEW_POLICY) {
      expect(step.detail.length).toBeGreaterThan(40);
    }
  });

  it("states the limits of an estimate", () => {
    expect(EDITORIAL_LIMITS.join(" ")).toMatch(/not a professional certification/i);
    expect(EDITORIAL_LIMITS.join(" ")).toMatch(/AI-assisted/i);
  });
});

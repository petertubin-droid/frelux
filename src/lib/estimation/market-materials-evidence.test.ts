import { describe, expect, it } from "vitest";
import { evidenceSentence } from "./market-materials";

describe("evidenceSentence", () => {
  it("says a verified price is verified and nothing more", () => {
    expect(evidenceSentence("supplier_verified")).toBe(
      "Verified supplier price.",
    );
  });

  it("marks a reported price as unverified", () => {
    expect(evidenceSentence("supplier_reported")).toMatch(
      /not independently verified/i,
    );
  });

  it("refuses to call an FX band a quotation", () => {
    expect(evidenceSentence("macro_reference")).toMatch(
      /not a supplier quotation/i,
    );
  });

  it("calls a seeded baseline what it is", () => {
    expect(evidenceSentence("baseline")).toMatch(/not a market price/i);
  });

  it("never emits an em dash", () => {
    const all = [
      "supplier_verified",
      "supplier_reported",
      "macro_reference",
      "baseline",
    ] as const;
    for (const evidence of all) {
      expect(evidenceSentence(evidence)).not.toMatch(/[—–]/);
    }
  });
});

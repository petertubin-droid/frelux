import { describe, expect, it } from "vitest";
import { evidenceCaveat } from "./structural-market";

const row = (over: Record<string, unknown>) => ({
  price: 12000,
  scan_confidence: "manual",
  ...over,
});

describe("structural price evidence", () => {
  it("adds no caveat to a verified supplier quotation", () => {
    expect(
      evidenceCaveat(
        row({
          verification_status: "verified",
          price_source: "supplier price list",
        }),
      ),
    ).toBeNull();
  });

  it("marks a reported price as unverified", () => {
    expect(
      evidenceCaveat(
        row({ verification_status: "reported", price_source: "Home Depot" }),
      ),
    ).toMatch(/not independently verified/i);
  });

  it("never lets an FX band pass as a verified anchor", () => {
    expect(
      evidenceCaveat(
        row({
          verification_status: "reported",
          price_source: "FX reference from the live NG book",
        }),
      ),
    ).toMatch(/not a supplier quotation/i);
  });

  it("calls a seeded baseline a placeholder", () => {
    expect(
      evidenceCaveat(
        row({
          verification_status: "reported",
          price_source: "seeded reference (pre-Oct 2026, no retailer link)",
        }),
      ),
    ).toMatch(/placeholder, not a market price/i);
  });
});

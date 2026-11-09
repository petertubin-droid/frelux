// The takeoff page used to stringify any non-primitive result value, so the
// plastering summary printed `{"plastererHours":16.8,"tenderHours":11.8}` and a
// multi-kilobyte packagingEvidence object full of source URLs. That was both
// unreadable and wide enough to push the results card off a phone screen.

import { describe, it, expect } from "vitest";
import {
  buildSummaryRows,
  humaniseResultKey,
  summariseResultValue,
} from "../takeoff-rows";

describe("summariseResultValue", () => {
  it("passes primitives through as they read", () => {
    expect(summariseResultValue(48)).toBe("48");
    expect(summariseResultValue("1:5")).toBe("1:5");
    expect(summariseResultValue(true)).toBe("Yes");
    expect(summariseResultValue(false)).toBe("No");
  });

  it("skips empty and non-finite values instead of printing them", () => {
    expect(summariseResultValue(null)).toBeNull();
    expect(summariseResultValue(undefined)).toBeNull();
    expect(summariseResultValue("   ")).toBeNull();
    expect(summariseResultValue(Number.NaN)).toBeNull();
  });

  it("turns a flat breakdown into labelled numbers, not JSON", () => {
    expect(
      summariseResultValue({ plastererHours: 16.8, tenderHours: 11.8 }),
    ).toBe("Plasterer Hours 16.8 · Tender Hours 11.8");
  });

  it("drops evidence objects that another panel already renders", () => {
    expect(
      summariseResultValue({
        label: "Cement bag size",
        guidance: "Confirm the label.",
        sources: [{ url: "https://example.com", publisher: "Retailer" }],
        observedPackSizesKg: [50],
      }),
    ).toBeNull();
  });

  it("drops bare arrays rather than joining hundreds of characters", () => {
    expect(summariseResultValue([1, 2, 3])).toBeNull();
    expect(summariseResultValue(["https://example.com/very/long/path"])).toBeNull();
  });

  it("never emits a brace, a bracket or a quoted key", () => {
    const candidates: unknown[] = [
      { plastererHours: 16.8, tenderHours: 11.8 },
      { label: "x", sources: [{ url: "y" }] },
      [{ a: 1 }],
      { nested: { deep: true } },
      "plain",
      42,
    ];
    for (const value of candidates) {
      const text = summariseResultValue(value) ?? "";
      for (const brace of ["{", "}", "[", "]"]) {
        expect(text, `"${text}" contains ${brace}`).not.toContain(brace);
      }
      expect(text).not.toMatch(/"\w+"\s*:/);
    }
  });
});

describe("humaniseResultKey", () => {
  it("spaces camelCase and snake_case and capitalises", () => {
    expect(humaniseResultKey("totalAreaM2")).toBe("Total Area M2");
    expect(humaniseResultKey("internal_plaster")).toBe("Internal plaster");
    expect(humaniseResultKey("Application Type")).toBe("Application Type");
  });
});

describe("buildSummaryRows", () => {
  const plasteringResult = {
    marketCode: "NG",
    totalAreaM2: 48,
    applicationType: "internal_plaster",
    thicknessMm: 12,
    coats: 1,
    mixRatio: "1:5",
    wetMortarVolumeM3: 0.605,
    cementBagsRequired: 5,
    estimatedLaborHours: { plastererHours: 16.8, tenderHours: 11.8 },
    marketNotes: "50 kg cement pack is supported by at least one listed source.",
    packagingEvidence: {
      label: "Cement bag size for NG",
      guidance: "Confirm the bag label.",
      sources: [{ url: "https://example.com", publisher: "Retailer" }],
      observedPackSizesKg: [50],
    },
  };

  it("hides the market code the panel already states", () => {
    const rows = buildSummaryRows(plasteringResult);
    expect(rows.map((row) => row.label)).not.toContain("Market Code");
  });

  it("keeps the readable numbers and both labour figures", () => {
    const rows = buildSummaryRows(plasteringResult, {
      estimatedLaborHours: "Estimated labour hours",
      cementBagsRequired: "Cement bags required",
    });
    const labour = rows.find((row) => row.label === "Estimated labour hours");
    expect(labour?.value).toBe("Plasterer Hours 16.8 · Tender Hours 11.8");
    expect(rows.find((row) => row.label === "Cement bags required")?.value).toBe(
      "5",
    );
  });

  it("leaves the packaging evidence to its own panel", () => {
    const rows = buildSummaryRows(plasteringResult);
    expect(rows.map((row) => row.label)).not.toContain("Packaging Evidence");
    // The long market note is prose and must still be shown.
    expect(rows.map((row) => row.label)).toContain("Market Notes");
  });

  it("produces no row value long enough to widen the card", () => {
    for (const row of buildSummaryRows(plasteringResult)) {
      expect(row.value.length).toBeLessThan(400);
      for (const brace of ["{", "}", "[", "]"]) {
        expect(row.value).not.toContain(brace);
      }
    }
  });
});

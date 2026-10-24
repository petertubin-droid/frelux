import { describe, it, expect } from "vitest";
import { buildQuotation } from "./quotation-engine";
import type { CostEstimate } from "./cost-integration";
import type { QuoteTaxResolution } from "@/lib/tax/quote-tax";

const estimate: CostEstimate = {
  lineItems: [],
  categories: [],
  materialsTotal: 1000,
  labourTotal: 500,
  contingencyPercent: 0,
  contingencyAmount: 0,
  grandTotal: 1500,
  currency: "NGN",
  confidence: "medium",
  pricedItemCount: 0,
  unpricedItemCount: 0,
  stalePriceCount: 0,
  overriddenPriceCount: 0,
} as unknown as CostEstimate;

function resolution(
  kind: QuoteTaxResolution["kind"],
  over: Partial<QuoteTaxResolution> = {},
): QuoteTaxResolution {
  return {
    kind,
    pct: kind === "not_determined" ? null : 7.5,
    source:
      kind === "verified_rule"
        ? "jurisdiction_rule"
        : kind === "manual_assumption"
          ? "caller_override"
          : null,
    jurisdiction:
      kind === "not_determined"
        ? null
        : {
            marketCode: "NG",
            jurisdictionLevel: "national",
            jurisdictionCode: "NG",
          },
    rule: kind === "verified_rule" ? { code: "NG-VAT-FED", version: 1 } : null,
    citation:
      kind === "verified_rule"
        ? {
            title: "VAT Act",
            url: "https://firs.gov.ng/",
            publisher: "Federal Inland Revenue Service (FIRS)",
          }
        : null,
    effectiveFrom: kind === "verified_rule" ? "2019-02-01" : null,
    components:
      kind === "not_determined" ? [] : [{ name: "VAT", ratePct: 7.5 }],
    assumptionAuthor:
      kind === "manual_assumption" ? "entered on this quotation" : null,
    resolvedAt: "2026-10-24T12:00:00.000Z",
    compoundUnsupported: false,
    message: "",
    ...over,
  };
}

describe("buildQuotation tax resolution surface", () => {
  it("renders a verified rule with components, source and effective date", () => {
    const doc = buildQuotation({
      costEstimate: estimate,
      projectName: "P",
      taxResolution: resolution("verified_rule"),
    });
    const labels = doc.sections
      .flatMap(
        (sec) =>
          (sec as { fields?: { label: string; value: string }[] }).fields ?? [],
      )
      .map((f) => f.label);
    const taxLine = labels.find((l) => l.startsWith("Tax (7.5%"));
    expect(taxLine).toContain("verified: NG-VAT-FED");
    expect(labels.some((l) => l.includes("VAT (7.5%)"))).toBe(true);
    expect(
      labels.some((l) => l.includes("Federal Inland Revenue Service")),
    ).toBe(true);
    expect(doc.taxAmount).toBe(1500 * 0.075);
    expect(doc.grandTotal).toBe(1500 * 1.075);
    expect(doc.explanation.some((e) => e.includes("Tax source"))).toBe(true);
  });

  it("labels a manual assumption as not tax due", () => {
    const doc = buildQuotation({
      costEstimate: estimate,
      projectName: "P",
      taxResolution: resolution("manual_assumption"),
    });
    const labels = doc.sections
      .flatMap((sec) => (sec as { fields?: { label: string }[] }).fields ?? [])
      .map((f) => f.label);
    expect(labels.find((l) => l.startsWith("Tax (7.5%"))).toContain(
      "manual assumption, not tax due",
    );
    expect(doc.explanation.some((e) => e.includes("manual assumption"))).toBe(
      true,
    );
  });

  it("renders the compound-unsupported state without a computed amount", () => {
    const doc = buildQuotation({
      costEstimate: estimate,
      projectName: "P",
      taxResolution: resolution("not_determined", {
        compoundUnsupported: true,
        components: [
          { name: "VAT", ratePct: 10 },
          { name: "Levy", ratePct: 2 },
        ],
        rule: { code: "XX-T", version: 1 },
      }),
    });
    const values = doc.sections
      .flatMap(
        (sec) =>
          (sec as { fields?: { label: string; value: string }[] }).fields ?? [],
      )
      .filter((f) => f.label === "Tax")
      .map((f) => f.value);
    expect(values[0]).toContain("component-level display required");
    expect(doc.taxPercent).toBeNull();
    expect(doc.taxAmount).toBe(0);
    expect(doc.grandTotal).toBe(1500);
  });

  it("a resolution with null pct overrides a settings percentage (fail closed)", () => {
    const doc = buildQuotation({
      costEstimate: estimate,
      projectName: "P",
      settings: { taxPercent: 5 },
      taxResolution: resolution("not_determined"),
    });
    expect(doc.taxPercent).toBeNull();
    expect(doc.grandTotal).toBe(1500);
  });

  it("without a resolution the legacy settings behavior is unchanged", () => {
    const doc = buildQuotation({
      costEstimate: estimate,
      projectName: "P",
      settings: { taxPercent: 5 },
    });
    expect(doc.taxPercent).toBe(5);
    expect(doc.taxAmount).toBe(75);
    const doc2 = buildQuotation({ costEstimate: estimate, projectName: "P" });
    expect(doc2.taxPercent).toBeNull();
    expect(doc2.taxAmount).toBe(0);
  });
});

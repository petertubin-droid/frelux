import { describe, expect, it } from "vitest";
import { compileBoq } from "./compile";
import {
  buildQuoteShareMessage,
  buildQuoteShareSnapshot,
  quoteShareExpiryLabel,
  quoteShareFilename,
  quoteShareHeading,
  quoteShareUrl,
} from "./share";
import { createEmptyDocument, type BoqStudioDocument } from "./types";

function doc(over: Partial<BoqStudioDocument> = {}): BoqStudioDocument {
  const base = createEmptyDocument({
    currency: "NGN",
    marketCode: "NG",
    standard: "Commercial",
    templateSlug: "ng-commercial",
    preparedBy: "QS",
  });
  return {
    ...base,
    title: "Duplex at Lekki",
    reference: "BOQ 2026/001",
    client: { name: "A. Client" },
    commercials: {
      ...base.commercials,
      preliminaries_pct: 5,
      overhead_profit_pct: 10,
      contingency_pct: 0,
      retention_pct: 0,
      waste_allowance_pct: 0,
      tax_pct: 7.5,
    },
    sections: [
      {
        id: "s1",
        code: "05",
        title: "Concrete",
        notes: "",
        items: [
          {
            id: "a",
            item_number: "05.01",
            description: "Grade 20 concrete",
            specification: "",
            unit: "m3",
            quantity: 10,
            material_rate: 90000,
            labour_rate: 0,
            plant_rate: 0,
            notes: "",
            rates_include_waste: false,
          },
        ],
      },
    ],
    ...over,
  };
}

describe("quotation sharing", () => {
  it("snapshots the compiled document exactly as shared", () => {
    const compiled = compileBoq(doc());
    const snapshot = buildQuoteShareSnapshot(
      compiled,
      "2026-11-05T10:00:00.000Z",
    );
    expect(snapshot.schema).toBe(1);
    expect(snapshot.mode).toBe("priced");
    expect(snapshot.shared_at).toBe("2026-11-05T10:00:00.000Z");
    expect(snapshot.standard.summary.grossTotal).toBe(
      compiled.standard.summary.grossTotal,
    );
    expect(snapshot.survey.is_survey).toBe(false);
  });

  it("builds the public link from the share id", () => {
    expect(quoteShareUrl("9f2c-token")).toContain("/quote/9f2c-token");
  });

  it("names survey exports so they cannot pass as a priced bill", () => {
    expect(quoteShareFilename(doc(), "pdf")).toBe("BOQ-2026-001-R0.pdf");
    expect(quoteShareFilename({ ...doc(), mode: "market_survey" }, "pdf")).toBe(
      "BOQ-2026-001-R0-market-survey.pdf",
    );
  });

  it("leads a priced message with the total", () => {
    const compiled = compileBoq(doc());
    const snapshot = buildQuoteShareSnapshot(compiled);
    const message = buildQuoteShareMessage(snapshot, "https://x.test/quote/1");
    expect(message).toContain("FRELUX quotation");
    expect(message).toContain("A. Client");
    expect(message).toContain("Total");
    expect(message).toContain("https://x.test/quote/1");
    expect(message).not.toContain("—");
  });

  it("says a survey has no prices instead of quoting a total", () => {
    const compiled = compileBoq({
      ...doc(),
      mode: "market_survey",
      sections: [
        {
          id: "s1",
          code: "05",
          title: "Concrete",
          notes: "",
          items: [
            {
              id: "a",
              item_number: "05.01",
              description: "Grade 20 concrete",
              specification: "",
              unit: "m3",
              quantity: 10,
              material_rate: 0,
              labour_rate: 0,
              plant_rate: 0,
              notes: "",
              rates_include_waste: false,
            },
          ],
        },
      ],
    });
    const snapshot = buildQuoteShareSnapshot(compiled);
    const message = buildQuoteShareMessage(snapshot, "https://x.test/quote/2");
    expect(message).toContain("FRELUX market survey");
    expect(message).toContain("no prices");
    expect(message).toContain("Rates to be completed in the market");
    expect(message).not.toMatch(/Total /);
  });

  it("reports collected rates on a completed survey", () => {
    const compiled = compileBoq({
      ...doc(),
      mode: "market_survey",
      sections: [
        {
          id: "s1",
          code: "05",
          title: "Concrete",
          notes: "",
          items: [
            {
              id: "a",
              item_number: "05.01",
              description: "Grade 20 concrete",
              specification: "",
              unit: "m3",
              quantity: 10,
              material_rate: 92000,
              labour_rate: 0,
              plant_rate: 0,
              notes: "",
              rates_include_waste: false,
            },
          ],
        },
      ],
    });
    const snapshot = buildQuoteShareSnapshot(compiled);
    const message = buildQuoteShareMessage(snapshot, "https://x.test/quote/3");
    expect(snapshot.survey.complete).toBe(true);
    expect(message).toContain("market total");
    expect(message).toContain("920,000");
  });

  it("labels the document type and its expiry", () => {
    expect(quoteShareHeading("priced")).toBe("Quotation");
    expect(quoteShareHeading("market_survey")).toBe("Market survey");
    expect(quoteShareExpiryLabel(null)).toBe("No expiry");
    expect(quoteShareExpiryLabel("2026-12-01T00:00:00.000Z")).toBe(
      "Expires 2026-12-01",
    );
  });
});

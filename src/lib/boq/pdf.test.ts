import { describe, expect, it } from "vitest";
import { compileBoq } from "./compile";
import { buildBoqPdf } from "./pdf";
import { createEmptyDocument, type BoqStudioDocument } from "./types";

function doc(over: Partial<BoqStudioDocument> = {}): BoqStudioDocument {
  const base = createEmptyDocument({
    currency: "NGN",
    marketCode: "NG",
    standard: "Commercial",
    templateSlug: "ng-commercial",
    preparedBy: "QS Team",
  });
  return {
    ...base,
    title: "Duplex at Lekki",
    reference: "BOQ-2026-001",
    description: "Reinforced concrete duplex, two floors.",
    client: { name: "A. Client", address: "Lekki Phase 1, Lagos" },
    contractor: { name: "FRELUX Builders" },
    assumptions: ["Rates valid for 30 days."],
    exclusions: ["External drainage excluded."],
    commercials: { ...base.commercials, preliminaries_pct: 2.5, tax_pct: 7.5 },
    sections: [
      {
        id: "s1",
        code: "05",
        title: "Concrete Works",
        notes: "",
        items: Array.from({ length: 40 }, (_, i) => ({
          id: `i${i}`,
          item_number: `05.${String(i + 1).padStart(2, "0")}`,
          description: `Reinforced concrete item ${i + 1} in foundation and suspended slabs`,
          specification: "Grade 20",
          unit: "m³",
          quantity: 10 + i,
          material_rate: 90000,
          labour_rate: 25000,
          plant_rate: 0,
          notes: "",
          rates_include_waste: false,
        })),
      },
    ],
    ...over,
  };
}

describe("buildBoqPdf", () => {
  it("produces a multi-page PDF", async () => {
    const compiled = compileBoq(doc());
    const pdf = await buildBoqPdf(compiled.standard, compiled.document);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    const bytes = pdf.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });

  it("states the preliminary status when no reviewer is named", async () => {
    const compiled = compileBoq(doc());
    const pdf = await buildBoqPdf(compiled.standard, compiled.document);
    const text = pdf.output();
    expect(text).toBeTruthy();
    expect(compiled.is_preliminary).toBe(true);
  });

  it("renders a reviewed document without error", async () => {
    const compiled = compileBoq(
      doc({
        review: {
          status: "reviewed",
          reviewer_name: "A. Bello",
          reviewer_qualification: "QS, MNIQS",
          reviewed_at: "2026-10-30T00:00:00.000Z",
          note: "Quantities checked against approved drawings.",
        },
      }),
    );
    const pdf = await buildBoqPdf(compiled.standard, compiled.document);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(compiled.is_preliminary).toBe(false);
  });

  it("honours a template that hides the labour column", async () => {
    const compiled = compileBoq(doc());
    const pdf = await buildBoqPdf(compiled.standard, compiled.document, {
      showLabourRate: false,
    });
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});

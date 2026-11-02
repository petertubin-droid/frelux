import { describe, expect, it } from "vitest";
import {
  compileBoq,
  documentStatusLabel,
  formatMoney,
  taxLabelFor,
} from "./compile";
import {
  createEmptyDocument,
  type BoqStudioDocument,
  type BoqStudioItem,
} from "./types";

const item = (over: Partial<BoqStudioItem> = {}): BoqStudioItem => ({
  id: Math.random().toString(36).slice(2),
  item_number: "",
  description: "Concrete grade 20 in foundation",
  specification: "1:2:4, 150mm",
  unit: "m³",
  quantity: 10,
  material_rate: 90000,
  labour_rate: 25000,
  plant_rate: 0,
  notes: "",
  rates_include_waste: false,
  ...over,
});

function baseDoc(over: Partial<BoqStudioDocument> = {}): BoqStudioDocument {
  const doc = createEmptyDocument({
    currency: "NGN",
    marketCode: "NG",
    standard: "Commercial",
    templateSlug: "ng-commercial",
    preparedBy: "Tester",
  });
  return {
    ...doc,
    title: "Duplex at Lekki",
    reference: "BOQ-2026-001",
    sections: [
      {
        id: "s1",
        code: "05",
        title: "Concrete Works",
        notes: "",
        items: [item()],
      },
      {
        id: "s2",
        code: "07",
        title: "Blockwork",
        notes: "",
        items: [
          item({
            description: "225mm sandcrete wall",
            unit: "m²",
            quantity: 40,
            material_rate: 3000,
            labour_rate: 1500,
          }),
        ],
      },
    ],
    ...over,
  };
}

describe("compileBoq", () => {
  it("multiplies quantity by the combined material and labour rate", () => {
    const { standard } = compileBoq(baseDoc());
    const concrete = standard.sections.find((s) => s.code === "05")!
      .subSections[0].items[0];
    expect(concrete.unitRate).toBe(115000);
    expect(concrete.totalCost).toBe(1150000);
  });

  it("adds sections to a measured works total", () => {
    const { standard } = compileBoq(baseDoc());
    // concrete 10 × 115,000 = 1,150,000; blockwork 40 × 4,500 = 180,000
    expect(standard.summary.measuredWorksTotal).toBe(1330000);
  });

  it("generates deterministic item numbers per section", () => {
    const { standard } = compileBoq(baseDoc());
    const numbers = standard.sections.flatMap((s) =>
      s.subSections.flatMap((sub) => sub.items.map((i) => i.itemNumber)),
    );
    expect(numbers).toEqual(["05.01", "07.01"]);
  });

  it("keeps explicit item numbers", () => {
    const doc = baseDoc();
    doc.sections[0].items[0].item_number = "05.04.2";
    const { standard } = compileBoq(doc);
    expect(standard.sections[0].subSections[0].items[0].itemNumber).toBe(
      "05.04.2",
    );
  });

  it("applies commercial percentages in order and rounds to the cent", () => {
    const doc = baseDoc({
      commercials: {
        preliminaries_pct: 2.5,
        overhead_profit_pct: 10,
        contingency_pct: 5,
        retention_pct: 0,
        waste_allowance_pct: 0,
        tax_pct: 7.5,
      },
    });
    const { standard } = compileBoq(doc);
    const s = standard.summary;
    expect(s.measuredWorksTotal).toBe(1330000);
    expect(s.preliminariesAmount).toBe(33250);
    expect(s.subtotalBeforeOhp).toBe(1363250);
    expect(s.overheadProfitAmount).toBe(136325);
    expect(s.subtotalBeforeContingency).toBe(1499575);
    expect(s.contingencyAmount).toBe(74978.75);
    expect(s.subtotalBeforeTax).toBe(1574553.75);
    expect(s.taxAmount).toBe(118091.53);
    expect(s.grossTotal).toBe(1692645.28);
  });

  it("adds a waste allowance as its own visible line", () => {
    const doc = baseDoc();
    doc.commercials.waste_allowance_pct = 5;
    const { standard, warnings } = compileBoq(doc);
    const wasteSection = standard.sections.find((s) => s.code === "WA");
    expect(wasteSection).toBeDefined();
    expect(wasteSection!.sectionTotal).toBe(66500); // 5% of 1,330,000
    expect(warnings.blocking).toHaveLength(0);
  });

  it("refuses to count waste twice", () => {
    const doc = baseDoc();
    doc.commercials.waste_allowance_pct = 5;
    doc.sections[0].items[0].rates_include_waste = true;
    const { warnings } = compileBoq(doc);
    expect(warnings.blocking.join(" ")).toMatch(/twice/i);
  });

  it("never invents a tax line", () => {
    const { standard } = compileBoq(baseDoc());
    expect(standard.summary.taxAmount).toBe(0);
    expect(standard.summary.grossTotal).toBe(
      standard.summary.subtotalBeforeTax,
    );
  });

  it("keeps retention out of the payable total", () => {
    const doc = baseDoc();
    doc.commercials.retention_pct = 5;
    const { standard } = compileBoq(doc);
    expect(standard.summary.retentionAmount).toBeGreaterThan(0);
    expect(standard.summary.netPayableTotal).toBe(
      Math.round(
        (standard.summary.grossTotal - standard.summary.retentionAmount) * 100,
      ) / 100,
    );
  });

  it("blocks export when nothing has been measured", () => {
    const doc = baseDoc({ sections: [] });
    expect(compileBoq(doc).warnings.blocking.join(" ")).toMatch(
      /at least one measured item/i,
    );
  });

  it("warns about unpriced items instead of hiding them", () => {
    const doc = baseDoc();
    doc.sections[1].items[0].material_rate = 0;
    doc.sections[1].items[0].labour_rate = 0;
    const { warnings, standard } = compileBoq(doc);
    expect(warnings.advisory.join(" ")).toMatch(/no rate yet/i);
    expect(standard.summary.measuredWorksTotal).toBe(1150000);
  });

  it("marks the document preliminary until a reviewer is named", () => {
    const preliminary = compileBoq(baseDoc());
    expect(preliminary.is_preliminary).toBe(true);
    expect(documentStatusLabel(preliminary.document)).toMatch(
      /not professionally reviewed/i,
    );

    const approved = compileBoq(
      baseDoc({
        review: {
          status: "reviewed",
          reviewer_name: "A. Bello",
          reviewer_qualification: "QS, MNIQS",
        },
      }),
    );
    expect(approved.is_preliminary).toBe(false);
    expect(documentStatusLabel(approved.document)).toBe(
      "Reviewed by A. Bello, QS, MNIQS",
    );
  });

  it("ignores a stale reviewed flag with no reviewer name", () => {
    const doc = baseDoc({ review: { status: "reviewed" } });
    expect(documentStatusLabel(doc)).toMatch(/not professionally reviewed/i);
  });
});

describe("currency and tax presentation", () => {
  it("formats money in the document currency", () => {
    expect(formatMoney(1330000, "NGN", 2)).toContain("1,330,000");
    expect(formatMoney(1330000, "NGN", 2)).toMatch(/₦|NGN/);
    expect(formatMoney(1234.5, "GBP", 2)).toMatch(/£|GBP/);
  });

  it("names tax per market", () => {
    expect(taxLabelFor("NG")).toBe("VAT");
    expect(taxLabelFor("DE")).toBe("MwSt");
    expect(taxLabelFor("FR")).toBe("TVA");
    expect(taxLabelFor("AU")).toBe("GST");
    expect(taxLabelFor("ZZ")).toBe("VAT");
  });
});

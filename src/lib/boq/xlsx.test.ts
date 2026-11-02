import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { compileBoq } from "./compile";
import { createEmptyDocument, type BoqStudioDocument } from "./types";
import { buildBoqXlsx, boqXlsxFilename } from "./xlsx";

function doc(): BoqStudioDocument {
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
    assumptions: ["Rates exclude escalation beyond 30 days."],
    exclusions: ["External drainage is excluded."],
    commercials: { ...base.commercials, preliminaries_pct: 2.5, tax_pct: 7.5 },
    sections: [
      {
        id: "s1",
        code: "05",
        title: "Concrete Works",
        notes: "",
        items: [
          {
            id: "i1",
            item_number: "05.01",
            description: "Grade 20 concrete in foundation",
            specification: "1:2:4 mix",
            unit: "m³",
            quantity: 10,
            material_rate: 90000,
            labour_rate: 25000,
            plant_rate: 0,
            notes: "",
            rates_include_waste: false,
          },
        ],
      },
    ],
  };
}

describe("buildBoqXlsx", () => {
  const compiled = compileBoq(doc());
  const bytes = buildBoqXlsx(compiled.standard, compiled.document);

  it("produces a valid zip archive with the required parts", () => {
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
    const files = unzipSync(bytes);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "_rels/.rels",
        "xl/workbook.xml",
        "xl/_rels/workbook.xml.rels",
        "xl/styles.xml",
        "xl/worksheets/sheet1.xml",
      ]),
    );
  });

  it("writes quantities and money as numeric cells", () => {
    const sheet = strFromU8(unzipSync(bytes)["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("<v>10</v>");
    expect(sheet).toContain("<v>90000</v>");
    expect(sheet).toContain("<v>1150000</v>");
    expect(sheet).not.toContain(">1,150,000<");
  });

  it("carries the document identity into the sheet", () => {
    const sheet = strFromU8(unzipSync(bytes)["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("BOQ-2026-001");
    expect(sheet).toContain("Duplex at Lekki");
    expect(sheet).toContain("Grade 20 concrete in foundation");
    expect(sheet).toContain("Preliminary");
  });

  it("includes assumptions and exclusions", () => {
    const sheet = strFromU8(unzipSync(bytes)["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("Assumptions");
    expect(sheet).toContain("External drainage is excluded.");
  });

  it("formats money with the document currency", () => {
    const styles = strFromU8(unzipSync(bytes)["xl/styles.xml"]);
    expect(styles).toContain('numFmt numFmtId="164" formatCode="&quot;NGN ');
  });

  it("names the file after the reference and revision", () => {
    expect(boqXlsxFilename(compiled.document)).toBe("BOQ-2026-001-R0.xlsx");
  });
});

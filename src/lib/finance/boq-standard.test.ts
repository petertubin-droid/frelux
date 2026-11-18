import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assembleStandardBoq,
  exportBoqToCsv,
  exportBoqToPrintHtml,
  STANDARD_SECTION_TEMPLATES,
  resolveMarketBoqStandard,
} from "./boq-standard";

describe("Standardized BOQ Assembly Engine", () => {
  it("has valid templates for all 4 measurement standards", () => {
    expect(STANDARD_SECTION_TEMPLATES.NRM2.length).toBeGreaterThan(5);
    expect(STANDARD_SECTION_TEMPLATES.CESMM4.length).toBeGreaterThan(5);
    expect(STANDARD_SECTION_TEMPLATES.ICMS.length).toBeGreaterThan(5);
    expect(STANDARD_SECTION_TEMPLATES.Commercial.length).toBeGreaterThan(5);
  });

  it("assembles an NRM2 compliant BOQ with commercials and statutory deductions", () => {
    const doc = assembleStandardBoq({
      metadata: {
        title: "Victoria Island Commercial Complex",
        projectRef: "PRJ-2026-001",
        clientName: "Zenith Holdings Ltd",
        contractorName: "Buildcorp Engineering",
        location: "Lagos, Nigeria",
        marketCode: "NG",
        currency: "NGN",
        preparedBy: "Lead QS Andrew James",
        date: "2026-10-15",
        revision: "Rev A",
        standard: "NRM2",
      },
      commercials: {
        preliminariesPercent: 5, // 5%
        overheadProfitPercent: 10, // 10%
        contingencyPercent: 5, // 5%
        retentionPercent: 5, // 5%
      },
      sections: [
        {
          code: "04",
          title: "Substructure & Foundations",
          subSections: [
            {
              code: "04.1",
              title: "Excavation & Earthworks",
              items: [
                {
                  itemNumber: "04.1.01",
                  description:
                    "Excavate trench in firm clay not exceeding 1.50m depth",
                  quantity: 120,
                  unit: "m³",
                  materialRate: 0,
                  laborRate: 3500,
                  plantRate: 2000,
                  specificationRef: "BS 6031:2009",
                },
                {
                  itemNumber: "04.1.02",
                  description: "Plain in situ concrete blinding C15",
                  quantity: 25,
                  unit: "m³",
                  materialRate: 45000,
                  laborRate: 5000,
                  plantRate: 2000,
                  specificationRef: "BS 8500-2",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(doc.sections.length).toBe(1);
    const sec = doc.sections[0];
    expect(sec.subSections.length).toBe(1);
    const items = sec.subSections[0].items;
    expect(items.length).toBe(2);

    // Item 1: 120 * (3500 + 2000) = 120 * 5500 = 660,000
    expect(items[0].unitRate).toBe(5500);
    expect(items[0].totalCost).toBe(660000);

    // Item 2: 25 * (45000 + 5000 + 2000) = 25 * 52000 = 1,300,000
    expect(items[1].unitRate).toBe(52000);
    expect(items[1].totalCost).toBe(1300000);

    // Subtotal = 1,960,000
    expect(sec.sectionTotal).toBe(1960000);
    expect(doc.summary.measuredWorksTotal).toBe(1960000);

    // Preliminaries: 5% of 1,960,000 = 98,000
    expect(doc.summary.preliminariesAmount).toBe(98000);
    expect(doc.summary.subtotalBeforeOhp).toBe(2058000);

    // OH&P: 10% of 2,058,000 = 205,800
    expect(doc.summary.overheadProfitAmount).toBe(205800);
    expect(doc.summary.subtotalBeforeContingency).toBe(2263800);

    // Contingency: 5% of 2,263,800 = 113,190
    expect(doc.summary.contingencyAmount).toBe(113190);
    expect(doc.summary.subtotalBeforeTax).toBe(2376990);

    // Tax (Tax engine result not injected): 0, gross = 2,376,990
    expect(doc.summary.grossTotal).toBe(2376990);

    // Retention: 5% of 2,376,990 = 118,849.50
    expect(doc.summary.retentionAmount).toBe(118849.5);
    expect(doc.summary.netPayableTotal).toBe(2258140.5);
  });

  it("exports valid CSV string with headers and summary", () => {
    const doc = assembleStandardBoq({
      metadata: {
        title: "Test Project",
        projectRef: "REF-001",
        clientName: "Client A",
        marketCode: "GB",
        currency: "GBP",
        preparedBy: "QS",
        date: "2026-10-15",
        revision: "v1",
        standard: "NRM2",
      },
      commercials: { preliminariesPercent: 5 },
      sections: [
        {
          code: "01",
          title: "Prelims",
          subSections: [
            {
              code: "01.1",
              title: "General",
              items: [
                {
                  itemNumber: "1",
                  description: "Site fencing",
                  quantity: 100,
                  unit: "m",
                  materialRate: 15,
                  laborRate: 10,
                },
              ],
            },
          ],
        },
      ],
    });

    const csv = exportBoqToCsv(doc);
    expect(csv).toContain("FRELUX BILL OF QUANTITIES (BOQ)");
    expect(csv).toContain("Test Project");
    expect(csv).toContain("Site fencing");
    expect(csv).toContain("COLLECTION / GRAND SUMMARY");
  });

  it("exports valid print HTML markup", () => {
    const doc = assembleStandardBoq({
      metadata: {
        title: "Office Tower",
        projectRef: "PRJ-999",
        clientName: "Corporate Corp",
        marketCode: "US",
        currency: "USD",
        preparedBy: "Cost Consultant",
        date: "2026-10-15",
        revision: "v1",
        standard: "Commercial",
      },
      commercials: {},
      sections: [],
    });

    const html = exportBoqToPrintHtml(doc);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("FRELUX GLOBAL ENTERPRISE");
    expect(html).toContain("PRJ-999");
    expect(html).toContain("PREPARED & VERIFIED BY:");
  });
});

it("assembles a BESMM4 compliant BOQ with granular rate build-up and NIQS sections", () => {
  const doc = assembleStandardBoq({
    metadata: {
      title: "Lekki Commercial Mixed-Use Plaza",
      projectRef: "PRJ-NG-2026-088",
      clientName: "Eko Atlantic Developments",
      contractorName: "Julius & Partners Construction",
      location: "Lekki Phase 1, Lagos, Nigeria",
      marketCode: "NG",
      currency: "NGN",
      preparedBy: "Engr. & QS O. Adebayo, FNIQS, RQS",
      date: "2026-11-18",
      revision: "Rev 01 - Binding Tender",
      standard: "BESMM4",
      endorsement: {
        certifiedBy: "QS Olumide Adebayo",
        niqsRegNumber: "M/NIQS/4892",
        qsrbnRegNumber: "QSRBN/REG/2014/1108",
        practiceFirm: "Adebayo Cost Engineering Consultants",
        status: "certified_for_bank_tender",
        certificationDate: "2026-11-18",
        notes:
          "Prepared in accordance with NIQS BESMM4 for commercial tender submission.",
      },
    },
    commercials: {
      preliminariesPercent: 6,
      overheadProfitPercent: 12,
      contingencyPercent: 5,
      retentionPercent: 5,
    },
    sections: [
      {
        code: "F",
        title: "In Situ Concrete & Formwork",
        subSections: [
          {
            code: "F.1",
            title: "Reinforced Concrete Members (C25/30)",
            items: [
              {
                itemNumber: "F.1.01",
                description:
                  "Vibrated reinforced in-situ concrete Grade C25/30 in ground beams",
                quantity: 40,
                unit: "m³",
                materialRate: 85000,
                laborRate: 12000,
                plantRate: 8000,
                transportRate: 5000, // Haulage to site
                overheadRate: 3000, // Granular contractor overhead
                profitRate: 4000, // Granular profit allocation
                laborOutputHours: 2.5,
                specificationRef: "BS 8110 / BS EN 1992-1-1",
                standardCode: "BESMM4-F.102",
              },
            ],
          },
        ],
      },
    ],
  });

  expect(doc.metadata.standard).toBe("BESMM4");
  expect(doc.endorsement?.status).toBe("certified_for_bank_tender");
  expect(doc.endorsement?.niqsRegNumber).toBe("M/NIQS/4892");

  const item = doc.sections[0].subSections[0].items[0];
  // Unit rate = 85000 + 12000 + 8000 + 5000 + 3000 + 4000 = 117,000 NGN/m³
  expect(item.unitRate).toBe(117000);
  expect(item.transportRate).toBe(5000);
  expect(item.overheadRate).toBe(3000);
  expect(item.profitRate).toBe(4000);
  expect(item.totalCost).toBe(40 * 117000);

  const csv = exportBoqToCsv(doc);
  expect(csv).toContain("Logistics Rate (NGN)");
  expect(csv).toContain("Overhead Rate (NGN)");
  expect(csv).toContain("Profit Rate (NGN)");
  expect(csv).toContain("BESMM4");

  const html = exportBoqToPrintHtml(doc);
  expect(html).toContain("BESMM4");
  expect(html).toContain("M/NIQS/4892");
  expect(html).toContain("QSRBN/REG/2014/1108");
});

describe("BOQ export disclosure", () => {
  it("labels the generated document as a draft and disclaims standards certification", async () => {
    const { exportBoqToPrintHtml, assembleStandardBoq } =
      await import("./boq-standard");
    const doc = assembleStandardBoq({
      metadata: {
        title: "Test",
        projectRef: "T-1",
        clientName: "Client",
        marketCode: "US",
        currency: "USD",
        preparedBy: "User",
        date: "2026-01-01",
        revision: "1",
        standard: "CSI_MASTERFORMAT",
      },
      commercials: {},
      sections: [],
    });
    const html = exportBoqToPrintHtml(doc);
    expect(html).toContain("DRAFT QUANTITY & COST SCHEDULE");
    expect(html).toContain(
      "Not an official standards-compliant BOQ or certified measurement.",
    );
    expect(html).not.toContain("OFFICIAL BILL OF QUANTITIES");
  });
});

describe("rates, numbering and retention base", () => {
  const oneLine = (over: Record<string, unknown> = {}) =>
    assembleStandardBoq({
      metadata: {
        title: "Rate fidelity",
        projectRef: "REF-1",
        clientName: "Client",
        marketCode: "NG",
        currency: "NGN",
        preparedBy: "QS",
        date: "2026-11-16",
        revision: "R1",
        standard: "Commercial",
      },
      commercials: {},
      sections: [
        {
          code: "05",
          title: "Concrete",
          subSections: [
            {
              code: "05",
              title: "Concrete",
              items: [
                {
                  itemNumber: "05.01",
                  description: "Line",
                  quantity: 7,
                  unit: "item",
                  materialRate: 0.335,
                  ...over,
                },
              ],
            },
          ],
        },
      ],
    });

  it("publishes a unit rate that multiplies back to the amount", () => {
    const doc = oneLine();
    const line = doc.sections[0].subSections[0].items[0];
    expect(line.unitRate).toBe(0.34);
    expect(line.totalCost).toBe(2.38);
    expect(Math.round(line.quantity * line.unitRate * 100) / 100).toBe(
      line.totalCost,
    );
  });

  it("holds retention on the value of work done, not on the tax", () => {
    const doc = assembleStandardBoq({
      metadata: {
        title: "Retention base",
        projectRef: "REF-2",
        clientName: "Client",
        marketCode: "NG",
        currency: "NGN",
        preparedBy: "QS",
        date: "2026-11-16",
        revision: "R1",
        standard: "Commercial",
      },
      commercials: {
        retentionPercent: 5,
        taxResult: {
          status: "calculated",
          lineResults: [],
          warnings: [],
          totals: { net: 1000, tax: 75, gross: 1075 },
          provenance: [
            {
              rateId: "r1",
              taxCode: "VAT",
              marketCode: "NG",
              jurisdictionCode: null,
              rate: 7.5,
              effectiveFrom: "2026-01-01",
              effectiveTo: null,
              sourceUrl: "manual-entry",
              reviewedAt: "2026-01-01",
              reviewerId: "manual-entry",
            },
          ],
        },
      },
      sections: [
        {
          code: "05",
          title: "Concrete",
          subSections: [
            {
              code: "05",
              title: "Concrete",
              items: [
                {
                  itemNumber: "05.01",
                  description: "Line",
                  quantity: 1,
                  unit: "item",
                  materialRate: 1000,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(doc.summary.subtotalBeforeTax).toBe(1000);
    expect(doc.summary.grossTotal).toBe(1075);
    // 5 per cent of 1,000, not of 1,075.
    expect(doc.summary.retentionAmount).toBe(50);
    expect(doc.summary.netPayableTotal).toBe(1025);
  });

  it("gives an unnumbered item a unique number without repeating the code", () => {
    const doc = assembleStandardBoq({
      metadata: {
        title: "Numbering",
        projectRef: "REF-3",
        clientName: "Client",
        marketCode: "NG",
        currency: "NGN",
        preparedBy: "QS",
        date: "2026-11-16",
        revision: "R1",
        standard: "Commercial",
      },
      commercials: {},
      sections: [
        {
          code: "03",
          title: "Earthworks",
          subSections: [
            {
              code: "03",
              title: "Earthworks",
              items: [
                {
                  itemNumber: "",
                  description: "Excavate",
                  quantity: 1,
                  unit: "m3",
                  materialRate: 10,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(doc.sections[0].subSections[0].items[0].itemNumber).toBe("03.01");
  });

  it("escapes user-supplied strings in print HTML", () => {
    const doc = assembleStandardBoq({
      metadata: {
        title: '<script>alert("xss")</script>',
        projectRef: 'PRJ<"1">',
        clientName: "Client & Co <img src=x onerror=alert(1)>",
        contractorName: 'Builder "A"',
        preparedBy: "QS <Bob>",
        location: "Lagos",
        marketCode: "NG",
        currency: "NGN",
        standard: "Commercial",
        date: "2026-05-01",
        revision: "0",
      },
      commercials: {},
      sections: [
        {
          code: "01",
          title: "General <tag>",
          subSections: [
            {
              code: "01.1",
              title: "Prelim <tag>",
              items: [
                {
                  itemNumber: "01.1.01",
                  description: "<img src=x onerror=alert(1)> Custom item",
                  unit: "m2",
                  quantity: 10,
                  materialRate: 100,
                },
              ],
            },
          ],
        },
      ],
    });
    const html = exportBoqToPrintHtml(doc);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
    expect(html).toContain(
      "Client &amp; Co &lt;img src=x onerror=alert(1)&gt;",
    );
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt; Custom item");
  });
});

describe("measurement method per market", () => {
  it("gives each market the method its bills are written to", () => {
    expect(resolveMarketBoqStandard("NG")).toBe("BESMM4");
    expect(resolveMarketBoqStandard("US")).toBe("CSI_MASTERFORMAT");
    expect(resolveMarketBoqStandard("CA")).toBe("CSI_MASTERFORMAT");
    expect(resolveMarketBoqStandard("GB")).toBe("NRM2");
    expect(resolveMarketBoqStandard("IE")).toBe("NRM2");
    expect(resolveMarketBoqStandard("AU")).toBe("NRM2");
    expect(resolveMarketBoqStandard("KE")).toBe("NRM2");
  });

  it("labels a market whose national method is unimplemented as Commercial", () => {
    // Germany, France, India and the Gulf each measure to their own method,
    // which this engine does not implement: an honest trade schedule beats
    // mislabelling their bills as British or American.
    for (const market of ["DE", "FR", "IN", "AE", "SA", "BR", "JP"]) {
      expect(resolveMarketBoqStandard(market)).toBe("Commercial");
    }
  });

  it("tolerates lowercase and blank market codes", () => {
    expect(resolveMarketBoqStandard("ng")).toBe("BESMM4");
    expect(resolveMarketBoqStandard("")).toBe("Commercial");
  });

  it("every standard the resolver can return is selectable in the generator", () => {
    // The generator defaults its picker to the resolver's answer. A resolved
    // value with no matching <option> rendered the control blank, so the user
    // could neither see nor change the method in force.
    const source = readFileSync(
      join(process.cwd(), "src/pages/BoqGenerator.tsx"),
      "utf8",
    );
    const offered = new Set(
      [...source.matchAll(/<option value="([A-Za-z0-9_]+)">/g)].map(
        (m) => m[1],
      ),
    );
    const markets = [
      "NG",
      "US",
      "CA",
      "GB",
      "IE",
      "AU",
      "NZ",
      "ZA",
      "KE",
      "GH",
      "DE",
      "",
    ];
    for (const market of markets) {
      expect(offered.has(resolveMarketBoqStandard(market))).toBe(true);
    }
  });
});

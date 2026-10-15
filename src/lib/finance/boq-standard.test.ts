import { describe, it, expect } from "vitest";
import {
  assembleStandardBoq,
  exportBoqToCsv,
  exportBoqToPrintHtml,
  STANDARD_SECTION_TEMPLATES,
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

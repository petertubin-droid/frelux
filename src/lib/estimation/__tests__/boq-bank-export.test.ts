import { describe, expect, it } from "vitest";
import { generateBoq, type BoqInput } from "../boq-engine";
import { boqToBankHtml } from "../boq-bank-export";
import type { EstimationCalcRule } from "@/types/estimation";

const rules: EstimationCalcRule[] = [
  {
    rule_key: "vat_rate",
    calculator_type: "boq",
    rule_value: { rate: 7.5 },
    rule_status: "verified_frelux",
    description: "",
    is_active: true,
  } as unknown as EstimationCalcRule,
  {
    rule_key: "contingency_rate",
    calculator_type: "boq",
    rule_value: { rate: 5 },
    rule_status: "verified_frelux",
    description: "",
    is_active: true,
  } as unknown as EstimationCalcRule,
];

const input = (currency: string): BoqInput => ({
  title: "Lekki 4-bed build",
  client_name: "Mrs Ada Obi",
  client_contact: "+234 801 000 0000",
  project_location: "Lekki, Lagos",
  currency,
  items: [
    {
      description: "Foundation concrete",
      quantity: 12,
      unit: "m³",
      unit_cost: 68000,
      source_estimate_ref: "FND-001",
    },
    {
      description: "Wall plastering",
      quantity: 340,
      unit: "m²",
      unit_cost: 1850,
      source_estimate_ref: "PLA-002",
    },
  ],
  rules,
});

describe("boqToBankHtml — bank-submittable BOQ (Wave 1.2)", () => {
  const result = generateBoq(input("NGN"));
  expect(result.ok).toBe(true);

  it("contains the four formal blocks (company, project, schedule, terms)", () => {
    const html = boqToBankHtml(input("NGN"), result, "BOQ-TEST1", {
      countryCode: "NG",
      companyName: "Ada Constructions Ltd",
    });
    expect(html).toContain("APPLICANT / CONTRACTING COMPANY");
    expect(html).toContain("PROJECT DETAILS");
    expect(html).toContain("PRICED SCHEDULE OF WORKS");
    expect(html).toContain("TERMS &amp; CONDITIONS");
  });

  it("shows company details and blank fill-in lines for missing ones", () => {
    const html = boqToBankHtml(input("NGN"), result, "BOQ-TEST2", {
      countryCode: "NG",
      companyName: "Ada Constructions Ltd",
    });
    expect(html).toContain("Ada Constructions Ltd");
    // No registration passed → fill-in line, never invented text
    expect(html).toContain('class="fill"');
    expect(html).not.toContain("RC-");
  });

  it("renders in the quote's own currency — never a single-market default", () => {
    const de = boqToBankHtml(input("EUR"), generateBoq(input("EUR")), "BOQ-TEST3", {
      countryCode: "DE",
    });
    expect(de).toContain("EUR");
    expect(de).not.toContain("NGN");
    // German market: MwSt naming, not VAT
    expect(de).toContain("MwSt");
  });

  it("labels the tax row per market scheme", () => {
    const inr = boqToBankHtml(input("INR"), generateBoq(input("INR")), "BOQ-TEST4", {
      countryCode: "IN",
    });
    expect(inr).toContain("GST");
  });

  it("stamps revision and reference", () => {
    const html = boqToBankHtml(input("NGN"), result, "BOQ-TEST5", {
      countryCode: "NG",
      revision: 3,
    });
    expect(html).toContain("BOQ-TEST5");
    expect(html).toContain("v3");
  });

  it("references the source estimate on every line (auditable)", () => {
    const html = boqToBankHtml(input("NGN"), result, "BOQ-TEST6", {
      countryCode: "NG",
    });
    expect(html).toContain("FND-001");
    expect(html).toContain("PLA-002");
  });

  it("unknown market renders the neutral Tax label, not VAT", () => {
    const html = boqToBankHtml(input("USD"), generateBoq(input("USD")), "BOQ-TEST7", {
      countryCode: null,
    });
    expect(html).toContain("Tax (per market rules)");
  });
});

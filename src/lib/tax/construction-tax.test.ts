import { describe, expect, it } from "vitest";
import {
  CANADA_TAX_PROVINCES,
  CIS_RATES,
  CIS_SCHEME_LABELS,
  computeCanadaSalesTax,
  computeCisDeduction,
  computeIndiaGst,
  computeReverseChargeVat,
  computeUsSalesTax,
  type UsSalesTaxTier,
} from "./construction-tax";

describe("UK CIS deductions", () => {
  it("uses HMRC's three rates", () => {
    expect(CIS_RATES.net).toBe(20);
    expect(CIS_RATES.unverified).toBe(30);
    expect(CIS_RATES.gross).toBe(0);
    expect(CIS_SCHEME_LABELS.unverified).toContain("30%");
  });

  it("deducts 20% from labour only, never from materials", () => {
    const cis = computeCisDeduction({ labourAmount: 5000, scheme: "net" });
    expect(cis.deduction).toBe(1000);
    expect(cis.basis).toBe(5000);
    expect(cis.ratePct).toBe(20);
    expect(cis.notes.join(" ")).toContain("materials and VAT are excluded");
  });

  it("deducts 30% for an unverified subcontractor", () => {
    const cis = computeCisDeduction({
      labourAmount: 2500,
      scheme: "unverified",
    });
    expect(cis.deduction).toBe(750);
  });

  it("deducts nothing under gross payment status but still reports", () => {
    const cis = computeCisDeduction({ labourAmount: 8000, scheme: "gross" });
    expect(cis.deduction).toBe(0);
    expect(cis.notes.join(" ")).toContain("reports the payment to HMRC");
  });

  it("rounds to pennies", () => {
    const cis = computeCisDeduction({ labourAmount: 1234.56, scheme: "net" });
    expect(cis.deduction).toBe(246.91);
  });

  it("says when there is no labour to deduct from", () => {
    const cis = computeCisDeduction({ labourAmount: 0, scheme: "net" });
    expect(cis.deduction).toBe(0);
    expect(cis.notes.join(" ")).toContain("no CIS deduction applies");
  });
});

describe("UK domestic reverse charge", () => {
  it("applies between two VAT-registered construction businesses", () => {
    const rc = computeReverseChargeVat({
      taxableBase: 10000,
      supplierVatRegistered: true,
      customerVatRegistered: true,
    });
    expect(rc.applies).toBe(true);
    expect(rc.amountPayable).toBe(0);
    expect(rc.amountAccountedByCustomer).toBe(2000);
    expect(rc.notes.join(" ")).toContain("invoice must state");
  });

  it("does not apply to a non-VAT-registered customer", () => {
    const rc = computeReverseChargeVat({
      taxableBase: 10000,
      supplierVatRegistered: true,
      customerVatRegistered: false,
    });
    expect(rc.applies).toBe(false);
    expect(rc.notes.join(" ")).toContain("customer is not VAT-registered");
  });

  it("does not apply outside specified construction services", () => {
    const rc = computeReverseChargeVat({
      taxableBase: 5000,
      supplierVatRegistered: true,
      customerVatRegistered: true,
      isConstructionService: false,
    });
    expect(rc.applies).toBe(false);
    expect(rc.notes.join(" ")).toContain(
      "not a specified construction service",
    );
  });
});

describe("US multi-tier sales tax", () => {
  const tiers: UsSalesTaxTier[] = [
    { kind: "state", ratePct: 6.25 },
    { kind: "county", name: "LA County", ratePct: 1.5 },
    { kind: "city", name: "City of LA", ratePct: 0.5 },
    { kind: "special_district", name: "Transit district", ratePct: 1.75 },
  ];

  it("adds state, county, city and district rates without compounding", () => {
    const st = computeUsSalesTax({ tiers, materials: 10000, labour: 4000 });
    expect(st.errors).toEqual([]);
    expect(st.combinedRatePct).toBe(10);
    expect(st.totalTax).toBe(1000);
    expect(st.lines).toHaveLength(4);
    // Additive, not compounded: 10000 x 10% exactly.
    expect(st.lines.every((l) => l.base === 10000)).toBe(true);
  });

  it("defaults to taxing materials only, excluding construction labour", () => {
    const st = computeUsSalesTax({ tiers, materials: 10000, labour: 4000 });
    expect(st.lines.every((l) => l.appliesTo === "materials")).toBe(true);
    expect(st.notes.join(" ")).toContain("labour is not taxable");
  });

  it("taxes labour only where a tier says services are taxable", () => {
    const st = computeUsSalesTax({
      tiers: [
        { kind: "state", ratePct: 6 },
        { kind: "county", ratePct: 1, appliesTo: "services" },
      ],
      materials: 10000,
      labour: 4000,
    });
    expect(st.lines[0].base).toBe(10000);
    expect(st.lines[1].base).toBe(4000);
    expect(st.totalTax).toBe(600 + 40);
    expect(st.notes.join(" ")).toContain("Services/labour are taxable");
  });

  it("can tax the combined base when a tier applies to both", () => {
    const st = computeUsSalesTax({
      tiers: [{ kind: "state", ratePct: 5, appliesTo: "both" }],
      materials: 10000,
      labour: 4000,
    });
    expect(st.lines[0].base).toBe(14000);
    expect(st.totalTax).toBe(700);
  });

  it("refuses an empty tier list rather than assuming zero tax", () => {
    const st = computeUsSalesTax({ tiers: [], materials: 1000, labour: 500 });
    expect(st.errors.join(" ")).toContain("No sales-tax tiers");
    expect(st.totalTax).toBe(0);
  });

  it("refuses a negative tier rate", () => {
    const st = computeUsSalesTax({
      tiers: [{ kind: "state", ratePct: -1 }],
      materials: 1000,
      labour: 0,
    });
    expect(st.errors.join(" ")).toContain("non-negative");
  });

  it("notes a tier that has no taxable base on this quotation", () => {
    const st = computeUsSalesTax({
      tiers: [{ kind: "county", ratePct: 1, appliesTo: "services" }],
      materials: 5000,
      labour: 0,
    });
    expect(st.totalTax).toBe(0);
    expect(st.notes.join(" ")).toContain("no taxable base");
  });
});


describe("US capital improvement labour exemption", () => {
  const tiers: UsSalesTaxTier[] = [
    { kind: "state", name: "New York State", ratePct: 4, appliesTo: "both" },
    { kind: "city", name: "NYC", ratePct: 4.5, appliesTo: "both" },
  ];

  it("exempts labour from every tier on a capital improvement", () => {
    const r = computeUsSalesTax({
      tiers,
      materials: 10000,
      labour: 5000,
      capitalImprovement: true,
    });
    // Without the flag, NY taxes services: base would be 15000 per tier.
    expect(r.lines.every((l) => l.appliesTo === "materials")).toBe(true);
    expect(r.lines.every((l) => l.base === 10000)).toBe(true);
    expect(r.totalTax).toBe(850); // 8.5% of materials only
    expect(r.notes.join(" ")).toContain("Capital improvement");
  });

  it("keeps taxing services when the works are NOT a capital improvement", () => {
    const r = computeUsSalesTax({
      tiers,
      materials: 10000,
      labour: 5000,
    });
    expect(r.lines.every((l) => l.appliesTo === "both")).toBe(true);
    expect(r.totalTax).toBe(1275); // 8.5% of the full 15000
  });
});

describe("Canada GST / HST / PST", () => {
  it("charges the single Ontario HST on the full base", () => {
    const r = computeCanadaSalesTax({
      province: "ON",
      materials: 10000,
      labour: 5000,
    });
    expect(r.errors).toHaveLength(0);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].kind).toBe("hst");
    expect(r.lines[0].ratePct).toBe(13);
    expect(r.lines[0].base).toBe(15000);
    expect(r.totalTax).toBe(1950);
    expect(r.combinedRatePct).toBe(13);
  });

  it("adds GST and BC PST, with PST on materials only by default", () => {
    const r = computeCanadaSalesTax({
      province: "BC",
      materials: 10000,
      labour: 5000,
    });
    expect(r.errors).toHaveLength(0);
    expect(r.lines.map((l) => l.kind)).toEqual(["gst", "pst"]);
    const gst = r.lines[0];
    const pst = r.lines[1];
    expect(gst.base).toBe(15000); // GST taxes materials + labour
    expect(gst.amount).toBe(750);
    expect(pst.base).toBe(10000); // PST: materials only
    expect(pst.amount).toBe(700);
    expect(r.totalTax).toBe(1450);
    expect(r.notes.join(" ")).toContain("materials only");
  });

  it("extends PST to labour only when the caller says so", () => {
    const r = computeCanadaSalesTax({
      province: "BC",
      materials: 10000,
      labour: 5000,
      pstAppliesTo: "both",
    });
    expect(r.lines[1].base).toBe(15000);
    expect(r.lines[1].amount).toBe(1050);
  });

  it("charges GST only in Alberta", () => {
    const r = computeCanadaSalesTax({
      province: "AB",
      materials: 10000,
      labour: 5000,
    });
    expect(r.lines.map((l) => l.kind)).toEqual(["gst"]);
    expect(r.totalTax).toBe(750);
  });

  it("carries the harmonised rates in the province table", () => {
    expect(CANADA_TAX_PROVINCES.ON.hstPct).toBe(13);
    expect(CANADA_TAX_PROVINCES.NS.hstPct).toBe(15);
    expect(CANADA_TAX_PROVINCES.NB.hstPct).toBe(15);
    expect(CANADA_TAX_PROVINCES.AB.hstPct).toBeNull();
    expect(CANADA_TAX_PROVINCES.AB.gstPct).toBe(5);
  });

  it("refuses an unknown province instead of guessing", () => {
    const r = computeCanadaSalesTax({
      province: "XX" as never,
      materials: 10000,
      labour: 5000,
    });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("no Canadian tax rates are guessed");
    expect(r.totalTax).toBe(0);
  });
});

describe("India GST — HSN/SAC matching", () => {
  const items = [
    { hsnCode: "2523", amount: 100000 }, // cement, 28%
    { hsnCode: "7214", amount: 50000 },  // steel, 18%
    { hsnCode: "995459", amount: 40000 }, // works contract, 12%
  ];

  it("splits intra-state GST into CGST and SGST at half the HSN rate", () => {
    const r = computeIndiaGst({
      items,
      supplierState: "MH",
      placeOfSupplyState: "MH",
    });
    expect(r.warnings).toHaveLength(0);
    expect(r.interState).toBe(false);
    const cement = r.lines.find((l) => l.hsnCode === "2523")!;
    expect(cement.ratePct).toBe(28);
    expect(cement.mode).toBe("cgst_sgst");
    expect(cement.cgst).toBe(14000);
    expect(cement.sgst).toBe(14000);
    const steel = r.lines.find((l) => l.hsnCode === "7214")!;
    expect(steel.cgst + steel.sgst).toBe(9000);
    const works = r.lines.find((l) => l.hsnCode === "995459")!;
    expect(works.totalTax).toBe(4800);
    expect(r.totalTax).toBe(28000 + 9000 + 4800);
  });

  it("charges full-rate IGST on inter-state supplies", () => {
    const r = computeIndiaGst({
      items,
      supplierState: "MH",
      placeOfSupplyState: "DL",
    });
    expect(r.interState).toBe(true);
    const cement = r.lines.find((l) => l.hsnCode === "2523")!;
    expect(cement.mode).toBe("igst");
    expect(cement.igst).toBe(28000);
    expect(cement.cgst).toBe(0);
    expect(cement.sgst).toBe(0);
  });

  it("refuses unmatched HSN codes with a warning, never guesses", () => {
    const r = computeIndiaGst({
      items: [{ hsnCode: "9999", amount: 1000 }],
      supplierState: "MH",
      placeOfSupplyState: "MH",
    });
    expect(r.lines).toHaveLength(0);
    expect(r.warnings.join(" ")).toContain("no GST rate configured");
    expect(r.totalTax).toBe(0);
  });

  it("honours per-contract rate overrides", () => {
    const r = computeIndiaGst({
      items: [{ hsnCode: "2523", amount: 100000 }],
      supplierState: "MH",
      placeOfSupplyState: "MH",
      rateOverrides: { "2523": 18 },
    });
    expect(r.lines[0].ratePct).toBe(18);
    expect(r.lines[0].totalTax).toBe(18000);
  });

  it("warns when state codes are missing", () => {
    const r = computeIndiaGst({
      items: [{ hsnCode: "2523", amount: 1000 }],
      supplierState: "",
      placeOfSupplyState: "",
    });
    expect(r.warnings.join(" ")).toContain("state codes are both required");
  });
});

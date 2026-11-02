import { describe, expect, it } from "vitest";
import {
  buildRfqFromEstimate,
  compareSupplierQuotes,
  distributeRfqToSuppliers,
  generatePurchaseOrderFromQuote,
  validateSupplierQuote,
  type RfqSupplier,
  type ValidatedQuote,
} from "./rfq-engine";
import type { RequisitionLine } from "./purchase-orders";

const lines: RequisitionLine[] = [
  {
    id: "L1",
    category: "paint",
    name: "Premium Emulsion 20L",
    requiredQuantity: 20,
    unit: "litre",
    packageSize: 20,
    packageCount: 1,
    orderQuantity: 20,
    surplusQuantity: 0,
    estimatedUnitPrice: 12000,
    estimatedOrderTotal: 240000,
    supplier: null,
    status: "rounded",
  },
  {
    id: "L2",
    category: "cement",
    name: "Portland Cement 50kg",
    requiredQuantity: 100,
    unit: "bag",
    packageSize: 50,
    packageCount: 2,
    orderQuantity: 100,
    surplusQuantity: 0,
    estimatedUnitPrice: 5500,
    estimatedOrderTotal: 550000,
    supplier: null,
    status: "rounded",
  },
];

const suppliers: RfqSupplier[] = [
  { name: "Lagos Building Supplies", contact: "sales@lbs.example", punchout: null },
  { name: "CementDirect NG", contact: "quote@cd.example", punchout: "cxml" },
  { name: "ProBuild Depot", contact: "trade@pb.example", punchout: null },
];

function buildAndDistribute() {
  const { rfq, errors } = buildRfqFromEstimate(lines, {
    title: "Lekki Phase 1 repaint",
    deliveryAddress: "12 Admiralty Way, Lekki, Lagos",
    seed: "lekki",
    issuedAt: "2026-10-27T09:00:00.000Z",
  });
  expect(errors).toHaveLength(0);
  const dist = distributeRfqToSuppliers(rfq!, suppliers, {});
  return { rfq: rfq!, dist };
}

describe("buildRfqFromEstimate", () => {
  it("creates an itemized RFQ with a deterministic number and deadline", () => {
    const { rfq, errors } = buildRfqFromEstimate(lines, {
      title: "Lekki Phase 1 repaint",
      deliveryAddress: "12 Admiralty Way, Lekki",
      seed: "lekki",
      issuedAt: "2026-10-27T09:00:00.000Z",
      responseDeadlineDays: 7,
    });
    expect(errors).toHaveLength(0);
    expect(rfq!.rfqNumber).toMatch(/^RFQ-20261027-\d{3}-lekki$/);
    expect(rfq!.lines).toHaveLength(2);
    expect(rfq!.lines[0]).toMatchObject({ id: "L1", orderQuantity: 20, unit: "litre" });
    expect(rfq!.responseDeadline).toBe("2026-11-03"); // 7 days
  });

  it("refuses an RFQ with no lines or no delivery address", () => {
    expect(buildRfqFromEstimate([], { title: "x", deliveryAddress: "y" }).rfq).toBeNull();
    expect(
      buildRfqFromEstimate(lines, { title: "x", deliveryAddress: "" }).errors.join(" "),
    ).toContain("Delivery address is required");
  });

  it("quotes at required quantity when packaging is incomplete, and excludes zero-quantity lines", () => {
    // Packaging could not round: the line is quoted at required quantity and
    // the supplier states package terms in the quote (documented in the notes).
    const unrounded: RequisitionLine[] = [
      { ...lines[0], orderQuantity: null, status: "package_size_required" },
      lines[1],
    ];
    const a = buildRfqFromEstimate(unrounded, {
      title: "t",
      deliveryAddress: "a",
      issuedAt: "2026-10-27T09:00:00.000Z",
    });
    expect(a.errors).toHaveLength(0);
    expect(a.rfq!.lines).toHaveLength(2);
    expect(a.rfq!.lines[0].orderQuantity).toBe(20); // required quantity
    expect(a.rfq!.notes.join(" ")).toContain("package size confirmation");

    // A line with no orderable quantity at all is excluded, never guessed.
    const zero: RequisitionLine[] = [
      { ...lines[0], requiredQuantity: 0, orderQuantity: null },
      lines[1],
    ];
    const b = buildRfqFromEstimate(zero, {
      title: "t",
      deliveryAddress: "a",
      issuedAt: "2026-10-27T09:00:00.000Z",
    });
    expect(b.rfq!.lines).toHaveLength(1);
    expect(b.rfq!.warnings.join(" ")).toContain("excluded from the RFQ");
  });
});

describe("distributeRfqToSuppliers", () => {
  it("issues identical RFQ copies to 3 competing suppliers in one call", () => {
    const { rfq, dist } = buildAndDistribute();
    expect(dist.ok).toBe(true);
    expect(dist.warnings).toHaveLength(0);
    expect(dist.packages).toHaveLength(3);
    expect(dist.packages.map((p) => p.packageNumber)).toEqual([
      `${rfq.rfqNumber}-S1`,
      `${rfq.rfqNumber}-S2`,
      `${rfq.rfqNumber}-S3`,
    ]);
    // Comparability by design: every copy carries the identical basket
    for (const p of dist.packages) {
      expect(p.lines).toEqual(rfq.lines);
      expect(p.emailSubject).toContain("Request for Quotation");
      expect(p.emailBody).toContain(p.supplier.name);
      expect(p.emailBody).toContain("Premium Emulsion 20L");
      expect(p.emailBody).toContain("Portland Cement 50kg");
      expect(p.emailBody).toContain(rfq.deliveryAddress);
    }
  });

  it("distributes to fewer suppliers but states the reduced competition", () => {
    const { rfq } = buildAndDistribute();
    const dist = distributeRfqToSuppliers(rfq, [suppliers[0]], {});
    expect(dist.ok).toBe(true);
    expect(dist.packages).toHaveLength(1);
    expect(dist.warnings.join(" ")).toContain(
      "instead of the standard 3 competing suppliers",
    );
  });

  it("refuses zero suppliers and deduplicates duplicates", () => {
    const { rfq } = buildAndDistribute();
    const none = distributeRfqToSuppliers(rfq, [], {});
    expect(none.ok).toBe(false);
    expect(none.errors.join(" ")).toContain("no supplier was invented");

    const dup = distributeRfqToSuppliers(
      rfq,
      [suppliers[0], { ...suppliers[0] }, suppliers[1]],
      {},
    );
    expect(dup.packages).toHaveLength(2);
    expect(dup.warnings.join(" ")).toContain("Duplicate supplier");
  });
});

describe("validateSupplierQuote + compareSupplierQuotes", () => {
  const { rfq } = buildAndDistribute();

  const fullQuoteA = { supplier: "Lagos Building Supplies", packageNumber: "S1", receivedAt: "2026-10-28T09:00:00Z",
    lines: [
      { rfqLineId: "L1", unitPrice: 12500, availableQuantity: null },
      { rfqLineId: "L2", unitPrice: 5200, availableQuantity: null },
    ] };
  const fullQuoteB = { supplier: "CementDirect NG", packageNumber: "S2", receivedAt: "2026-10-28T10:00:00Z",
    lines: [
      { rfqLineId: "L1", unitPrice: 13000, availableQuantity: null },
      { rfqLineId: "L2", unitPrice: 5000, availableQuantity: null },
    ] };
  // A cheaper total achieved by quoting only ONE line — must NOT win
  const partialQuoteC = { supplier: "ProBuild Depot", packageNumber: "S3", receivedAt: "2026-10-28T11:00:00Z",
    lines: [{ rfqLineId: "L1", unitPrice: 11000, availableQuantity: null }] };

  it("validates full quotes and computes honest totals", () => {
    const v = validateSupplierQuote(rfq, fullQuoteA);
    expect(v.ok).toBe(true);
    expect(v.coverage).toBe(1);
    // 20 × 12500 + 100 × 5200 = 770,000
    expect(v.total).toBe(770000);
  });

  it("refuses unknown lines and reduces coverage for missing ones", () => {
    const junk = validateSupplierQuote(rfq, {
      supplier: "Ghost Supplier",
      packageNumber: null,
      receivedAt: "2026-10-28T09:00:00Z",
      lines: [
        { rfqLineId: "NOT-ON-RFQ", unitPrice: 1, availableQuantity: null },
        { rfqLineId: "L1", unitPrice: 9000, availableQuantity: null },
      ],
    });
    expect(junk.ok).toBe(true);
    expect(junk.lines).toHaveLength(1);
    expect(junk.warnings.join(" ")).toContain("not on RFQ");
    expect(junk.coverage).toBe(0.5);
    expect(junk.total).toBe(180000); // only the quoted line
  });

  it("a partial quote never wins the price comparison by quoting fewer lines", () => {
    const quotes = [
      validateSupplierQuote(rfq, fullQuoteA),
      validateSupplierQuote(rfq, fullQuoteB),
      validateSupplierQuote(rfq, partialQuoteC),
    ];
    const cmp = compareSupplierQuotes(rfq, quotes);
    expect(cmp.bestPriceSupplier).toBe("CementDirect NG");
    expect(cmp.bestPriceTotal).toBe(760000); // 260,000 + 500,000
    const partial = cmp.ranked.find((r) => r.supplier === "ProBuild Depot")!;
    expect(partial.rank).toBeNull(); // excluded from the ranking
    expect(partial.coverage).toBe(0.5);
    expect(cmp.warnings.join(" ")).toContain("excluded from the price ranking");
  });

  it("refuses a quote with no valid line", () => {
    const v = validateSupplierQuote(rfq, {
      supplier: "Empty",
      packageNumber: null,
      receivedAt: "2026-10-28T09:00:00Z",
      lines: [],
    });
    expect(v.ok).toBe(false);
  });
});

describe("generatePurchaseOrderFromQuote", () => {
  const { rfq } = buildAndDistribute();
  const winning: ValidatedQuote = {
    ok: true,
    supplier: "CementDirect NG",
    lines: [
      { rfqLineId: "L1", unitPrice: 13000, availableQuantity: null },
      { rfqLineId: "L2", unitPrice: 5000, availableQuantity: null },
    ],
    total: 760000,
    coverage: 1,
    missingLineIds: [],
    warnings: [],
    errors: [],
  };

  it("issues a PO from the winning full-coverage quote", () => {
    const { po, errors } = generatePurchaseOrderFromQuote(rfq, winning, {
      issuedAt: "2026-10-29T09:00:00Z",
    });
    expect(errors).toHaveLength(0);
    expect(po!.poNumber).toMatch(new RegExp(`^PO-20261029-\\d{3}-${rfq.rfqNumber}$`));
    expect(po!.supplier).toBe("CementDirect NG");
    expect(po!.status).toBe("purchase_ordered");
    expect(po!.total).toBe(760000);
    expect(po!.lines).toHaveLength(2);
  });

  it("caps PO quantity at the supplier's stated availability and flags it", () => {
    const partialAvailability: ValidatedQuote = {
      ...winning,
      lines: [
        { rfqLineId: "L1", unitPrice: 13000, availableQuantity: null },
        { rfqLineId: "L2", unitPrice: 5000, availableQuantity: 60 },
      ],
      total: 560000,
    };
    const { po, errors } = generatePurchaseOrderFromQuote(rfq, partialAvailability);
    expect(errors).toHaveLength(0);
    const cement = po!.lines.find((l) => l.rfqLineId === "L2")!;
    expect(cement.quantity).toBe(60);
    expect(cement.lineTotal).toBe(300000);
    expect(po!.warnings.join(" ")).toContain("shortfall is flagged");
    // 20×13000 + 60×5000 = 560,000
    expect(po!.total).toBe(560000);
  });

  it("refuses a partial-coverage quote for award", () => {
    const partial: ValidatedQuote = {
      ok: true,
      supplier: "ProBuild Depot",
      lines: [{ rfqLineId: "L1", unitPrice: 11000, availableQuantity: null }],
      total: 220000,
      coverage: 0.5,
      missingLineIds: ["L2"],
      warnings: [],
      errors: [],
    };
    const { po, errors } = generatePurchaseOrderFromQuote(rfq, partial);
    expect(po).toBeNull();
    expect(errors.join(" ")).toContain("partial quote cannot be awarded");
  });

  it("refuses a quote that failed validation", () => {
    const { po } = generatePurchaseOrderFromQuote(rfq, {
      ...winning,
      ok: false,
      errors: ["bad"],
    });
    expect(po).toBeNull();
  });
});

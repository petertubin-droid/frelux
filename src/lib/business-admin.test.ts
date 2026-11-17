import { describe, expect, it } from "vitest";
import {
  ageReceivables,
  mergeAgeing,
  rollupPortfolio,
  type PortfolioProject,
} from "@/lib/business-admin";
import type { InvoiceBalance, LedgerSummary } from "@/lib/project-ledger";

const AS_OF = "2026-11-17";

function balance(over: Partial<InvoiceBalance>): InvoiceBalance {
  return {
    id: "inv",
    number: "INV-0001",
    total: 0,
    paid: 0,
    balance: 0,
    status: "unpaid",
    dueAt: null,
    daysOverdue: 0,
    ...over,
  };
}

describe("ageReceivables", () => {
  /**
   * Three invoices, worked by hand against 17 November 2026:
   *   I1 due 30 Sep, balance 60,000, 48 days late  -> 31 to 60
   *   I2 due 19 Nov, balance 50,000, not yet due   -> current
   *   I3 due 31 Aug, balance 30,000, 78 days late  -> 61 to 90
   */
  const balances = [
    balance({ id: "i1", balance: 60000, dueAt: "2026-09-30" }),
    balance({ id: "i2", balance: 50000, dueAt: "2026-11-19" }),
    balance({ id: "i3", balance: 30000, dueAt: "2026-08-31" }),
  ];

  it("places each balance in the bucket its due date earns", () => {
    const aged = ageReceivables(balances, AS_OF);
    expect(aged.current).toBe(50000);
    expect(aged.days1To30).toBe(0);
    expect(aged.days31To60).toBe(60000);
    expect(aged.days61To90).toBe(30000);
    expect(aged.over90).toBe(0);
    expect(aged.undated).toBe(0);
    expect(aged.total).toBe(140000);
    expect(aged.invoiceCount).toBe(3);
  });

  it("sums to the outstanding balance with no cent lost", () => {
    const aged = ageReceivables(balances, AS_OF);
    const parts =
      aged.current +
      aged.days1To30 +
      aged.days31To60 +
      aged.days61To90 +
      aged.over90 +
      aged.undated;
    expect(parts).toBe(aged.total);
    expect(aged.total).toBe(60000 + 50000 + 30000);
  });

  it("weights days overdue by money, not by invoice count", () => {
    // (60,000 x 48 + 30,000 x 78) / 90,000 = 58.0 days.
    const aged = ageReceivables(balances, AS_OF);
    expect(aged.overdueBalance).toBe(90000);
    expect(aged.averageDaysOverdue).toBe(58);
  });

  it("reports a missing due date as undated instead of current", () => {
    const aged = ageReceivables(
      [balance({ id: "i4", balance: 12500, dueAt: null })],
      AS_OF,
    );
    expect(aged.undated).toBe(12500);
    expect(aged.current).toBe(0);
    expect(aged.total).toBe(12500);
  });

  it("treats an invoice due today as current and yesterday as late", () => {
    const aged = ageReceivables(
      [
        balance({ id: "a", balance: 1000, dueAt: AS_OF }),
        balance({ id: "b", balance: 2000, dueAt: "2026-11-16" }),
      ],
      AS_OF,
    );
    expect(aged.current).toBe(1000);
    expect(aged.days1To30).toBe(2000);
  });

  it("puts a balance 91 days late in the oldest bucket", () => {
    const aged = ageReceivables(
      [balance({ id: "c", balance: 4000, dueAt: "2026-08-18" })],
      AS_OF,
    );
    expect(aged.over90).toBe(4000);
  });

  it("ignores a settled or negative balance", () => {
    const aged = ageReceivables(
      [
        balance({ id: "z", balance: 0, dueAt: "2026-01-01" }),
        balance({ id: "y", balance: -50, dueAt: "2026-01-01" }),
      ],
      AS_OF,
    );
    expect(aged.total).toBe(0);
    expect(aged.invoiceCount).toBe(0);
    expect(aged.averageDaysOverdue).toBeNull();
  });
});

describe("mergeAgeing", () => {
  it("keeps the weighted mean exact instead of averaging averages", () => {
    const big = ageReceivables(
      [balance({ id: "big", balance: 90000, dueAt: "2026-09-30" })],
      AS_OF,
    );
    const small = ageReceivables(
      [balance({ id: "small", balance: 10000, dueAt: "2026-06-01" })],
      AS_OF,
    );
    const merged = mergeAgeing([big, small]);
    // (90,000 x 48 + 10,000 x 169) / 100,000 = 60.1 days, not the 108.5 an
    // average of the two means would produce.
    expect(merged.averageDaysOverdue).toBe(60.1);
    expect(merged.total).toBe(100000);
    expect(merged.days31To60).toBe(90000);
    expect(merged.over90).toBe(10000);
  });
});

function summary(over: Partial<LedgerSummary>): LedgerSummary {
  return {
    currency: "NGN",
    invoicedTotal: 0,
    paidTotal: 0,
    outstandingTotal: 0,
    overdueTotal: 0,
    credit: 0,
    invoices: [],
    expenseTotal: 0,
    expensesWithReceipts: 0,
    expensesMissingReceipt: 0,
    projectedMargin: 0,
    cashPosition: 0,
    collectionRate: null,
    currencyMismatch: null,
    ...over,
  };
}

function project(over: Partial<PortfolioProject>): PortfolioProject {
  return {
    projectId: "p",
    projectName: "Project",
    clientName: null,
    currency: "NGN",
    summary: summary({}),
    ageing: ageReceivables([], AS_OF),
    ...over,
  };
}

describe("rollupPortfolio", () => {
  const rows: PortfolioProject[] = [
    project({
      projectId: "p1",
      projectName: "Lekki duplex",
      clientName: "Adaeze",
      summary: summary({
        invoicedTotal: 1000000,
        paidTotal: 400000,
        outstandingTotal: 600000,
        overdueTotal: 600000,
        expenseTotal: 350000,
        projectedMargin: 650000,
        cashPosition: 50000,
      }),
      ageing: ageReceivables(
        [balance({ balance: 600000, dueAt: "2026-10-31" })],
        AS_OF,
      ),
    }),
    project({
      projectId: "p2",
      projectName: "Ikeja shop fit-out",
      summary: summary({
        invoicedTotal: 200000,
        paidTotal: 200000,
        outstandingTotal: 0,
        overdueTotal: 0,
        expenseTotal: 220000,
        projectedMargin: -20000,
        cashPosition: -20000,
      }),
    }),
  ];

  it("adds billed, settled, outstanding and margin for one currency", () => {
    const rollup = rollupPortfolio(rows);
    expect(rollup.currencies).toHaveLength(1);
    const ngn = rollup.currencies[0];
    expect(ngn.currency).toBe("NGN");
    expect(ngn.invoiced).toBe(1200000);
    expect(ngn.settled).toBe(600000);
    expect(ngn.outstanding).toBe(600000);
    expect(ngn.overdue).toBe(600000);
    expect(ngn.margin).toBe(630000);
    expect(ngn.cash).toBe(30000);
    expect(ngn.collectionRate).toBe(50);
    expect(ngn.projectCount).toBe(2);
    // Due 31 October, read on 17 November: 17 days late, so first bucket.
    expect(ngn.ageing.days1To30).toBe(600000);
    expect(ngn.ageing.days31To60).toBe(0);
  });

  it("never adds two currencies together", () => {
    const mixed = rollupPortfolio([
      ...rows,
      project({
        projectId: "p3",
        projectName: "Dubai villa",
        currency: "AED",
        summary: summary({
          currency: "AED",
          invoicedTotal: 50000,
          paidTotal: 0,
          outstandingTotal: 50000,
          overdueTotal: 0,
        }),
      }),
    ]);
    expect(mixed.mixedCurrency).toBe(true);
    expect(mixed.currencies).toHaveLength(2);
    const byCode = Object.fromEntries(
      mixed.currencies.map((row) => [row.currency, row]),
    );
    expect(byCode.NGN.invoiced).toBe(1200000);
    expect(byCode.AED.invoiced).toBe(50000);
    expect(byCode.AED.label).toBe("AED");
  });

  it("keeps projects with no currency in their own group", () => {
    const rollup = rollupPortfolio([
      project({
        projectId: "p4",
        projectName: "Unpriced job",
        currency: null,
        summary: summary({ currency: null, invoicedTotal: 10000 }),
      }),
    ]);
    expect(rollup.currencies[0].currency).toBe("");
    expect(rollup.currencies[0].label).toBe("Currency not set");
  });

  it("orders the currency groups and the projects by money outstanding", () => {
    const rollup = rollupPortfolio([
      ...rows,
      project({
        projectId: "p5",
        projectName: "Ajah terrace",
        currency: "NGN",
        summary: summary({ invoicedTotal: 900000, outstandingTotal: 900000 }),
      }),
    ]);
    expect(rollup.projects[0].projectName).toBe("Ajah terrace");
    expect(rollup.projects[1].projectName).toBe("Lekki duplex");
    expect(rollup.projects[2].projectName).toBe("Ikeja shop fit-out");
  });

  it("returns a null collection rate when nothing is billed", () => {
    const rollup = rollupPortfolio([project({ summary: summary({}) })]);
    expect(rollup.currencies[0].collectionRate).toBeNull();
    expect(rollup.currencies[0].ageing.averageDaysOverdue).toBeNull();
  });
});

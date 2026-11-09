import { describe, expect, it } from "vitest";
import {
  allocatePayments,
  daysBetween,
  summariseLedger,
} from "@/lib/project-ledger";

const invoice = (
  over: Partial<Parameters<typeof allocatePayments>[0][number]> = {},
) => ({
  id: "inv-1",
  number: "INV-0001",
  issued_at: "2026-11-01",
  due_at: "2026-11-30",
  currency: "NGN",
  total: 1000,
  status: "sent",
  ...over,
});

const payment = (
  over: Partial<Parameters<typeof allocatePayments>[1][number]> = {},
) => ({
  id: "pay-1",
  invoice_id: null,
  amount: 400,
  currency: "NGN",
  paid_at: "2026-11-05",
  ...over,
});

describe("project ledger allocation", () => {
  it("shows an invoice as unpaid before any money arrives", () => {
    const [row] = allocatePayments([invoice()], [], "2026-11-10");
    expect(row.status).toBe("unpaid");
    expect(row.balance).toBe(1000);
  });

  it("recognises a part payment against the named invoice", () => {
    const [row] = allocatePayments(
      [invoice()],
      [payment({ invoice_id: "inv-1", amount: 400 })],
      "2026-11-10",
    );
    expect(row.status).toBe("part_paid");
    expect(row.paid).toBe(400);
    expect(row.balance).toBe(600);
  });

  it("closes the invoice once the balance reaches zero", () => {
    const [row] = allocatePayments(
      [invoice()],
      [
        payment({ id: "p1", invoice_id: "inv-1", amount: 400 }),
        payment({ id: "p2", invoice_id: "inv-1", amount: 600 }),
      ],
      "2026-11-10",
    );
    expect(row.status).toBe("paid");
    expect(row.balance).toBe(0);
  });

  it("allocates a payment with no invoice reference to the oldest bill", () => {
    const rows = allocatePayments(
      [
        invoice({
          id: "new",
          number: "INV-0002",
          issued_at: "2026-11-08",
          total: 500,
        }),
        invoice({
          id: "old",
          number: "INV-0001",
          issued_at: "2026-11-01",
          total: 300,
        }),
      ],
      [payment({ amount: 400 })],
      "2026-11-10",
    );
    const old = rows.find((row) => row.id === "old")!;
    const fresh = rows.find((row) => row.id === "new")!;
    expect(old.status).toBe("paid");
    expect(old.paid).toBe(300);
    expect(fresh.status).toBe("part_paid");
    expect(fresh.paid).toBe(100);
  });

  it("spills a single payment across several invoices, oldest first", () => {
    const rows = allocatePayments(
      [
        invoice({
          id: "a",
          number: "INV-0001",
          issued_at: "2026-11-01",
          total: 300,
        }),
        invoice({
          id: "b",
          number: "INV-0002",
          issued_at: "2026-11-02",
          total: 300,
        }),
      ],
      [payment({ amount: 500 })],
      "2026-11-10",
    );
    expect(rows[0].paid).toBe(300);
    expect(rows[1].paid).toBe(200);
    expect(rows[1].balance).toBe(100);
  });

  it("keeps an overpayment as credit rather than a negative balance", () => {
    const summary = summariseLedger({
      invoices: [invoice()],
      payments: [payment({ invoice_id: "inv-1", amount: 1200 })],
      expenses: [],
      currency: "NGN",
      today: "2026-11-10",
    });
    expect(summary.outstandingTotal).toBe(0);
    expect(summary.credit).toBe(200);
    expect(summary.invoices[0].status).toBe("paid");
  });

  it("marks a passed due date as overdue and counts the days", () => {
    const summary = summariseLedger({
      invoices: [invoice({ due_at: "2026-11-05" })],
      payments: [],
      expenses: [],
      currency: "NGN",
      today: "2026-11-12",
    });
    expect(summary.invoices[0].status).toBe("overdue");
    expect(summary.invoices[0].daysOverdue).toBe(7);
    expect(summary.overdueTotal).toBe(1000);
  });

  it("holds money paid against a draft on account instead of re-pointing it", () => {
    const draft = invoice({
      id: "inv-draft",
      number: "INV-0009",
      status: "draft",
      total: 500000,
    });
    const live = invoice({ id: "inv-live", total: 80000 });
    const summary = summariseLedger({
      invoices: [live, draft],
      payments: [payment({ invoice_id: "inv-draft", amount: 50000 })],
      expenses: [],
      currency: "NGN",
      today: "2026-11-09",
    });

    expect(summary.paidTotal).toBe(50000);
    expect(summary.invoices[0].paid).toBe(0);
    expect(summary.invoices[0].balance).toBe(80000);
    expect(summary.credit).toBe(50000);
    expect(
      summary.invoices.find((row) => row.id === "inv-draft"),
    ).toBeUndefined();
  });

  it("holds money paid against a void invoice on account too", () => {
    const voided = invoice({
      id: "inv-void",
      number: "INV-0010",
      status: "void",
      total: 300000,
    });
    const live = invoice({ id: "inv-live", total: 90000 });
    const summary = summariseLedger({
      invoices: [live, voided],
      payments: [payment({ invoice_id: "inv-void", amount: 90000 })],
      expenses: [],
      currency: "NGN",
      today: "2026-11-09",
    });

    expect(summary.invoices[0].balance).toBe(90000);
    expect(summary.credit).toBe(90000);
  });

  it("never bills a draft or a void invoice", () => {
    const summary = summariseLedger({
      invoices: [
        invoice({ id: "d", number: "INV-0001", status: "draft" }),
        invoice({ id: "v", number: "INV-0002", status: "void" }),
        invoice({ id: "s", number: "INV-0003", status: "sent", total: 250 }),
      ],
      payments: [],
      expenses: [],
      currency: "NGN",
      today: "2026-11-10",
    });
    expect(summary.invoicedTotal).toBe(250);
    expect(summary.invoices).toHaveLength(1);
  });

  it("ignores a foreign currency row instead of adding it to the total", () => {
    const summary = summariseLedger({
      invoices: [
        invoice(),
        invoice({ id: "usd", number: "INV-0009", currency: "USD", total: 900 }),
      ],
      payments: [],
      expenses: [],
      currency: "NGN",
      today: "2026-11-10",
    });
    expect(summary.invoicedTotal).toBe(1000);
    expect(summary.currencyMismatch).toEqual({
      currencies: ["NGN", "USD"],
      ignoredRows: 1,
    });
  });

  it("reports spend, receipts and margin from the expense rows", () => {
    const summary = summariseLedger({
      invoices: [invoice()],
      payments: [payment({ invoice_id: "inv-1", amount: 1000 })],
      expenses: [
        {
          amount: 300,
          currency: "NGN",
          receipt_url: "https://cdn/receipt.png",
        },
        { amount: 200, currency: "NGN", receipt_url: null },
      ],
      currency: "NGN",
      today: "2026-11-10",
    });
    expect(summary.expenseTotal).toBe(500);
    expect(summary.expensesWithReceipts).toBe(1);
    expect(summary.expensesMissingReceipt).toBe(1);
    expect(summary.projectedMargin).toBe(500);
    expect(summary.cashPosition).toBe(500);
    expect(summary.collectionRate).toBe(100);
  });

  it("returns a null collection rate before the first invoice", () => {
    const summary = summariseLedger({
      invoices: [],
      payments: [],
      expenses: [{ amount: 120, currency: "NGN" }],
      currency: "NGN",
      today: "2026-11-10",
    });
    expect(summary.collectionRate).toBeNull();
    expect(summary.cashPosition).toBe(-120);
    expect(summary.outstandingTotal).toBe(0);
  });
});

describe("daysBetween", () => {
  it("counts calendar days and ignores the time of day", () => {
    expect(daysBetween("2026-11-05", "2026-11-12")).toBe(7);
    expect(daysBetween("2026-11-05T23:30:00Z", "2026-11-06T00:15:00Z")).toBe(1);
    expect(daysBetween("2026-11-12", "2026-11-05")).toBe(-7);
  });
});

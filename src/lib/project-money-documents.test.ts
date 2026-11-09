import { describe, expect, it } from "vitest";
import {
  buildReceiptHtml,
  buildRecordsPackHtml,
  buildStatementText,
  ledgerCsvRows,
} from "@/lib/project-money-documents";
import { summariseLedger } from "@/lib/project-ledger";

const summary = summarize();

function summarize() {
  return summariseLedger({
    invoices: [
      {
        id: "inv-1",
        number: "INV-0001",
        issued_at: "2026-11-01",
        due_at: "2026-11-05",
        currency: "NGN",
        total: 500000,
        status: "sent",
      },
    ],
    payments: [
      {
        id: "pay-1",
        invoice_id: "inv-1",
        amount: 200000,
        currency: "NGN",
        paid_at: "2026-11-04",
      },
    ],
    expenses: [
      { amount: 120000, currency: "NGN", receipt_url: "https://cdn/r.png" },
    ],
    currency: "NGN",
    today: "2026-11-10",
  });
}

describe("receipt document", () => {
  const receipt = buildReceiptHtml({
    projectName: "Lekki duplex",
    clientName: "Ada Obi",
    receiptNo: "RCP-0001",
    amount: 200000,
    currency: "NGN",
    method: "transfer",
    reference: "GTB-4471",
    paidAt: "2026-11-04",
    invoiceNumber: "INV-0001",
    balanceAfter: 300000,
  });

  it("states the amount, the receipt number and what is still owed", () => {
    expect(receipt).toContain("RCP-0001");
    expect(receipt).toContain("NGN 200,000.00");
    expect(receipt).toContain("NGN 300,000.00");
    expect(receipt).toContain("GTB-4471");
  });

  it("escapes a client name so a record cannot inject markup", () => {
    const hostile = buildReceiptHtml({
      projectName: "Site",
      clientName: "<script>alert(1)</script>",
      receiptNo: "RCP-0002",
      amount: 1,
      currency: "NGN",
      method: "cash",
      paidAt: "2026-11-04",
    });
    expect(hostile).not.toContain("<script>alert(1)</script>");
    expect(hostile).toContain("&lt;script&gt;");
  });

  it("marks the receipt for printing at A5 width", () => {
    expect(receipt).toContain("max-width:420px");
  });
});

describe("records pack", () => {
  const pack = buildRecordsPackHtml({
    projectName: "Lekki duplex",
    clientName: "Ada Obi",
    currency: "NGN",
    summary,
    invoices: [
      {
        number: "INV-0001",
        issued_at: "2026-11-01",
        due_at: "2026-11-05",
        total: 500000,
        status: "sent",
      },
    ],
    payments: [
      {
        receipt_no: "RCP-0001",
        paid_at: "2026-11-04",
        amount: 200000,
        method: "transfer",
        reference: "GTB-4471",
      },
    ],
    expenses: [
      {
        spent_at: "2026-11-03",
        category: "material",
        name: "Cement, 20 bags",
        amount: 120000,
        receipt_name: "pos-slip.jpg",
      },
    ],
  });

  it("carries the ledger totals and the profit lines", () => {
    expect(pack).toContain("NGN 500,000.00");
    expect(pack).toContain("NGN 200,000.00");
    expect(pack).toContain("NGN 300,000.00");
    expect(pack).toContain("Billed less spend");
    expect(pack).toContain("Every expense has proof attached");
  });

  it("names the proof file so a reader can find the receipt", () => {
    expect(pack).toContain("pos-slip.jpg");
    expect(pack).toContain("RCP-0001");
    expect(pack).toContain("INV-0001");
  });

  it("says plainly when a section is empty rather than printing a blank table", () => {
    const bare = buildRecordsPackHtml({
      projectName: "New job",
      currency: "NGN",
      summary: summariseLedger({
        invoices: [],
        payments: [],
        expenses: [],
        currency: "NGN",
        today: "2026-11-10",
      }),
      invoices: [],
      payments: [],
      expenses: [],
    });
    expect(bare).toContain("No invoices recorded.");
    expect(bare).toContain("No payments recorded.");
    expect(bare).toContain("No expenses recorded.");
  });
});

describe("ledger spreadsheet export", () => {
  const rows = ledgerCsvRows({
    currency: "NGN",
    invoices: [{ number: "INV-0001", issued_at: "2026-11-01", total: 500000 }],
    payments: [
      {
        receipt_no: "RCP-0001",
        paid_at: "2026-11-04",
        amount: 200000,
        method: "transfer",
      },
    ],
    expenses: [
      {
        spent_at: "2026-11-03",
        category: "material",
        name: "Cement",
        amount: 120000,
      },
    ],
  });

  it("emits one row per money event in date order", () => {
    expect(rows.map((row) => row.type)).toEqual([
      "Invoice",
      "Expense",
      "Payment",
    ]);
    expect(rows.map((row) => row.date)).toEqual([
      "2026-11-01",
      "2026-11-03",
      "2026-11-04",
    ]);
  });

  it("keeps billed, received and spent in separate columns", () => {
    const invoice = rows.find((row) => row.type === "Invoice")!;
    const payment = rows.find((row) => row.type === "Payment")!;
    const expense = rows.find((row) => row.type === "Expense")!;
    expect(invoice.debit).toBe(500000);
    expect(payment.credit).toBe(200000);
    expect(expense.spend).toBe(120000);
  });
});

describe("statement text", () => {
  it("reads as a sentence a client can check", () => {
    const text = buildStatementText({
      projectName: "Lekki duplex",
      summary,
      nextDueAt: "2026-11-05",
    });
    expect(text).toContain("Lekki duplex: account statement");
    expect(text).toContain("Outstanding: NGN 300,000.00");
    expect(text).toContain("Of which overdue: NGN 300,000.00");
    expect(text).toContain("Next due: 05 Nov 2026");
  });

  it("omits overdue and credit lines when there are none", () => {
    const cleared = summariseLedger({
      invoices: [
        {
          id: "a",
          number: "INV-0001",
          issued_at: "2026-11-01",
          due_at: "2026-11-20",
          currency: "NGN",
          total: 100,
          status: "sent",
        },
      ],
      payments: [
        {
          id: "p",
          invoice_id: "a",
          amount: 150,
          currency: "NGN",
          paid_at: "2026-11-02",
        },
      ],
      expenses: [],
      currency: "NGN",
      today: "2026-11-10",
    });
    const text = buildStatementText({
      projectName: "Shop fit-out",
      summary: cleared,
    });
    expect(text).toContain("Credit on account: NGN 50.00");
    expect(text).not.toContain("overdue");
  });
});

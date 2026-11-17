import { describe, expect, it } from "vitest";
import {
  buildClientStatement,
  clientsFromProjects,
  type StatementInvoiceRow,
  type StatementPaymentRow,
} from "@/lib/client-statement";

const projects = [
  { id: "p1", name: "Lekki duplex" },
  { id: "p2", name: "Ikeja shop" },
];

function invoice(over: Partial<StatementInvoiceRow>): StatementInvoiceRow {
  return {
    id: "i",
    number: "INV-0001",
    project_id: "p1",
    issued_at: "2026-10-05",
    currency: "NGN",
    total: 0,
    status: "sent",
    ...over,
  };
}

function payment(over: Partial<StatementPaymentRow>): StatementPaymentRow {
  return {
    id: "pay",
    project_id: "p1",
    invoice_id: null,
    amount: 0,
    currency: "NGN",
    paid_at: "2026-10-10",
    ...over,
  };
}

describe("buildClientStatement", () => {
  /**
   * Worked by hand:
   *   05 Oct invoice INV-0001  100,000 -> 100,000
   *   10 Oct payment            40,000 ->  60,000
   *   20 Oct invoice INV-0002   50,000 -> 110,000
   *   02 Nov payment            25,000 ->  85,000
   */
  const statement = buildClientStatement({
    clientName: "Adaeze",
    currency: "ngn",
    projects,
    invoices: [
      invoice({ id: "a1", number: "INV-0001", total: 100000 }),
      invoice({
        id: "a2",
        number: "INV-0002",
        project_id: "p2",
        issued_at: "2026-10-20",
        total: 50000,
      }),
    ],
    payments: [
      payment({ id: "p1", amount: 40000 }),
      payment({
        id: "p2",
        project_id: "p2",
        invoice_id: "a2",
        amount: 25000,
        paid_at: "2026-11-02",
      }),
    ],
  });

  it("walks the balance line by line", () => {
    expect(statement.lines.map((line) => line.balance)).toEqual([
      100000, 60000, 110000, 85000,
    ]);
    expect(statement.closingBalance).toBe(85000);
    expect(statement.invoiced).toBe(150000);
    expect(statement.paid).toBe(65000);
  });

  it("orders by date with an invoice ahead of a same-day payment", () => {
    const sameDay = buildClientStatement({
      clientName: "Adaeze",
      currency: "NGN",
      projects,
      invoices: [invoice({ id: "b1", total: 10000, issued_at: "2026-10-05" })],
      payments: [payment({ id: "b2", amount: 10000, paid_at: "2026-10-05" })],
    });
    expect(sameDay.lines.map((line) => line.kind)).toEqual([
      "invoice",
      "payment",
    ]);
    expect(sameDay.lines[1].balance).toBe(0);
  });

  it("names the project each line belongs to", () => {
    expect(statement.lines[2].projectName).toBe("Ikeja shop");
    expect(statement.lines[1].reference).toBe("Payment on account");
  });

  it("leaves drafts and voids out of the bill entirely", () => {
    const withDrafts = buildClientStatement({
      clientName: "Adaeze",
      currency: "NGN",
      projects,
      invoices: [
        invoice({ id: "c1", total: 100000 }),
        invoice({
          id: "c2",
          number: "INV-0009",
          total: 30000,
          status: "draft",
        }),
        invoice({ id: "c3", number: "INV-0010", total: 70000, status: "void" }),
      ],
      payments: [],
    });
    expect(withDrafts.invoiced).toBe(100000);
    expect(withDrafts.lines).toHaveLength(1);
  });

  it("credits money paid against a draft and reports it as held on account", () => {
    const held = buildClientStatement({
      clientName: "Adaeze",
      currency: "NGN",
      projects,
      invoices: [
        invoice({ id: "d1", total: 100000 }),
        invoice({
          id: "d2",
          number: "INV-0009",
          total: 30000,
          status: "draft",
        }),
      ],
      payments: [
        payment({ id: "d3", amount: 100000, invoice_id: "d1" }),
        payment({ id: "d4", amount: 10000, invoice_id: "d2" }),
      ],
    });
    expect(held.paid).toBe(110000);
    expect(held.heldOnAccount).toBe(10000);
    // The client has overpaid: a credit, not a clamped zero.
    expect(held.closingBalance).toBe(-10000);
  });

  it("never adds a row in another currency", () => {
    const mixed = buildClientStatement({
      clientName: "Adaeze",
      currency: "NGN",
      projects,
      invoices: [
        invoice({ id: "e1", total: 100000 }),
        invoice({ id: "e2", number: "INV-AED", total: 5000, currency: "AED" }),
      ],
      payments: [payment({ id: "e3", amount: 2000, currency: "AED" })],
    });
    expect(mixed.invoiced).toBe(100000);
    expect(mixed.paid).toBe(0);
    expect(mixed.ignoredRows).toBe(2);
  });

  it("returns an empty statement rather than a broken one", () => {
    const empty = buildClientStatement({
      clientName: "Nobody",
      currency: "NGN",
      projects,
      invoices: [],
      payments: [],
    });
    expect(empty.lines).toEqual([]);
    expect(empty.closingBalance).toBe(0);
  });
});

describe("clientsFromProjects", () => {
  it("collects each named client once with the currencies they are billed in", () => {
    const clients = clientsFromProjects([
      { client_name: " Adaeze ", currency: "NGN" },
      { client_name: "Adaeze", currency: "AED" },
      { client_name: "Rashid", currency: null },
      { client_name: null, currency: "NGN" },
      { client_name: "   ", currency: "NGN" },
    ]);
    expect(clients).toEqual([
      { name: "Adaeze", currencies: ["AED", "NGN"] },
      { name: "Rashid", currencies: [""] },
    ]);
  });
});

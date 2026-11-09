import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MoneyTab } from "@/components/contractor/MoneyTab";
import type {
  DbProjectExpense,
  DbProjectInvoice,
  DbProjectPayment,
} from "@/types/database";

const invoices: DbProjectInvoice[] = [];
const payments: DbProjectPayment[] = [];

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: "en",
    setLanguage: vi.fn(),
  }),
}));

const createProjectInvoice = vi.fn(
  async (
    _projectId: string,
    _currency: string,
    _input: Record<string, unknown>,
  ) => ({}),
);
const createProjectPayment = vi.fn(
  async (
    _projectId: string,
    _currency: string,
    _input: Record<string, unknown>,
  ) => ({}),
);

vi.mock("@/lib/contractor", () => ({
  fetchProjectInvoices: vi.fn(async () => invoices),
  fetchProjectPayments: vi.fn(async () => payments),
  createProjectInvoice: (
    projectId: string,
    currency: string,
    input: Record<string, unknown>,
  ) => createProjectInvoice(projectId, currency, input),
  createProjectPayment: (
    projectId: string,
    currency: string,
    input: Record<string, unknown>,
  ) => createProjectPayment(projectId, currency, input),
  updateProjectInvoice: vi.fn(async () => undefined),
  deleteProjectInvoice: vi.fn(async () => undefined),
  deleteProjectPayment: vi.fn(async () => undefined),
}));

const expense = (over: Partial<DbProjectExpense> = {}): DbProjectExpense => ({
  id: "exp-1",
  project_id: "proj-1",
  category: "material",
  name: "Cement",
  amount: 120000,
  currency: "NGN",
  spent_at: "2026-11-03",
  shopping_item_id: null,
  room_id: null,
  notes: null,
  receipt_url: null,
  receipt_name: null,
  sort_order: 0,
  created_at: "2026-11-03T00:00:00Z",
  updated_at: "2026-11-03T00:00:00Z",
  ...over,
});

const invoice = (over: Partial<DbProjectInvoice> = {}): DbProjectInvoice => ({
  id: "inv-1",
  project_id: "proj-1",
  number: "INV-0001",
  title: "Stage 1",
  issued_at: "2026-11-01",
  due_at: "2026-11-05",
  currency: "NGN",
  subtotal: 500000,
  tax_rate: 0,
  tax_amount: 0,
  total: 500000,
  status: "sent",
  notes: null,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
  ...over,
});

const payment = (over: Partial<DbProjectPayment> = {}): DbProjectPayment => ({
  id: "pay-1",
  project_id: "proj-1",
  invoice_id: "inv-1",
  receipt_no: "RCP-0001",
  amount: 200000,
  currency: "NGN",
  method: "transfer",
  reference: "GTB-4471",
  paid_at: "2026-11-04",
  notes: null,
  created_at: "2026-11-04T00:00:00Z",
  updated_at: "2026-11-04T00:00:00Z",
  ...over,
});

const renderTab = (expenses: DbProjectExpense[] = []) =>
  render(
    <MoneyTab
      projectId="proj-1"
      projectName="Lekki duplex"
      clientName="Ada Obi"
      currency="NGN"
      expenses={expenses}
    />,
  );

const reset = () => {
  invoices.length = 0;
  payments.length = 0;
  vi.clearAllMocks();
};

describe("MoneyTab", () => {
  beforeEach(() => {
    reset();
  });

  it("shows billed, received and outstanding from the records", async () => {
    invoices.push(invoice());
    payments.push(payment());
    renderTab([expense()]);

    expect(await screen.findByText("INV-0001")).toBeTruthy();
    const paymentRow = screen.getByText(/RCP-0001/);
    expect(paymentRow.textContent).toContain("200,000");
    // Billed 500,000 with 200,000 received leaves 300,000 open.
    expect(screen.getAllByText(/300,000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/500,000/).length).toBeGreaterThan(0);
  });

  it("marks an invoice past its due date as overdue", async () => {
    invoices.push(
      invoice({ id: "late", number: "INV-0001", due_at: "2020-01-31" }),
      invoice({ id: "open", number: "INV-0002", due_at: "2099-01-31" }),
    );
    renderTab();

    expect(await screen.findByText("Overdue")).toBeTruthy();
    expect(screen.getByText("Unpaid")).toBeTruthy();
  });

  it("records a part payment against the named invoice", async () => {
    invoices.push(invoice());
    renderTab();

    await screen.findByText("INV-0001");
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    fireEvent.change(screen.getByLabelText("Amount received"), {
      target: { value: "150000" },
    });
    fireEvent.change(screen.getByLabelText("Against invoice"), {
      target: { value: "inv-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));

    await waitFor(() => expect(createProjectPayment).toHaveBeenCalledTimes(1));
    expect(createProjectPayment).toHaveBeenCalledWith(
      "proj-1",
      "NGN",
      expect.objectContaining({
        invoice_id: "inv-1",
        amount: 150000,
        method: "transfer",
      }),
    );
  });

  it("refuses a payment of zero before touching the database", async () => {
    invoices.push(invoice());
    renderTab();

    await screen.findByText("INV-0001");
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(createProjectPayment).not.toHaveBeenCalled();
  });

  it("adds tax to an invoice and sends the same total the screen showed", async () => {
    renderTab();
    fireEvent.click(
      await screen.findByRole("button", { name: /Raise invoice/ }),
    );

    fireEvent.change(screen.getByLabelText("Amount before tax"), {
      target: { value: "1000000" },
    });
    fireEvent.change(screen.getByLabelText("Tax rate (%)"), {
      target: { value: "7.5" },
    });

    expect(screen.getByText(/1,075,000/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save invoice" }));

    await waitFor(() => expect(createProjectInvoice).toHaveBeenCalledTimes(1));
    expect(createProjectInvoice).toHaveBeenCalledWith(
      "proj-1",
      "NGN",
      expect.objectContaining({
        subtotal: 1000000,
        tax_rate: 7.5,
        tax_amount: 75000,
        total: 1075000,
        status: "sent",
      }),
    );
  });

  it("keeps a draft invoice out of the billed total", async () => {
    invoices.push(invoice({ status: "draft" }));
    renderTab();

    expect(await screen.findByText(/No invoice raised yet/)).toBeTruthy();
  });

  it("copies a statement that matches the ledger", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    invoices.push(invoice());
    payments.push(payment());
    renderTab();

    await screen.findByText("INV-0001");
    fireEvent.click(screen.getByRole("button", { name: /Copy statement/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = (writeText.mock.calls as unknown as [string][])[0][0];
    expect(text).toContain("Lekki duplex: account statement");
    expect(text).toContain("Outstanding:");
    vi.unstubAllGlobals();
  });

  it("opens a printable receipt for a recorded payment", async () => {
    const write = vi.fn();
    const open = vi.spyOn(window, "open").mockImplementation(
      () =>
        ({
          document: { write, close: vi.fn(), title: "" },
          focus: vi.fn(),
          print: vi.fn(),
        }) as unknown as Window,
    );

    invoices.push(invoice());
    payments.push(payment());
    renderTab();

    await screen.findByText(/RCP-0001/);
    fireEvent.click(screen.getByRole("button", { name: /Receipt RCP-0001/ }));

    expect(open).toHaveBeenCalled();
    const written = (write.mock.calls as unknown as [string][])[0][0];
    expect(written).toContain("RCP-0001");
    expect(written).toContain("200,000.00");
    open.mockRestore();
  });
});

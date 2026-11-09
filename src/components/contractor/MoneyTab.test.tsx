import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MoneyTab } from "@/components/contractor/MoneyTab";
import * as contractor from "@/lib/contractor";
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

  it("opens the guided invoice and hands over to the full form on request", async () => {
    renderTab();

    const guided = await screen.findByRole("button", {
      name: /Guided invoice/,
    });
    expect(guided.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(guided);
    expect(guided.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "What is this invoice for?" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Use the full form" }));
    expect(document.getElementById("invoice-form")).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("keeps the document exports behind one labelled menu", async () => {
    invoices.push(invoice());
    renderTab();
    await screen.findByText("INV-0001");

    const more = screen.getByRole("button", { name: "More money actions" });
    expect(more.getAttribute("aria-haspopup")).toBe("menu");
    expect(more.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menuitem", { name: /Records pack/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Export CSV/ })).toBeTruthy();

    fireEvent.keyDown(more, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("lists a saved draft so it is not lost, and sends it on request", async () => {
    invoices.push(
      invoice({
        id: "inv-draft",
        number: "INV-0007",
        title: "Deposit for blockwork",
        status: "draft",
        total: 250000,
      }),
    );
    renderTab();

    const section = await screen.findByRole("heading", {
      name: "Not yet billed",
    });
    expect(section).toBeTruthy();
    expect(screen.getByText(/INV-0007/)).toBeTruthy();
    expect(screen.getByText(/^Draft ·/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Send INV-0007" }));
    await waitFor(() =>
      expect(contractor.updateProjectInvoice).toHaveBeenCalledWith(
        "inv-draft",
        { status: "sent" },
      ),
    );
  });

  it("keeps a draft out of every billed total", async () => {
    invoices.push(
      invoice({ id: "inv-sent", total: 100000 }),
      invoice({
        id: "inv-draft",
        number: "INV-0008",
        status: "draft",
        total: 900000,
      }),
    );
    renderTab();
    await screen.findByText("INV-0001");

    expect(screen.getByText(/Billed/)).toBeTruthy();
    expect(screen.getAllByText(/100,000/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/1,000,000/)).toBeNull();
  });

  it("asks before deleting a payment", async () => {
    invoices.push(invoice());
    payments.push(payment());
    renderTab();
    await screen.findByText(/RCP-0001/);

    fireEvent.click(
      screen.getByRole("button", { name: "Delete payment RCP-0001" }),
    );
    expect(contractor.deleteProjectPayment).not.toHaveBeenCalled();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("every balance changes");
    fireEvent.click(within(alert).getByRole("button", { name: "Yes, delete" }));

    await waitFor(() =>
      expect(contractor.deleteProjectPayment).toHaveBeenCalledWith("pay-1"),
    );
  });

  it("refuses to delete an invoice that still holds a payment", async () => {
    invoices.push(invoice());
    payments.push(payment());
    renderTab();
    await screen.findByText("INV-0001");

    fireEvent.click(screen.getByRole("button", { name: "Delete INV-0001" }));
    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: "Yes, delete" }));

    await waitFor(() =>
      expect(screen.getByText(/has payments attached/)).toBeTruthy(),
    );
    expect(contractor.deleteProjectInvoice).not.toHaveBeenCalled();
  });

  it("returns focus to the menu button when the menu closes", async () => {
    invoices.push(invoice());
    renderTab();
    await screen.findByText("INV-0001");

    const more = screen.getByRole("button", { name: "More money actions" });
    fireEvent.click(more);
    expect(document.activeElement?.textContent).toContain("Records pack");

    fireEvent.keyDown(more, { key: "Escape" });
    expect(document.activeElement).toBe(more);
  });

  it("announces loading instead of hiding it from assistive tech", async () => {
    vi.mocked(contractor.fetchProjectInvoices).mockReturnValueOnce(
      new Promise(() => {}) as never,
    );
    renderTab();

    const status = (await screen.findAllByRole("status")).find((node) =>
      node.textContent?.includes("Loading invoices"),
    );
    expect(status).toBeTruthy();
    expect(status?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("puts the caret in the direct form when it opens", async () => {
    invoices.push(invoice());
    renderTab();
    await screen.findByText("INV-0001");

    fireEvent.click(screen.getByRole("button", { name: /Raise invoice/ }));
    await waitFor(() =>
      expect(document.activeElement?.id).toBe("invoice-title"),
    );
  });

  it("leads an empty ledger to the guided invoice instead of a dead end", async () => {
    invoices.length = 0;
    payments.length = 0;
    renderTab();

    expect(await screen.findByText(/No invoice raised yet/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Raise the first invoice" }),
    );
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("opens only one creation panel at a time", async () => {
    renderTab();

    fireEvent.click(
      await screen.findByRole("button", { name: /Raise invoice/ }),
    );
    expect(document.getElementById("invoice-form")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Guided invoice/ }));
    expect(document.getElementById("invoice-form")).toBeNull();
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("gives the invoice table real headers and a keyboard-scrollable region", async () => {
    invoices.push(invoice());
    renderTab();

    await screen.findByText("INV-0001");
    const region = screen.getByRole("region", { name: "Invoice list" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(document.querySelectorAll('th[scope="col"]').length).toBe(8);
    expect(document.querySelector("caption")).toBeTruthy();
  });

  it("tells a screen reader the totals without relying on layout", async () => {
    invoices.push(invoice());
    payments.push(payment());
    renderTab();

    await screen.findByText("INV-0001");
    const list = document.querySelector("dl[aria-live='polite']");
    expect(list?.querySelectorAll("dt").length).toBe(6);
    expect(list?.querySelectorAll("dd").length).toBe(6);
  });

  it("announces which invoice a status belongs to", async () => {
    invoices.push(invoice({ due_at: "2020-01-31" }));
    renderTab();

    const region = await screen.findByRole("region", { name: "Invoice list" });
    const chip = within(region).getByText("Overdue");
    expect(chip.textContent).toContain("INV-0001");
  });

  it("exposes the open state of both forms", async () => {
    renderTab();
    const raise = await screen.findByRole("button", { name: /Raise invoice/ });
    expect(raise.getAttribute("aria-expanded")).toBe("false");
    expect(raise.getAttribute("aria-controls")).toBe("invoice-form");

    fireEvent.click(raise);
    expect(raise.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("invoice-form")).toBeTruthy();

    const record = screen.getByRole("button", { name: "Record payment" });
    expect(record.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(record);
    expect(record.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("payment-form")).toBeTruthy();
  });

  it("marks the empty amount invalid and moves focus to it", async () => {
    invoices.push(invoice());
    renderTab();

    await screen.findByText("INV-0001");
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));

    const amount = screen.getByLabelText("Amount received") as HTMLInputElement;
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(document.activeElement).toBe(amount);
    expect(amount.getAttribute("aria-invalid")).toBe("true");
    expect(amount.getAttribute("aria-describedby")).toBe("money-tab-error");
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

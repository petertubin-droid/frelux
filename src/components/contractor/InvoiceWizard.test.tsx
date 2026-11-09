import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { InvoiceWizard, addDays } from "@/components/contractor/InvoiceWizard";

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
  ) => ({
    id: "inv-9",
    number: "INV-0009",
    status: "sent",
  }),
);

vi.mock("@/lib/contractor", () => ({
  createProjectInvoice: (
    projectId: string,
    currency: string,
    input: Record<string, unknown>,
  ) => createProjectInvoice(projectId, currency, input),
}));

const money = (value: number) =>
  `NGN ${value.toLocaleString("en", { maximumFractionDigits: 0 })}`;

const setup = (
  overrides: Partial<Parameters<typeof InvoiceWizard>[0]> = {},
) => {
  const onCreated = vi.fn(async () => undefined);
  const onSwitchToForm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <InvoiceWizard
      projectId="proj-1"
      currency="NGN"
      money={money}
      alreadyBilled={250000}
      onCreated={onCreated}
      onSwitchToForm={onSwitchToForm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onCreated, onSwitchToForm, onCancel, ...utils };
};

const next = () =>
  fireEvent.click(screen.getByRole("button", { name: /Next/ }));

describe("InvoiceWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens on the purpose step with a real radio group and a real progress value", () => {
    setup();

    const group = screen.getByRole("group", {
      name: "What is this invoice for?",
    });
    expect(within(group).getAllByRole("radio")).toHaveLength(6);
    expect(
      screen.getByRole("radio", { name: /Stage or milestone/ }),
    ).toBeChecked();

    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-valuenow")).toBe("1");
    expect(progress.getAttribute("aria-valuemax")).toBe("5");
    expect(progress.getAttribute("aria-valuetext")).toContain("Step 1 of 5");
  });

  it("refuses to leave the amount step without an amount and focuses the field", () => {
    setup();
    next();

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));

    const amount = screen.getByLabelText(
      "Amount before tax",
    ) as HTMLInputElement;
    expect(screen.getByRole("alert").textContent).toContain("Enter the amount");
    expect(document.activeElement).toBe(amount);
    expect(amount.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "2",
    );
  });

  it("walks all five steps and raises the invoice with tax and a 30 day due date", async () => {
    const { onCreated } = setup();

    fireEvent.click(screen.getByRole("radio", { name: /Materials supply/ }));
    next();

    fireEvent.change(screen.getByLabelText("Amount before tax"), {
      target: { value: "1000000" },
    });
    next();

    fireEvent.click(screen.getByRole("radio", { name: "VAT at 7.5%" }));
    next();

    fireEvent.change(screen.getByLabelText("Payment date"), {
      target: { value: "30" },
    });
    next();

    // Review shows the tax-inclusive total before anything is written.
    expect(screen.getByText("NGN 1,075,000")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "5",
    );

    fireEvent.click(screen.getByRole("button", { name: /Raise invoice/ }));

    await waitFor(() => expect(createProjectInvoice).toHaveBeenCalledTimes(1));
    const [, currency, input] = createProjectInvoice.mock
      .calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(currency).toBe("NGN");
    expect(input).toMatchObject({
      title: "Materials supply",
      subtotal: 1000000,
      tax_rate: 7.5,
      tax_amount: 75000,
      total: 1075000,
      status: "sent",
    });
    const issued = String(input.issued_at);
    expect(input.due_at).toBe(addDays(issued, 30));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("INV-0009");
  });

  it("saves a draft that stays out of the billed totals", async () => {
    setup();

    next();
    fireEvent.change(screen.getByLabelText("Amount before tax"), {
      target: { value: "50000" },
    });
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: /Save as draft/ }));

    await waitFor(() => expect(createProjectInvoice).toHaveBeenCalledTimes(1));
    const input = (
      createProjectInvoice.mock.calls[0] as unknown as [
        string,
        string,
        Record<string, unknown>,
      ]
    )[2];
    expect(input.status).toBe("draft");
    expect(await screen.findByRole("status")).toBeTruthy();
  });

  it("keeps the amount when a step is revisited", () => {
    setup();
    next();
    fireEvent.change(screen.getByLabelText("Amount before tax"), {
      target: { value: "75000" },
    });
    next();
    // Back from the tax step returns to the amount step with the value intact.
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));

    expect(
      (screen.getByLabelText("Amount before tax") as HTMLInputElement).value,
    ).toBe("75000");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "2",
    );
  });

  it("rejects a due date before the invoice date", () => {
    setup();
    next();
    fireEvent.change(screen.getByLabelText("Amount before tax"), {
      target: { value: "10000" },
    });
    next();
    next();

    fireEvent.change(screen.getByLabelText("Invoice date"), {
      target: { value: "2026-11-10" },
    });
    fireEvent.change(screen.getByLabelText("Payment date"), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("Due on"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));

    expect(screen.getByRole("alert").textContent).toContain(
      "cannot fall before",
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "4",
    );
  });

  it("lets a repeat user leave for the single-screen form at any point", () => {
    const { onSwitchToForm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Use the full form" }));
    expect(onSwitchToForm).toHaveBeenCalledTimes(1);
  });

  it("shows how much is already billed as context on the amount step", () => {
    setup();
    next();
    expect(screen.getByText(/250,000/)).toBeTruthy();
    expect(screen.getByText(/already billed/)).toBeTruthy();
  });
});

describe("InvoiceWizard responsive layout", () => {
  it("stacks on a phone and only splits into columns from the small breakpoint", () => {
    setup();
    // Option cards: single column on phones, two from sm upwards.
    const group = screen.getByRole("group", {
      name: "What is this invoice for?",
    });
    const grid = group.querySelector("div.grid");
    expect(grid?.className).toContain("grid");
    expect(grid?.className).not.toContain("grid-cols-2 ");
    expect(grid?.className).toContain("sm:grid-cols-2");

    // Actions stack full width on phones and sit in a row on wider screens.
    const actions = screen.getByRole("button", { name: /Next/ }).parentElement
      ?.parentElement;
    expect(actions?.className).toContain("flex-col");
    expect(actions?.className).toContain("sm:flex-row");

    // Primary controls keep an accessible tap target at every width.
    expect(screen.getByRole("button", { name: /Next/ }).className).toContain(
      "min-h-11",
    );
  });
});

describe("addDays", () => {
  it("adds calendar days without crossing a timezone", () => {
    expect(addDays("2026-11-09", 30)).toBe("2026-12-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-09", 0)).toBe("2026-11-09");
  });
});

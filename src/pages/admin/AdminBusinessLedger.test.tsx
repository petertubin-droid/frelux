import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const invoices = [
  {
    id: "i1",
    project_id: "p1",
    number: "INV-0001",
    issued_at: "2026-10-01",
    due_at: "2026-10-31",
    currency: "NGN",
    total: 600000,
    status: "sent",
  },
];

const payments: unknown[] = [];
const expenses = [
  { project_id: "p1", amount: 200000, currency: "NGN", receipt_path: "x.jpg" },
];

vi.mock("@/lib/contractor", () => ({
  fetchContractorProjects: vi.fn().mockResolvedValue([
    {
      id: "p1",
      name: "Lekki duplex",
      client_name: "Adaeze",
      currency: "NGN",
    },
  ]),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        in: () =>
          Promise.resolve({
            data:
              table === "project_invoices"
                ? invoices
                : table === "project_payments"
                  ? payments
                  : expenses,
            error: null,
          }),
      }),
    }),
  },
}));

import AdminBusinessLedger from "./AdminBusinessLedger";

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminBusinessLedger />
    </MemoryRouter>,
  );
}

describe("AdminBusinessLedger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("totals one currency and names the project it came from", async () => {
    renderPage();
    expect(await screen.findByText(/NGN across 1 project/)).toBeInTheDocument();
    expect(screen.getAllByText("Lekki duplex").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Adaeze").length).toBeGreaterThan(0);
  });

  it("shows the outstanding and overdue figures a reader can check", async () => {
    renderPage();
    await screen.findByText(/NGN across 1 project/);
    // 600,000 billed, nothing paid, so billed, outstanding and overdue all read
    // the same figure; each label must be present next to it.
    expect(screen.getAllByText("NGN 600,000").length).toBeGreaterThanOrEqual(3);
    for (const label of ["Billed", "Outstanding", "Overdue"]) {
      // The label appears on the currency card and again in the project table.
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getAllByText("Margin").length).toBeGreaterThanOrEqual(1);
    // Margin is billed less spend: 600,000 - 200,000, shown on the card and on
    // the project row.
    expect(screen.getAllByText("NGN 400,000").length).toBeGreaterThanOrEqual(1);
  });

  it("says nothing about a currency clash when there is only one", async () => {
    renderPage();
    await screen.findByText(/NGN across 1 project/);
    expect(
      screen.queryByText(/more than one currency/i),
    ).not.toBeInTheDocument();
  });

  it("states that nothing was converted when projects span currencies", async () => {
    const contractor = await import("@/lib/contractor");
    vi.mocked(contractor.fetchContractorProjects).mockResolvedValueOnce([
      {
        id: "p1",
        name: "Lekki duplex",
        client_name: "Adaeze",
        currency: "NGN",
      },
      { id: "p2", name: "Dubai villa", client_name: "Rashid", currency: "AED" },
    ] as never);
    renderPage();
    expect(
      await screen.findByText(/billed in more than one currency/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/nothing has been converted/i)).toBeInTheDocument();
  });
});

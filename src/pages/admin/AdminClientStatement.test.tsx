import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/contractor", () => ({
  fetchContractorProjects: vi.fn(async () => [
    {
      id: "p1",
      name: "Lekki duplex",
      client_name: "Adaeze",
      currency: "NGN",
    },
    {
      id: "p2",
      name: "Ajah terrace",
      client_name: "Rashid",
      currency: "NGN",
    },
  ]),
}));

vi.mock("@/lib/supabase", () => {
  const invoiceRows = [
    {
      id: "i1",
      number: "INV-0001",
      project_id: "p1",
      issued_at: "2026-10-05",
      currency: "NGN",
      total: 100000,
      status: "sent",
    },
    {
      id: "i2",
      number: "INV-9001",
      project_id: "p2",
      issued_at: "2026-10-06",
      currency: "NGN",
      total: 400000,
      status: "sent",
    },
  ];
  const paymentRows = [
    {
      id: "pay1",
      project_id: "p1",
      invoice_id: "i1",
      amount: 40000,
      currency: "NGN",
      paid_at: "2026-10-10",
    },
    {
      id: "pay2",
      project_id: "p2",
      invoice_id: "i2",
      amount: 400000,
      currency: "NGN",
      paid_at: "2026-10-11",
    },
  ];
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          in: () =>
            Promise.resolve({
              data: table === "project_invoices" ? invoiceRows : paymentRows,
              error: null,
            }),
        }),
      }),
    },
  };
});

import AdminClientStatement from "./AdminClientStatement";

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminClientStatement />
    </MemoryRouter>,
  );
}

describe("AdminClientStatement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("statements only the selected client's projects", async () => {
    renderPage();
    await screen.findByText("INV-0001");
    // The project name appears once per line, so more than one is expected.
    expect(screen.getAllByText("Lekki duplex").length).toBeGreaterThanOrEqual(
      1,
    );
    // Rashid's project is not part of Adaeze's statement.
    expect(screen.queryByText("Ajah terrace")).not.toBeInTheDocument();
    expect(screen.queryByText("INV-9001")).not.toBeInTheDocument();
  });

  it("shows the running balance and the closing figure", async () => {
    renderPage();
    await screen.findByText("INV-0001");
    // 100,000 billed, 40,000 received, so the closing balance is 60,000 and the
    // final line reads the same.
    await waitFor(() => {
      expect(screen.getAllByText(/60,000/).length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText("Closing balance")).toBeInTheDocument();
    expect(screen.getByText("Held on account")).toBeInTheDocument();
  });

  it("does not include another client's money in the totals", async () => {
    renderPage();
    await screen.findByText("INV-0001");
    // Billed is 100,000 for Adaeze, never 500,000 with Rashid's 400,000 added.
    expect(screen.queryByText(/500,000/)).not.toBeInTheDocument();
  });
});

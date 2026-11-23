/**
 * AdminExpenseLedger page conformance (admin coverage tranche 1, 2026-11-23).
 *
 * The summariser has its own tests. What was untested is the promise the page
 * itself makes: one card per currency, never a combined figure, and no total at
 * all rather than a partial one when the read fails.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const state = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  error: null as null | { message: string },
}));

const selectSpy = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: (columns?: string) => {
        selectSpy(columns);
        return Promise.resolve({ data: state.data, error: state.error });
      },
    }),
  },
}));

import AdminExpenseLedger from "@/pages/admin/AdminExpenseLedger";

const row = (over: Record<string, unknown>) => ({
  id: "e",
  project_id: "p",
  category: "materials",
  name: "Supplier",
  amount: 1000,
  currency: "NGN",
  spent_at: "2026-11-15",
  ...over,
});

beforeEach(() => {
  state.error = null;
  state.data = [
    row({ id: "e1", amount: 450000, currency: "NGN", name: "Dangote Depot" }),
    row({ id: "e2", amount: 300000, currency: "NGN", category: "labour" }),
    row({ id: "e3", amount: 1200, currency: "USD", name: "Cat Rental" }),
  ];
});

describe("AdminExpenseLedger currency separation", () => {
  it("gives each currency its own card and never adds them together", async () => {
    const { container } = render(<AdminExpenseLedger />);
    await waitFor(() => expect(screen.getByText("NGN")).toBeTruthy());

    expect(screen.getByText("USD")).toBeTruthy();
    const text = container.textContent ?? "";
    // 450,000 + 300,000 NGN and 1,200 USD, kept apart.
    expect(text).toContain("750,000");
    expect(text).toContain("1,200");
    expect(text).not.toContain("751,200");
  });

  it("reports the row count per currency", async () => {
    render(<AdminExpenseLedger />);
    await waitFor(() => expect(screen.getByText("NGN")).toBeTruthy());
    expect(screen.getByText(/^2 expenses$/)).toBeTruthy();
    expect(screen.getByText(/^1 expense$/)).toBeTruthy();
  });
});

describe("AdminExpenseLedger bad data", () => {
  it("leaves an unreadable amount out of the total and says so", async () => {
    state.data = [
      row({ id: "e1", amount: 450000, currency: "NGN" }),
      row({ id: "e2", amount: "not-a-number", currency: "NGN" }),
    ];
    const { container } = render(<AdminExpenseLedger />);
    await waitFor(() => expect(screen.getByText("NGN")).toBeTruthy());

    expect(container.textContent).toContain("450,000");
    expect(container.textContent).toContain("unreadable amount");
    expect(container.textContent).toContain("1 expense");
  });

  it("shows no total rather than a partial one when the read fails", async () => {
    state.error = { message: "permission denied" };
    state.data = [];
    render(<AdminExpenseLedger />);

    await waitFor(() =>
      expect(screen.getByText("Expenses unavailable")).toBeTruthy(),
    );
    expect(
      screen.getByText(/no total is shown rather than a partial one/i),
    ).toBeTruthy();
    expect(screen.queryByText("NGN")).toBeNull();
  });
});

describe("AdminExpenseLedger empty state", () => {
  it("says nothing is recorded instead of showing zero", async () => {
    state.data = [];
    render(<AdminExpenseLedger />);
    await waitFor(() =>
      expect(screen.getByText("No expenses recorded")).toBeTruthy(),
    );
  });

  it("asks for only the seven columns the ledger needs", async () => {
    render(<AdminExpenseLedger />);
    await waitFor(() => expect(selectSpy).toHaveBeenCalled());

    const columns = String(selectSpy.mock.calls[0][0] ?? "");
    // select("*") would ship every expense field, including notes a supplier
    // or a project owner wrote, into an admin screen that only shows totals.
    expect(columns).not.toBe("*");
    for (const column of [
      "id",
      "project_id",
      "category",
      "name",
      "amount",
      "currency",
      "spent_at",
    ]) {
      expect(columns).toContain(column);
    }
  });

  it("re-reads the ledger when refresh is pressed", async () => {
    render(<AdminExpenseLedger />);
    await waitFor(() => expect(screen.getByText("NGN")).toBeTruthy());
    const before = selectSpy.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));

    await waitFor(() =>
      expect(selectSpy.mock.calls.length).toBeGreaterThan(before),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPartnershipInquiries from "./AdminPartnershipInquiries";

const supabaseMock = vi.hoisted(() => {
  const state: { rows: unknown[]; count: number } = { rows: [], count: 0 };
  const chain: Record<string, unknown> = {
    select: vi.fn((_q: string, opts?: { head?: boolean }) =>
      opts?.head ? Promise.resolve({ count: state.count, error: null }) : chain,
    ),
    order: vi.fn(() => chain),
    range: vi.fn(() => Promise.resolve({ data: state.rows, error: null })),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return {
    __setRows: (r: unknown[]) => {
      state.rows = r;
      state.count = r.length;
    },
    from: vi.fn(() => chain),
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));

const row = {
  id: "inq-1",
  name: "Ada Obi",
  email: "ada@example.com",
  company: "Obi Capital",
  interest: "investor",
  message: "We would like to discuss the company in more detail.",
  status: "new",
  created_at: "2026-10-07T09:00:00Z",
};

function setup() {
  return render(
    <MemoryRouter>
      <AdminPartnershipInquiries />
    </MemoryRouter>,
  );
}

describe("AdminPartnershipInquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.__setRows([row]);
  });

  it("loads and lists inquiries with human-readable interest labels", async () => {
    setup();
    expect(await screen.findByText("Ada Obi · Obi Capital")).toBeTruthy();
    expect(screen.getByText(/Investor relations/)).toBeTruthy();
    expect(screen.getByText(/ada@example\.com/)).toBeTruthy();
  });

  it("opens the detail view with the full message when View is clicked", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: /View/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          "We would like to discuss the company in more detail.",
        ),
      ).toBeTruthy();
    });
    expect(screen.getByText(/Mark responded/i)).toBeTruthy();
  });

  it("shows the empty state when there are no inquiries", async () => {
    supabaseMock.__setRows([]);
    setup();
    expect(await screen.findByText("No inquiries")).toBeTruthy();
  });
});

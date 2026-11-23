import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminAiMonetization from "./AdminAiMonetization";
import { supabase } from "@/lib/supabase";

const mockSiteSettings = {
  id: "site-settings-1",
  ai_enabled: true,
  ai_access_mode: "free_rewarded",
  ai_daily_free_uses: 5,
  ai_rewarded_enabled: true,
  ai_rewarded_uses_per_reward: 3,
  ai_rewarded_daily_cap: 10,
  ai_paid_price_cents: 500,
  ai_paid_currency: "USD",
  ai_monthly_subscription_enabled: false,
  ai_monthly_subscription_price_cents: 2900,
  payment_provider_configured: false,
  updated_at: "2026-11-20T00:00:00Z",
};

let queryResult = { data: mockSiteSettings, error: null };
const updateEqMock = vi.fn().mockReturnValue(Promise.resolve({ error: null }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockImplementation(() => Promise.resolve(queryResult)),
        }),
      }),
      update: vi.fn().mockImplementation((payload) => ({
        eq: updateEqMock.mockImplementation(() =>
          Promise.resolve({ error: null }),
        ),
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  queryResult = { data: { ...mockSiteSettings }, error: null };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAiMonetization />
    </MemoryRouter>,
  );
}

describe("AdminAiMonetization", () => {
  it("loads and displays AI monetization configuration", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /AI Monetization/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Daily free AI uses/i)).toHaveValue(5);
    expect(screen.getByLabelText("Rewarded users")).toBeInTheDocument();
  });

  it("updates free daily uses and sends update payload on save", async () => {
    renderPage();

    await screen.findByRole("heading", { level: 1, name: /AI Monetization/i });
    const freeUsesInput = screen.getByLabelText(/Daily free AI uses/i);
    fireEvent.change(freeUsesInput, { target: { value: "8" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("site_settings");
      expect(updateEqMock).toHaveBeenCalled();
    });
  });

  it("refuses to save Paid mode when payment provider is not configured", async () => {
    queryResult = {
      data: { ...mockSiteSettings, payment_provider_configured: false },
      error: null,
    };
    renderPage();

    await screen.findByRole("heading", { level: 1, name: /AI Monetization/i });
    const paidBtn = screen.getByRole("button", { name: /^Paid/i });
    fireEvent.click(paidBtn);

    // Save button should be disabled because canSave() checks this
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });

  it("allows Paid mode if payment provider is configured", async () => {
    queryResult = {
      data: { ...mockSiteSettings, payment_provider_configured: true },
      error: null,
    };
    renderPage();

    await screen.findByRole("heading", { level: 1, name: /AI Monetization/i });
    const paidBtn = screen.getByRole("button", { name: /^Paid/i });
    fireEvent.click(paidBtn);

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalled();
    });
  });

  it("displays honest error banner when database fetch fails", async () => {
    queryResult = {
      data: null,
      error: { message: "Permission denied for site_settings" } as any,
    };
    renderPage();

    expect(
      await screen.findByText("Permission denied for site_settings"),
    ).toBeInTheDocument();
  });

  it("displays error message if save update fails", async () => {
    updateEqMock.mockResolvedValueOnce({
      error: { message: "Failed to update monetization settings" },
    });
    renderPage();

    await screen.findByRole("heading", { level: 1, name: /AI Monetization/i });
    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText("Failed to update monetization settings"),
    ).toBeInTheDocument();
  });
});

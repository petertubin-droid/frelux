/**
 * AdminAiSettings page conformance (admin coverage tranche 2, 2026-11-23).
 *
 * The page writes an explicit allowlist of eighteen settings to one row. The
 * tests pin that allowlist: a field added to the update payload by accident
 * would overwrite a setting another page owns, and nothing on screen would
 * change until someone noticed a behaviour change in production.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  loadError: null as null | { message: string },
  saveError: null as null | { message: string },
  updatePayload: null as Record<string, unknown> | null,
  updateFilters: [] as Array<[string, unknown]>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: state.row,
              error: state.loadError,
            }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        state.updatePayload = payload;
        return {
          eq: (column: string, value: unknown) => {
            state.updateFilters.push([column, value]);
            return Promise.resolve({ error: state.saveError });
          },
        };
      },
    }),
  },
}));

vi.mock("@/lib/i18n", () => ({ useLanguage: () => ({ t: (s: string) => s }) }));
vi.mock("@/lib/widget-settings", () => ({
  useWidgetSettings: () => ({ settings: {}, update: vi.fn() }),
}));

import AdminAiSettings from "@/pages/admin/AdminAiSettings";

const row = {
  id: "settings-1",
  ai_enabled: true,
  ai_access_mode: "free_daily",
  ai_daily_free_uses: 3,
  ai_rewarded_enabled: false,
  ai_paid_enabled: true,
  ai_paid_price: 1500,
  ai_paid_currency: "NGN",
  ai_reset_period: "daily",
  ai_admin_override: false,
  estimation_enabled: true,
  estimation_access_mode: "free_daily",
  estimation_daily_free_uses: 5,
  estimation_rewarded_enabled: true,
  estimation_paid_enabled: false,
  estimation_paid_price: 2000,
  estimation_paid_currency: "NGN",
  estimation_reset_period: "monthly",
  estimation_admin_override: true,
  // Fields the page must never write: owned by other admin screens.
  site_name: "FRELUX",
  adsense_client_id: "ca-pub-123",
  welcome_email_enabled: true,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminAiSettings />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.row = { ...row };
  state.loadError = null;
  state.saveError = null;
  state.updatePayload = null;
  state.updateFilters = [];
});

describe("AdminAiSettings save payload", () => {
  it("writes only the AI and estimation allowlist to the loaded row", async () => {
    renderPage();
    const save = await screen.findByRole("button", { name: /Save changes/i });
    fireEvent.click(save);

    await waitFor(() => expect(state.updatePayload).not.toBeNull());

    const keys = Object.keys(state.updatePayload ?? {}).sort();
    expect(keys).toEqual(
      [
        "ai_access_mode",
        "ai_admin_override",
        "ai_daily_free_uses",
        "ai_enabled",
        "ai_paid_currency",
        "ai_paid_enabled",
        "ai_paid_price",
        "ai_reset_period",
        "ai_rewarded_enabled",
        "estimation_access_mode",
        "estimation_admin_override",
        "estimation_daily_free_uses",
        "estimation_enabled",
        "estimation_paid_currency",
        "estimation_paid_enabled",
        "estimation_paid_price",
        "estimation_reset_period",
        "estimation_rewarded_enabled",
      ].sort(),
    );
    // The row's other columns must not travel with the update.
    expect(keys).not.toContain("site_name");
    expect(keys).not.toContain("adsense_client_id");
    expect(keys).not.toContain("welcome_email_enabled");
  });

  it("updates the row it loaded, not the first row in the table", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /Save changes/i }),
    );
    await waitFor(() => expect(state.updateFilters.length).toBe(1));
    expect(state.updateFilters[0]).toEqual(["id", "settings-1"]);
  });

  it("carries the loaded values through unchanged", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /Save changes/i }),
    );
    await waitFor(() => expect(state.updatePayload).not.toBeNull());
    expect(state.updatePayload?.ai_daily_free_uses).toBe(3);
    expect(state.updatePayload?.estimation_reset_period).toBe("monthly");
    expect(state.updatePayload?.estimation_admin_override).toBe(true);
  });

  it("reports a rejected save instead of claiming success", async () => {
    state.saveError = { message: "new row violates row-level security" };
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /Save changes/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/new row violates row-level security/i),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Settings saved/i)).toBeNull();
  });

  it("confirms a successful save", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /Save changes/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Settings saved/i)).toBeInTheDocument(),
    );
  });

  it("surfaces a read failure", async () => {
    state.row = null;
    state.loadError = { message: "permission denied for table site_settings" };
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/permission denied for table site_settings/i),
      ).toBeInTheDocument(),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminImageEstimation from "./AdminImageEstimation";
import { supabase } from "@/lib/supabase";

const mockSettings = {
  id: "settings-row-1",
  estimation_enabled: true,
  estimation_access_mode: "free",
  estimation_daily_free_uses: 3,
  estimation_rewarded_enabled: false,
  estimation_paid_enabled: false,
  estimation_paid_price: 500,
  estimation_paid_currency: "NGN",
  estimation_reset_period: "daily",
  estimation_admin_override: true,
};

let currentSettings: any = { ...mockSettings };
let fetchError: any = null;
let saveError: any = null;
const updateEqMock = vi
  .fn()
  .mockImplementation(() => Promise.resolve({ error: saveError }));

function createChainQuery() {
  const obj: any = {
    select: vi.fn().mockImplementation(() => obj),
    limit: vi.fn().mockImplementation(() => obj),
    gte: vi.fn().mockImplementation(() => obj),
    maybeSingle: vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({
          data: fetchError ? null : currentSettings,
          error: fetchError,
        }),
      ),
    then: (resolve: any) =>
      resolve({
        data: [{ user_id: "user-1" }, { user_id: "user-2" }],
        count: 42,
        error: null,
      }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "site_settings") {
        return {
          select: vi.fn().mockImplementation(() => createChainQuery()),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
        };
      }
      if (table === "estimation_results") {
        return createChainQuery();
      }
      return createChainQuery();
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentSettings = { ...mockSettings };
  fetchError = null;
  saveError = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminImageEstimation />
    </MemoryRouter>,
  );
}

describe("AdminImageEstimation", () => {
  it("renders page header, usage stats, and access configuration", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /AI Image Estimation/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Total Estimates")).toBeInTheDocument();
    expect(screen.getByText("Access Configuration")).toBeInTheDocument();
    expect(screen.getByText("Feature Enabled")).toBeInTheDocument();
  });

  it("updates access mode selection", async () => {
    renderPage();

    await screen.findByText("Access Configuration");
    const modeSelect = screen.getByLabelText("Image estimation access mode");
    fireEvent.change(modeSelect, { target: { value: "paid" } });

    expect(modeSelect).toHaveValue("paid");
  });

  it("toggles image estimation master switch and saves configuration", async () => {
    renderPage();

    await screen.findByText("Access Configuration");
    const toggle = screen.getByLabelText("Image estimation enabled");
    fireEvent.click(toggle);

    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "settings-row-1");
    });
  });

  it("shows migration required alert if fetching settings returns error", async () => {
    fetchError = { message: "column estimation_enabled does not exist" };
    renderPage();

    expect(await screen.findByText("Migration Required")).toBeInTheDocument();
  });

  it("shows error alert if saving configuration fails", async () => {
    saveError = { message: "Failed to persist site settings" };
    renderPage();

    await screen.findByText("Access Configuration");
    const saveBtn = screen.getByRole("button", { name: /Save Configuration/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText("Couldn't save changes"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Failed to persist site settings"),
    ).toBeInTheDocument();
  });
});

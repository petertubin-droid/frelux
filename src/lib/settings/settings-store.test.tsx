import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const authState: { user: { id: string } | null } = { user: null };
const marketState = { marketCode: "NG", setMarket: vi.fn(async () => {}) };
const setStoredUnitSystem = vi.fn();
const selectRow: { data: Record<string, unknown> | null; error: unknown } = {
  data: null,
  error: null,
};
const upsert = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/auth", () => ({ useAuth: () => authState }));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ ...marketState, setMarket: marketState.setMarket }),
}));
vi.mock("@/lib/international/units-display", () => ({
  setStoredUnitSystem: (...args: unknown[]) => setStoredUnitSystem(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => selectRow }) }),
      upsert: (...args: unknown[]) => upsert(...(args as [])),
    }),
  },
}));

import {
  GlobalSettingsProvider,
  GUEST_SETTINGS_KEY,
  useGlobalSettings,
} from "./settings-store";

function Probe() {
  const { settings, isGuest, savedToAccount, save, reset } =
    useGlobalSettings();
  return (
    <div>
      <span data-testid="country">{settings.countryCode}</span>
      <span data-testid="system">{settings.measurementSystem}</span>
      <span data-testid="currency">{settings.currencyCode}</span>
      <span data-testid="bag">{settings.regional.bagKg}</span>
      <span data-testid="guest">{String(isGuest)}</span>
      <span data-testid="saved">{String(savedToAccount)}</span>
      <button onClick={() => void save({ countryCode: "US" })}>save us</button>
      <button onClick={() => void save({ measurementSystem: "imperial" })}>
        save imperial
      </button>
      <button onClick={() => void reset()}>reset</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <GlobalSettingsProvider>
      <Probe />
    </GlobalSettingsProvider>,
  );
}

describe("global settings store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    authState.user = null;
    marketState.marketCode = "NG";
    marketState.setMarket.mockClear();
    setStoredUnitSystem.mockClear();
    selectRow.data = null;
    selectRow.error = null;
    upsert.mockClear();
  });

  it("starts on the country default with nothing stored", async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("NG"),
    );
    expect(screen.getByTestId("system")).toHaveTextContent("metric");
    expect(screen.getByTestId("guest")).toHaveTextContent("true");
  });

  it("persists a guest choice locally and re-reads it on the next visit", async () => {
    const first = renderProbe();
    await act(async () => {
      screen.getByText("save us").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("US"),
    );
    expect(screen.getByTestId("system")).toHaveTextContent("imperial");
    expect(window.localStorage.getItem(GUEST_SETTINGS_KEY)).toContain("US");
    first.unmount();

    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("US"),
    );
    expect(screen.getByTestId("currency")).toHaveTextContent("USD");
  });

  it("moves the market and the calculator unit system with the country", async () => {
    renderProbe();
    await act(async () => {
      screen.getByText("save us").click();
    });
    await waitFor(() =>
      expect(marketState.setMarket).toHaveBeenCalledWith("US"),
    );
    expect(setStoredUnitSystem).toHaveBeenCalledWith("imperial");
  });

  it("keeps a regional convention when only units change", async () => {
    renderProbe();
    await act(async () => {
      screen.getByText("save imperial").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("system")).toHaveTextContent("imperial"),
    );
    expect(screen.getByTestId("bag")).toHaveTextContent("50");
  });

  it("resets back to the country defaults", async () => {
    renderProbe();
    await act(async () => {
      screen.getByText("save us").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("US"),
    );
    await act(async () => {
      screen.getByText("reset").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("NG"),
    );
    expect(
      window.localStorage.getItem(GUEST_SETTINGS_KEY) ?? "{}",
    ).not.toContain("US");
  });

  it("loads a signed-in account row and stores changes back to it", async () => {
    authState.user = { id: "user-1" };
    selectRow.data = {
      country_code: "KE",
      measurement_system: null,
      currency_code: null,
      language: null,
    };
    renderProbe();
    await waitFor(() =>
      expect(screen.getByTestId("country")).toHaveTextContent("KE"),
    );
    expect(screen.getByTestId("currency")).toHaveTextContent("KES");
    expect(screen.getByTestId("guest")).toHaveTextContent("false");
    expect(screen.getByTestId("saved")).toHaveTextContent("true");

    await act(async () => {
      screen.getByText("save us").click();
    });
    await waitFor(() => expect(upsert).toHaveBeenCalled());
  });

  it("migrates guest choices to the account on first sign-in", async () => {
    window.localStorage.setItem(
      GUEST_SETTINGS_KEY,
      JSON.stringify({ countryCode: "AU" }),
    );
    authState.user = { id: "user-2" };
    selectRow.data = null;
    renderProbe();
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(screen.getByTestId("country")).toHaveTextContent("AU");
    expect(screen.getByTestId("saved")).toHaveTextContent("true");
  });
});

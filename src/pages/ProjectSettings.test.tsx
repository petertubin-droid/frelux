import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const authState: { user: { id: string } | null } = { user: null };
const marketState = { marketCode: "NG", setMarket: vi.fn(async () => {}) };

vi.mock("@/lib/auth", () => ({ useAuth: () => authState }));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ ...marketState, setMarket: marketState.setMarket }),
}));
vi.mock("@/lib/international/units-display", () => ({
  setStoredUnitSystem: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      upsert: async () => ({ error: null }),
    }),
  },
}));

import ProjectSettings from "./ProjectSettings";
import {
  GlobalSettingsProvider,
  GUEST_SETTINGS_KEY,
} from "@/lib/settings/settings-store";

function renderPage() {
  return render(
    <MemoryRouter>
      <GlobalSettingsProvider>
        <ProjectSettings />
      </GlobalSettingsProvider>
    </MemoryRouter>,
  );
}

describe("project settings page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    authState.user = null;
    marketState.marketCode = "NG";
    marketState.setMarket.mockClear();
  });

  it("offers every supported country and starts on Nigeria", () => {
    renderPage();
    const select = screen.getByLabelText(
      /project country/i,
    ) as HTMLSelectElement;
    expect(select.options.length).toBeGreaterThanOrEqual(13);
    expect(select.value).toBe("NG");
    expect(
      screen.getByText(/Guest: preferences stay on this device/i),
    ).toBeInTheDocument();
  });

  it("searches the whole world by name or code", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/find your country/i), {
      target: { value: "japan" },
    });
    const select = screen.getByLabelText(
      /project country/i,
    ) as HTMLSelectElement;
    const labels = Array.from(select.options).map(
      (option) => option.textContent ?? "",
    );
    expect(labels.some((label) => label.includes("Japan"))).toBe(true);
    // the current choice stays listed so the control never shows a blank value
    expect(labels.some((label) => label.includes("Nigeria"))).toBe(true);

    fireEvent.change(screen.getByLabelText(/find your country/i), {
      target: { value: "gh" },
    });
    const ghanaOptions = Array.from(
      (screen.getByLabelText(/project country/i) as HTMLSelectElement).options,
    ).map((option) => option.textContent ?? "");
    expect(ghanaOptions.some((label) => label.includes("Ghana"))).toBe(true);
  });

  it("formats a country FRELUX has no curated row for", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/find your country/i), {
      target: { value: "sweden" },
    });
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "SE" },
    });
    // Swedish convention: space grouped thousands and a decimal comma
    expect(screen.getByText(/1 250 000,00/)).toBeInTheDocument();
  });

  it("says plainly when a country has no local price book", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/find your country/i), {
      target: { value: "algeria" },
    });
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "DZ" },
    });
    expect(screen.getByText(/no local price book yet/i)).toBeInTheDocument();
  });

  it("shows the effect of a new country before saving", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "US" },
    });
    expect(screen.getByText("$1,250,000.00")).toBeInTheDocument();
    expect(screen.getByText("44,092.5 lb")).toBeInTheDocument();
    // nothing persisted until the visitor saves
    expect(window.localStorage.getItem(GUEST_SETTINGS_KEY)).toBeNull();
  });

  it("switches measurement display without touching the metric engine", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /imperial \(ft, ft²\)/i }),
    );
    expect(screen.getByText("10.0 ft")).toBeInTheDocument();
    expect(screen.getByText("1,000.0 ft²")).toBeInTheDocument();
  });

  it("saves guest preferences locally and reports it honestly", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "GB" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /save on this device/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Saved on this device/i)).toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(GUEST_SETTINGS_KEY)).toContain("GB");
  });

  it("keeps a regional override separate from the country", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/bag weight/i), {
      target: { value: "25" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /save on this device/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Saved on this device/i)).toBeInTheDocument(),
    );
    const stored = JSON.parse(
      window.localStorage.getItem(GUEST_SETTINGS_KEY) ?? "{}",
    );
    expect(stored.regional.bagKg).toBe(25);
    expect(stored.countryCode).toBeUndefined();
  });

  it("resets to country defaults and clears stored overrides", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "AU" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /save on this device/i }),
    );
    await waitFor(() =>
      expect(window.localStorage.getItem(GUEST_SETTINGS_KEY)).toContain("AU"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /use country defaults/i }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Back to the country defaults/i),
      ).toBeInTheDocument(),
    );
    expect(
      window.localStorage.getItem(GUEST_SETTINGS_KEY) ?? "{}",
    ).not.toContain("AU");
  });
});

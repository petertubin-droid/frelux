import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BuildInNigeriaFromAbroad from "./BuildInNigeriaFromAbroad";

vi.mock("@/lib/settings/settings-store", () => ({
  useGlobalSettings: () => ({
    settings: { measurementSystem: "imperial", currencyCode: "USD" },
    overrides: {},
    suggestedCountry: null,
    isGuest: true,
    isLoading: false,
    savedToAccount: false,
    save: vi.fn(async () => ({ ok: true })),
    reset: vi.fn(async () => {}),
  }),
}));

vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({
    code: "USD",
    converting: true,
    setCurrency: vi.fn(),
    rateDescription: null,
    rateConfigured: () => true,
    config: null,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BuildInNigeriaFromAbroad />
    </MemoryRouter>,
  );
}

describe("BuildInNigeriaFromAbroad", () => {
  it("states the rule that a converted figure is not a price", () => {
    renderPage();
    expect(
      screen.getByText(/A converted figure is not a price/i),
    ).toBeInTheDocument();
  });

  it("offers the unit and currency switches to an overseas visitor", () => {
    renderPage();
    expect(
      screen.getByRole("group", { name: /measurement system/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /display currency/i }),
    ).toBeInTheDocument();
  });

  it("links to the calculators a diaspora builder needs", () => {
    renderPage();
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/unit-converter");
    expect(hrefs).toContain("/build-to-roof-estimator");
    expect(hrefs).toContain("/tile-calculator");
    expect(hrefs).toContain("/material-prices");
  });

  it("answers the cost questions in its own FAQ", () => {
    renderPage();
    expect(
      screen.getByText(/Can I estimate Nigerian construction costs/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Why does the converted dollar figure differ/i),
    ).toBeInTheDocument();
  });

  it("uses no em dashes", () => {
    const { container } = renderPage();
    expect(container.textContent ?? "").not.toContain("—");
  });
});

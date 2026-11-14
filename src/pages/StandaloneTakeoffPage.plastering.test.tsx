// The plastering summary printed raw JSON where a number belonged
// (`{"plastererHours":16.8,"tenderHours":11.8}`), because the page stringified
// any non-primitive result value. Unreadable on its own, and the unbreakable
// token dragged the results card past a phone screen. These tests assert the
// rendered page, so a regression in the row builder shows up here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    market: { marketCode: "NG", country_name: "Nigeria" },
    availableMarkets: [{ country_code: "NG", country_name: "Nigeria" }],
  }),
}));
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useLanguage: () =>
      ({ t: (key: string) => key }) as unknown as ReturnType<
        typeof actual.useLanguage
      >,
  };
});
vi.mock("@/lib/seo", () => ({
  useSeo: () => {},
  useBreadcrumbJsonLd: () => {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import StandaloneTakeoffPage from "./StandaloneTakeoffPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <StandaloneTakeoffPage initialEngine="plastering" />
    </MemoryRouter>,
  );
}

function calculate(area = "48") {
  fireEvent.change(screen.getByLabelText(/Surface area/i), {
    target: { value: area },
  });
  fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
}

describe("plastering calculator summary", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the labour hours as numbers, not as a stringified object", () => {
    renderPage();
    calculate();

    expect(
      screen.getByText("Plasterer Hours 16.8 · Tender Hours 11.8"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\{"plastererHours"/)).not.toBeInTheDocument();
  });

  it("prints no raw JSON anywhere in the results", () => {
    const { container } = renderPage();
    calculate();

    const text = container.textContent ?? "";
    // A quoted key followed by a colon is the shape JSON.stringify produced:
    // {"plastererHours":, {"marketCode":, "sources":[{"url":.
    expect(text).not.toMatch(/\{"?[A-Za-z_]+"?\s*:/);
    expect(text).not.toContain('":[');
    expect(text).not.toContain('":{"');
  });

  it("keeps the packaging evidence in its own panel, not in a summary row", () => {
    renderPage();
    calculate();

    expect(screen.queryByText(/^Packaging Evidence$/i)).not.toBeInTheDocument();
    // It is still available, rendered by the evidence panel.
    expect(screen.getAllByText(/source/i).length).toBeGreaterThan(0);
  });

  it("still lists the material quantities the user came for", () => {
    renderPage();
    calculate();

    expect(screen.getByText("Cement bags required")).toBeInTheDocument();
    expect(screen.getByText("Wet Mortar Volume M3")).toBeInTheDocument();
    // The sand row now states the volume and the weight it means, because a
    // plaster job is bought in tonnes and trips, not cubic metres.
    const sand = screen.getByText("Sand volume");
    expect(sand.nextElementSibling?.textContent).toMatch(
      /^[\d.,]+ m³ · [\d.,]+ t$/,
    );
  });
});

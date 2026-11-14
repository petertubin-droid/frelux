// The masonry and plastering calculators must be able to measure a whole
// building from the shared building size, not just one wall the user retyped.
// These tests drive the page, so a break in the wiring shows up here.

import { describe, it, expect, vi, beforeEach } from "vitest";
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

function renderPage(engine: "masonry" | "plastering") {
  return render(
    <MemoryRouter>
      <StandaloneTakeoffPage initialEngine={engine} />
    </MemoryRouter>,
  );
}

function applyFirstTemplate() {
  const select = screen.getByLabelText(/building type/i) as HTMLSelectElement;
  const option = Array.from(select.options).find((item) => item.value !== "");
  expect(option).toBeTruthy();
  fireEvent.change(select, { target: { value: option!.value } });
  return option!.text;
}

describe("building template inside the masonry calculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("measures the whole building rather than one wall", () => {
    renderPage("masonry");
    fireEvent.click(screen.getByRole("button", { name: /calculate/i }));

    // A building has several rooms, so the gross wall area must exceed the
    // single wall the form would otherwise measure (3 m by 2.7 m).
    const gross = screen.getByText(/Gross wall area/i).closest("div");
    const text = gross?.textContent ?? "";
    const value = Number(/([0-9]+(?:\.[0-9]+)?)/.exec(text)?.[1] ?? "0");
    expect(value).toBeGreaterThan(9);
  });

  it("says which rooms the total came from, so it can be audited", () => {
    renderPage("masonry");
    applyFirstTemplate();
    fireEvent.click(screen.getByRole("button", { name: /calculate/i }));
    // The page names the building, its room count and the wall run it measured,
    // so a reader can trace the total back to the rooms on screen.
    const note = screen
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "")
      .find((text) => text.startsWith("Measured from "));
    expect(note).toBeTruthy();
    expect(note).toMatch(
      /[0-9]+ rooms?, [0-9.]+ m of wall run, [0-9.]+ m² of openings deducted/,
    );
  });
});

describe("building template inside the plastering calculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("plasters the measured wall area after openings", () => {
    renderPage("plastering");
    applyFirstTemplate();
    fireEvent.click(screen.getByRole("button", { name: /calculate/i }));
    const plastered = screen.queryByText(/Net wall area|plastered area/i);
    expect(plastered).toBeTruthy();
  });

  it("prices one face as an external render, not internal plaster", () => {
    renderPage("plastering");
    applyFirstTemplate();
    fireEvent.change(screen.getByLabelText(/faces to plaster/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /calculate/i }));
    const note = screen.getByText(/priced as an external render/i);
    expect(note.textContent).toMatch(/1 face priced as an external render/i);
  });

  it("prices two faces as internal plaster", () => {
    renderPage("plastering");
    applyFirstTemplate();
    fireEvent.click(screen.getByRole("button", { name: /calculate/i }));
    expect(screen.getByText(/priced as internal plaster/i)).toBeTruthy();
  });
});

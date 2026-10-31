// The masonry calculator must reach users with the leaf basis it was given at
// engine level, and must open on the wall China actually builds: a 240 mm wall
// of 115 mm bricks (115 + 10 + 115). These tests assert the page, not the
// engine, so a regression in the wiring shows up here.

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const marketState = vi.hoisted(() => ({ code: "CN" }));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    market: {
      marketCode: marketState.code,
      country_name: marketState.code === "CN" ? "China" : "United States",
    },
    availableMarkets: [
      { country_code: "CN", country_name: "China" },
      { country_code: "US", country_name: "United States" },
    ],
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
      <StandaloneTakeoffPage initialEngine="masonry" />
    </MemoryRouter>,
  );
}

describe("Chinese masonry calculator", () => {
  beforeEach(() => {
    localStorage.clear();
    marketState.code = "CN";
  });

  it("opens on the 240 mm wall China actually builds", () => {
    renderPage();
    const build = screen.getByLabelText(/Wall build-up/i) as HTMLSelectElement;
    expect(build.value).toBe("2");
    expect(
      screen.getByRole("option", { name: "2 leaves (240 mm)" }),
    ).toBeInTheDocument();
  });

  it("labels each build-up by the thickness it occupies, joints included", () => {
    renderPage();
    // 1 x 115 mm, and 3 x 115 plus the two 10 mm joints between them = 365 mm.
    expect(
      screen.getByRole("option", { name: "1 leaf (115 mm)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "3 leaves (365 mm)" }),
    ).toBeInTheDocument();
  });

  it("reports the rate per leaf and across all leaves, not just one number", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Wall length/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Wall height/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));

    // 240 x 63 mm module = 63.49 units per m2 per leaf, doubled for two leaves.
    expect(screen.getByText("Units per m² (per leaf)")).toBeInTheDocument();
    expect(screen.getByText("126.98")).toBeInTheDocument();
    expect(screen.getByText("Wall leaves")).toBeInTheDocument();
  });

  it("lets the user drop to a half brick wall and halves the count", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/Wall length/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/Wall height/i), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText(/Wall build-up/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    // At one leaf the per-leaf and all-leaves rates are the same number, so
    // assert the absence of the doubled figure and the presence of the single.
    expect(screen.getAllByText("63.49").length).toBeGreaterThan(0);
    expect(screen.queryByText("126.98")).not.toBeInTheDocument();
  });

  it("keeps single leaf as the default everywhere except China and the UK", () => {
    // The two-leaf default is a China and UK convention, not a global one. A
    // US block wall is laid single leaf and must not be doubled.
    marketState.code = "US";
    renderPage();
    expect(
      (screen.getByLabelText(/Wall build-up/i) as HTMLSelectElement).value,
    ).toBe("1");
    // Switching to China moves it to the 240 mm wall the market builds.
    fireEvent.change(screen.getByLabelText(/Market/i), {
      target: { value: "CN" },
    });
    expect(
      (screen.getByLabelText(/Wall build-up/i) as HTMLSelectElement).value,
    ).toBe("2");
    expect(
      screen.getByRole("option", { name: "2 leaves (240 mm)" }),
    ).toBeInTheDocument();
  });
});

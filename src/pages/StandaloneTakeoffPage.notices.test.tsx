// The masonry engine reports inputs it had to work around. Those notices are
// only worth having if the results panel shows them, so this exercises the
// panel with an engine result that carries one.

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/international/market-context", () => ({
  useSeoOfferCurrency: () => "NGN",
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
  useFaqJsonLd: vi.fn(),
  useSeo: () => {},
  useBreadcrumbJsonLd: () => {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock(
  "@/lib/estimation/masonry-standalone-engine",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/lib/estimation/masonry-standalone-engine")
      >();
    return {
      ...actual,
      calculateMasonryTakeoff: () => ({
        ...actual.calculateMasonryTakeoff({
          marketCode: "NG",
          wallLengthM: 10,
          wallHeightM: 3,
        }),
        notices: [
          {
            code: "openings-exceed-wall",
            message:
              "The openings total 12 m2 against 10 m2 of wall, so the net area is held at 0 m2.",
          },
        ],
      }),
    };
  },
);

import StandaloneTakeoffPage from "./StandaloneTakeoffPage";

describe("takeoff result notices", () => {
  it("shows the engine's notice beside the quantities", () => {
    render(
      <MemoryRouter>
        <StandaloneTakeoffPage initialEngine="masonry" />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Wall length/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Wall height/i), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Calculate/i }));
    expect(
      screen.getByText(/openings total 12 m2 against 10 m2/i),
    ).toBeInTheDocument();
  });
});

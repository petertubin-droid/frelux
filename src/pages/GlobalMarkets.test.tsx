/**
 * Global Markets page tests (static rewrite)
 *
 * The page now serves from BUILTIN_MARKET_PROFILES plus the bundled
 * offline price book — no database. Pin: all markets render with
 * currency/units, coverage counts come from the bundled book,
 * honest absence is disclosed, and higher-coverage markets sort
 * first. The NG reference market keeps its full role mapping.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GlobalMarkets from "./GlobalMarkets";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";

describe("GlobalMarkets page (static)", () => {
  it("renders every builtin market with its currency info", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId(
          `market-card-${BUILTIN_MARKET_PROFILES[0].country_code}`,
        ),
      ).toBeTruthy();
    });
    for (const m of BUILTIN_MARKET_PROFILES) {
      const card = screen.getByTestId(`market-card-${m.country_code}`);
      expect(card).toBeTruthy();
      expect(within(card).getByText(new RegExp(m.country_name))).toBeTruthy();
    }
    expect(screen.getAllByText(/NGN \(₦\)/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/USD \(\$\)/).length).toBeGreaterThan(0);
  });

  it("renders exactly the builtin market count", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByTestId(/^market-card-/).length).toBe(
        BUILTIN_MARKET_PROFILES.length,
      );
    });
  });

  it("renders coverage counts from the bundled book", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getAllByText("Priced materials (bundled book)").length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Material roles mapped").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/POP \/ tile material rows/).length,
    ).toBeGreaterThan(0);
  });

  it("marks the NG reference market as high coverage", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    const ngCard = await waitFor(() => screen.getByTestId("market-card-NG"));
    expect(within(ngCard).getByText("High coverage")).toBeTruthy();
  });

  it("renders honest absence for market-size metrics", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByText(/not yet sourced/i).length).toBeGreaterThan(0);
    });
    expect(
      screen.getAllByText(/We publish figures only when we can cite/i).length,
    ).toBeGreaterThan(0);
  });

  it("sorts higher-coverage markets first (NG before low-coverage markets)", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("market-card-NG")).toBeTruthy();
    });
    const cards = screen
      .getAllByTestId(/^market-card-/)
      .map((el) => el.getAttribute("data-testid")?.replace("market-card-", ""));
    expect(cards).toContain("NG");
    expect(cards).toContain("US");
    // NG (fully role-mapped reference) sorts before a registered-only market
    const ngIdx = cards!.indexOf("NG");
    const lowIdx = cards!.indexOf("CN");
    expect(ngIdx).toBeLessThan(lowIdx);
  });

  it("discloses the bundled book provenance", async () => {
    render(
      <MemoryRouter>
        <GlobalMarkets />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/bundled production price book/i)).toBeTruthy();
    });
  });
});

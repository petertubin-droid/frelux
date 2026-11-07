import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn(), useFaqJsonLd: vi.fn() }));
vi.mock("@/components/seo/ToolFaqs", () => ({
  default: ({ slug }: { slug: string }) => (
    <section data-testid="tool-faqs" data-slug={slug}>
      Frequently asked questions
    </section>
  ),
}));
vi.mock("@/components/ui/AdSlot", () => ({
  default: ({ slotKey }: { slotKey: string }) => (
    <div data-testid={`ad-${slotKey}`} />
  ),
}));
vi.mock("@/components/seo/SeoSections", () => ({
  RelatedTools: () => null,
  CALC_LINKS: { paintCalculator: {}, tileCalc: {}, finishEstimator: {} },
}));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    market: {
      marketCode: "NG",
      currencyCode: "NGN",
      currencySymbol: "₦",
      countryName: "Nigeria",
    },
    preferredLengthUnit: "meters",
    preferredAreaUnit: "sqm",
  }),
}));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => (
    <header>
      <h1>{title}</h1>
    </header>
  ),
}));

import WallpaperCalculator from "./WallpaperCalculator";

describe("WallpaperCalculator page", () => {
  it("renders the estimate and input-linked wallpaper strip diagram", () => {
    render(
      <MemoryRouter>
        <WallpaperCalculator />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Wallpaper Calculator" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: /Wall 1, 3.60 m wide by 3.00 m high, shown as 7 vertical wallpaper drops/,
      }),
    ).toBeTruthy();
    expect(screen.getByText("51,000", { exact: false })).toBeTruthy();
    expect(screen.getByTestId("tool-faqs").getAttribute("data-slug")).toBe(
      "wallpaper-calculator",
    );
    expect(screen.getByTestId("ad-calculator_mid")).toBeTruthy();
    expect(screen.getByTestId("ad-calculator_native")).toBeTruthy();
  });

  it("supports package dimensions, design match choices, and adhesive-free wallpaper", () => {
    render(
      <MemoryRouter>
        <WallpaperCalculator />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/Product package format/), {
      target: { value: "custom" },
    });
    expect(screen.getByLabelText("Product width (m)")).toBeTruthy();
    expect(screen.getByLabelText("Usable package length (m)")).toBeTruthy();
    expect(
      screen.getByLabelText("Physical rolls per priced package"),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Design style & match/), {
      target: { value: "floral" },
    });
    expect(
      screen.getByLabelText(/Pattern repeat/).hasAttribute("disabled"),
    ).toBe(false);

    fireEvent.change(screen.getByLabelText(/Wallpaper material \/ finish/), {
      target: { value: "peel-stick" },
    });
    expect(screen.queryByLabelText(/Adhesive pack/)).toBeNull();
    expect(screen.getByText(/0 packs/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Product package format/), {
      target: { value: "panel" },
    });
    expect(screen.getByLabelText("Panel width (m)")).toBeTruthy();
    expect(screen.getByLabelText("Panel height (m)")).toBeTruthy();
    expect(screen.getByLabelText("Panels per priced set")).toBeTruthy();
  });

  it("adds another measured wall and exposes editable openings", () => {
    render(
      <MemoryRouter>
        <WallpaperCalculator />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add another wall/i }));
    // The wall name appears in the measurement list and in the cut list.
    expect(screen.getAllByText("Wall 2").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Edit opening deduction dimensions/i,
      }),
    );
    expect(screen.getByLabelText("Door width (m)")).toBeTruthy();
  });

  it("lays out a whole room from one preset", () => {
    render(
      <MemoryRouter>
        <WallpaperCalculator />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Bedroom, 4\.2 x 3\.6 m/i }),
    );
    // Four walls at the preset's own dimensions, still editable afterwards.
    expect(screen.getAllByText("Wall 1 (door)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wall 2 (window)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wall 4").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", {
        name: /Wall 1 \(door\), 4\.20 m wide by 2\.70 m high/,
      }),
    ).toBeTruthy();
  });

  it("answers in rolls, shop packages and wall covered", () => {
    render(
      <MemoryRouter>
        <WallpaperCalculator />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        /You need \d+ rolls?, which is \d+ packages? from the shop/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /of wall, with pattern matching and trimming already counted in/i,
      ),
    ).toBeTruthy();
  });
});

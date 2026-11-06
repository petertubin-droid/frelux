import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    market: { marketCode: "NG", currencyCode: "NGN", currencySymbol: "₦", countryName: "Nigeria" },
    preferredLengthUnit: "meters",
    preferredAreaUnit: "sqm",
  }),
}));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => <header><h1>{title}</h1></header>,
}));

import WallpaperCalculator from "./WallpaperCalculator";

describe("WallpaperCalculator page", () => {
  it("renders the estimate and input-linked wallpaper strip diagram", () => {
    render(<MemoryRouter><WallpaperCalculator /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Wallpaper Calculator" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Wall 1, 3.60 m wide by 3.00 m high, shown as 7 vertical wallpaper drops/ })).toBeTruthy();
    expect(screen.getByText("51,000", { exact: false })).toBeTruthy();
  });

  it("adds another measured wall and exposes editable openings", () => {
    render(<MemoryRouter><WallpaperCalculator /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Add another wall/i }));
    expect(screen.getByText("Wall 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Edit opening deduction dimensions/i }));
    expect(screen.getByLabelText("Door width (m)")).toBeTruthy();
  });
});

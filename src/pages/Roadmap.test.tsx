import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Roadmap from "@/pages/Roadmap";

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ market: { countryName: "Nigeria" }, marketCode: "NG" }),
}));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
}));
vi.mock("@/lib/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/i18n")>()),
  useLanguage: () => ({ t: (text: string) => text }),
}));

describe("Roadmap page", () => {
  beforeEach(() => vi.clearAllMocks());

  function renderRoadmap() {
    return render(
      <MemoryRouter>
        <Roadmap />
      </MemoryRouter>,
    );
  }

  it("shows the roadmap sections, market context, and feedback destination", async () => {
    renderRoadmap();
    expect(
      await screen.findByRole("heading", { name: "What’s next for FRELUX?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Up next" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Awaiting evidence" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Exploring" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Roadmap priorities are global. Terminology follows your selected market: Nigeria/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Share feedback" }),
    ).toHaveAttribute("href", "/feedback");
  });

  it("filters roadmap cards by category and keeps the selected filter accessible", async () => {
    renderRoadmap();
    await screen.findByRole("heading", { name: "Reusable building schedules" });
    fireEvent.click(screen.getByRole("button", { name: "Market data" }));
    expect(screen.getByRole("button", { name: "Market data" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Clearer market-data freshness" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Market data validation" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Reusable building schedules" }),
    ).not.toBeInTheDocument();
  });
});

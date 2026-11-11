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

  it("separates shipped work from work that has not been built", async () => {
    renderRoadmap();
    expect(
      await screen.findByRole("heading", { name: "Live now" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Building" }),
    ).toBeInTheDocument();
    // Shipped engineering wins are named, and only where they exist.
    expect(
      screen.getByRole("heading", {
        name: "Vector PDF, DXF and scale-checked takeoff",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Structural engine suite" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Nigerian building code and NIS 444-1 reference",
      }),
    ).toBeInTheDocument();
    // Accounting export has no code behind it yet, so it must not read as live.
    const accounting = screen.getByRole("heading", {
      name: "QuickBooks and Xero accounting export",
    });
    expect(accounting.closest("article")).toHaveTextContent("Planned");
    expect(accounting.closest("article")).toHaveTextContent(
      "does not exist yet",
    );
  });

  it("states no promised release date anywhere on the page", async () => {
    const { container } = renderRoadmap();
    await screen.findByRole("heading", { name: "Live now" });
    const text = container.textContent ?? "";
    expect(text).toContain("not promised release dates");
    // A quarter or a year target would be a promise this page cannot keep.
    expect(text).not.toMatch(/Q[1-4]\s*20\d\d/);
    expect(text).not.toMatch(/expected (in|by)\s+20\d\d/i);
    expect(text).not.toMatch(/deliver(y|ed) (in|by)\s+20\d\d/i);
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

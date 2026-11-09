/**
 * TV console page tests.
 *
 * The panel and packing maths is covered by
 * src/lib/tv-console/__tests__/calculator.test.ts. These pin the page wiring
 * that used to hide every refusal: the live estimate, and the exact reason
 * the engine gave when it refused a configuration.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TvConsoleCalculator from "./TvConsoleCalculator";

vi.mock("@/lib/seo", () => ({
  useSeo: () => undefined,
  useFaqJsonLd: () => undefined,
  useBreadcrumbJsonLd: () => undefined,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("@/lib/international/market-context", () => ({
  useCurrencyCode: () => "NGN",
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <TvConsoleCalculator />
    </MemoryRouter>,
  );

describe("TV console page", () => {
  it("estimates a default console on load", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.queryByTestId("tv-console-reason")).not.toBeInTheDocument();
  });

  it("shows the engine's exact refusal instead of a generic guess", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });

    // Zero depth is refused by the engine with a specific sentence. The page
    // used to discard that sentence and print a list of candidate mistakes.
    fireEvent.change(screen.getByLabelText(/^Depth$/i), {
      target: { value: "0" },
    });

    const reason = await screen.findByTestId("tv-console-reason");
    expect(reason.textContent).toMatch(
      /Depth must be a positive dimension up to \d+ mm/i,
    );
    expect(reason.textContent).not.toMatch(
      /Check dimensions, panel thickness/i,
    );

    // Restoring a valid depth brings the estimate back with no residue.
    fireEvent.change(screen.getByLabelText(/^Depth$/i), {
      target: { value: "450" },
    });
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.queryByTestId("tv-console-reason")).not.toBeInTheDocument();
  });

  it("explains a back panel thicker than the carcass depth", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Depth$/i), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText(/^Back panel thickness$/i), {
      target: { value: "60" },
    });

    const reason = await screen.findByTestId("tv-console-reason");
    expect(reason.textContent).toMatch(/back thickness by at least 100 mm/i);
  });

  it("asks for width, height and depth first and keeps joinery in build details", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });
    expect(
      screen.getByRole("heading", { name: /Size and layout/i }),
    ).toBeTruthy();
    expect(screen.getByText(/Build details/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Width$/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Depth$/i)).toBeTruthy();
  });

  it("says what the unit needs in plain words", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.getByText(/needs \d+ boards? of 18 mm/i)).toBeTruthy();
    expect(screen.getByText(/m of edge banding/i)).toBeTruthy();
  });

  it("reads the layout back in correct plural English", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });
    // Two shelves, one bay: the sentence used to print "2 shelfves".
    const summary = screen.getByText(/wide unit with .* needs \d+ board/);
    expect(summary.textContent).toContain("2 shelves");
    expect(summary.textContent).not.toMatch(/shelfves/);
    expect(
      screen.getByRole("heading", { name: /What you need to buy/i }),
    ).toBeTruthy();
  });

  it("pages the twenty presets six at a time", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });

    const nav = screen.getByRole("navigation", {
      name: /console preset pages/i,
    });
    expect(nav.textContent).toMatch(/Page 1 of 4/);
    expect(screen.getByText("Minimalist Japandi Slats")).toBeInTheDocument();
    // Page one holds six cards; the twentieth preset is not among them.
    expect(screen.queryByText("Slatted Room Divider")).not.toBeInTheDocument();

    const next = screen.getByRole("button", { name: /next/i });
    fireEvent.click(next);
    await waitFor(() => {
      expect(
        screen.getByRole("navigation", { name: /console preset pages/i })
          .textContent,
      ).toMatch(/Page 2 of 4/);
    });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText("Slatted Room Divider")).toBeInTheDocument();
    });
    // The last page disables Next so the control cannot walk past the end.
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    await waitFor(() => {
      expect(
        screen.getByRole("navigation", { name: /console preset pages/i })
          .textContent,
      ).toMatch(/Page 3 of 4/);
    });
  });

  it("applies a media-wall preset's panelling to the estimate", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.queryAllByText(/Board packing:/i).length).toBeGreaterThan(
        0,
      );
    });

    // Marble & Gold is the eleventh preset, so it is on page two.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(
        screen.getByText("Marble & Gold Feature Wall"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Marble & Gold Feature Wall"));
    await waitFor(() => {
      // 2600 mm wide x 1600 mm panelling = 4.16 m2, raised as its own line.
      expect(screen.queryAllByText(/Wall panelling/i).length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.queryByTestId("tv-console-reason")).not.toBeInTheDocument();
  });
});

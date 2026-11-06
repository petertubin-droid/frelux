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
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { CreditsProvider } from "@/lib/credits-context";
import { CurrencyProvider } from "@/lib/international/currency-context";
import { ToastProvider } from "@/components/ui/Toast";
import Layout from "@/components/layout/Layout";
import MarketplaceLayout from "@/components/marketplace/MarketplaceLayout";
import MarketplaceHome from "@/pages/marketplace/MarketplaceHome";

describe("marketplace chrome duplication regression", () => {
  it("renders exactly one footer when marketplace nests inside the public Layout", async () => {
    await act(async () => {
      render(
      <ToastProvider>
        <AuthProvider>
      <CreditsProvider>
      <CurrencyProvider>
        <MemoryRouter initialEntries={["/marketplace"]}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/marketplace"
                element={<MarketplaceLayout />}
              >
                <Route index element={<MarketplaceHome />} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </CurrencyProvider>
      </CreditsProvider>
      </AuthProvider>
      </ToastProvider>,
      );
    });
    await new Promise((r) => setTimeout(r, 500));
    const footers = screen.getAllByRole("contentinfo");
    expect(footers.length).toBe(1);
  });
});

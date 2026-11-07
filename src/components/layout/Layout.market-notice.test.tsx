import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { CreditsProvider } from "@/lib/credits-context";
import { CurrencyProvider } from "@/lib/international/currency-context";
import { ToastProvider } from "@/components/ui/Toast";
import Layout from "@/components/layout/Layout";

const NOTICE = "Market estimate notice";

async function renderLayoutAt(path: string) {
  await act(async () => {
    render(
      <ToastProvider>
        <AuthProvider>
          <CreditsProvider>
            <CurrencyProvider>
              <MemoryRouter initialEntries={[path]}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="*" element={<div>page</div>} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </CurrencyProvider>
          </CreditsProvider>
        </AuthProvider>
      </ToastProvider>,
    );
  });
}

describe("market caveat placement in the shell", () => {
  it("does not appear on the homepage", async () => {
    await renderLayoutAt("/");
    expect(screen.queryByRole("note", { name: NOTICE })).toBeNull();
  });

  it("does not appear on the rewards screen", async () => {
    await renderLayoutAt("/rewards");
    expect(screen.queryByRole("note", { name: NOTICE })).toBeNull();
  });

  it("appears on a calculator page", async () => {
    await renderLayoutAt("/paint-calculator");
    expect(screen.queryByRole("note", { name: NOTICE })).toBeTruthy();
  });
});

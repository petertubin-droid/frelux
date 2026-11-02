import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrencySwitcher } from "@/components/ui/CurrencySwitcher";

const ctx = {
  code: "NGN",
  converting: false,
  rateDescription: null as string | null,
  rateConfigured: vi.fn(() => true),
  config: { enabled: true, rates: { USD: 0.00065 } } as any,
  setCurrency: vi.fn(),
};
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ctx,
}));

describe("CurrencySwitcher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers the selector even when no owner rate table is enabled", () => {
    const restore = ctx.config;
    (ctx as any).config = null;
    render(<CurrencySwitcher compact />);
    expect(screen.getByRole("button", { name: /currency/i })).toBeTruthy();
    (ctx as any).config = restore ?? { enabled: true, rates: {} };
  });

  it("lists every currency the engine supports", () => {
    render(<CurrencySwitcher inline />);
    fireEvent.click(screen.getByRole("button", { name: /change currency/i }));
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "");
    expect(labels.some((t) => t.includes("Nigerian Naira"))).toBe(true);
    expect(labels.some((t) => t.includes("UAE Dirham"))).toBe(true);
    expect(labels.some((t) => t.includes("South African Rand"))).toBe(true);
  });

  it("shows the currency toggle when enabled (inline mode)", () => {
    const { container } = render(<CurrencySwitcher inline />);
    expect(
      screen.getByRole("button", { name: /change currency/i }),
    ).toBeTruthy();
    expect(container).toBeTruthy();
  });

  it("opens the list and switches currency through the context", () => {
    render(<CurrencySwitcher inline />);
    fireEvent.click(screen.getByRole("button", { name: /change currency/i }));
    expect(ctx.setCurrency).not.toHaveBeenCalled();
    const usdButton = screen
      .getAllByRole("button")
      .find((b) => (b.textContent ?? "").includes("US Dollar"));
    expect(usdButton).toBeTruthy();
    expect(
      screen.getByText(/never overwritten|stay in the currency/i),
    ).toBeTruthy();
    fireEvent.click(usdButton!);
    expect(ctx.setCurrency).toHaveBeenCalledWith("USD");
  });
});

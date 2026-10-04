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

  it("renders nothing until the owner enables display currencies", () => {
    const disabled = { ...ctx, config: null };
    const restore = ctx.config;
    (ctx as any).config = null;
    const { container, unmount } = render(<CurrencySwitcher />);
    expect(container.firstChild).toBeNull();
    unmount();
    (ctx as any).config = restore ?? { enabled: true, rates: {} };
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
      screen.getByText(/Estimates always calculate in Naira/),
    ).toBeTruthy();
    fireEvent.click(usdButton!);
    expect(ctx.setCurrency).toHaveBeenCalledWith("USD");
  });
});

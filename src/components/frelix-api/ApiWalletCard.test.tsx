import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/Toast";
import ApiWalletCard from "./ApiWalletCard";
import type { ApiWalletSummary } from "@/lib/frelix-api/portal-client";

const wallet = (over: Partial<ApiWalletSummary> = {}): ApiWalletSummary => ({
  balance_usd: 12.5,
  auto_topup_enabled: false,
  auto_topup_threshold_usd: 5,
  auto_topup_amount_usd: 20,
  ...over,
});

const renderCard = (props: Parameters<typeof ApiWalletCard>[0] = {}) =>
  render(
    <ToastProvider>
      <ApiWalletCard {...props} />
    </ToastProvider>,
  );

describe("ApiWalletCard", () => {
  it("shows the balance to the cent", async () => {
    renderCard({ loadWallet: async () => wallet({ balance_usd: 12.5 }) });
    expect(await screen.findByText("$12.50")).toBeTruthy();
  });

  it("treats a missing wallet row as a zero balance", async () => {
    renderCard({ loadWallet: async () => null });
    await waitFor(() => expect(screen.getByText("$0.00")).toBeTruthy());
  });

  it("explains the 402 when the balance is zero", async () => {
    renderCard({ loadWallet: async () => wallet({ balance_usd: 0 }) });
    await waitFor(() =>
      expect(screen.getByText(/refused with a 402/i)).toBeTruthy(),
    );
  });

  it("does not promise a 402 to a funded wallet", async () => {
    renderCard({ loadWallet: async () => wallet({ balance_usd: 40 }) });
    await waitFor(() => expect(screen.getByText("$40.00")).toBeTruthy());
    expect(screen.queryByText(/refused with a 402/i)).toBeNull();
  });

  it("tops up the amount the caller picked", async () => {
    const startTopup = vi.fn(async () => ({
      authorization_url: "https://checkout.test/x",
    }));
    // jsdom cannot navigate; record the attempt instead of following it.
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, assign },
    });

    renderCard({ loadWallet: async () => wallet(), startTopup });
    await waitFor(() => expect(screen.getByText("$12.50")).toBeTruthy());

    await userEvent.click(screen.getByRole("button", { name: "$50" }));
    await userEvent.click(screen.getByRole("button", { name: /Add \$50\.00/ }));

    expect(startTopup).toHaveBeenCalledWith(50);
    expect(assign).toHaveBeenCalledWith("https://checkout.test/x");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });

  it("stays on the page when the server refuses to start a checkout", async () => {
    const startTopup = vi.fn(async () => ({
      error: "Maximum top-up is $2000",
    }));
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, assign },
    });

    renderCard({ loadWallet: async () => wallet(), startTopup });
    await waitFor(() => expect(screen.getByText("$12.50")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: /Add \$25\.00/ }));

    expect(startTopup).toHaveBeenCalledWith(25);
    expect(assign).not.toHaveBeenCalled();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });

  it("states auto top-up only when it is enabled", async () => {
    const { unmount } = renderCard({
      loadWallet: async () => wallet({ auto_topup_enabled: false }),
    });
    await waitFor(() => expect(screen.getByText("$12.50")).toBeTruthy());
    expect(screen.queryByText(/Auto top-up adds/i)).toBeNull();
    unmount();

    renderCard({
      loadWallet: async () =>
        wallet({
          auto_topup_enabled: true,
          auto_topup_amount_usd: 20,
          auto_topup_threshold_usd: 5,
        }),
    });
    // Stored preference, not a working feature: the card must not claim a
    // charge that no code performs.
    await waitFor(() =>
      expect(screen.getByText(/Auto top-up is requested/i)).toBeTruthy(),
    );
    expect(screen.getByText(/not active/i)).toBeTruthy();
    expect(screen.queryByText(/Auto top-up adds/i)).toBeNull();
  });
});

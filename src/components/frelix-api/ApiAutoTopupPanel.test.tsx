import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/Toast";
import ApiAutoTopupPanel, {
  AUTO_TOPUP_CONSENT_VERSION,
} from "./ApiAutoTopupPanel";
import type {
  ApiPaymentMethod,
  ApiWalletSummary,
} from "@/lib/frelix-api/portal-client";

const CARD: ApiPaymentMethod = {
  id: "card-1",
  brand: "VISA",
  last4: "0345",
  exp_month: 9,
  exp_year: 2032,
  is_default: true,
};

const wallet = (over: Partial<ApiWalletSummary> = {}): ApiWalletSummary => ({
  balance_usd: 3,
  auto_topup_enabled: false,
  auto_topup_threshold_usd: 5,
  auto_topup_amount_usd: 20,
  auto_topup_consent_at: null,
  auto_topup_disabled_reason: null,
  auto_topup_card_id: null,
  ...over,
});

function renderPanel(
  props: Partial<Parameters<typeof ApiAutoTopupPanel>[0]> = {},
) {
  const save = vi.fn(async () => ({ enabled: true as const }));
  render(
    <ToastProvider>
      <ApiAutoTopupPanel
        wallet={wallet()}
        loadCards={async () => [CARD]}
        save={save}
        {...props}
      />
    </ToastProvider>,
  );
  return { save };
}

describe("ApiAutoTopupPanel", () => {
  it("will not enable charging before consent is agreed to", async () => {
    const { save } = renderPanel();
    await screen.findByText(/I agree that FRELUX may charge/i);
    await userEvent.click(
      screen.getByRole("button", { name: /Turn on auto top-up/i }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("consent"),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("sends the agreed version of the consent with the setting", async () => {
    const { save } = renderPanel();
    await userEvent.click(await screen.findByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: /Turn on auto top-up/i }),
    );

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({
      enabled: true,
      thresholdUsd: 5,
      amountUsd: 20,
      cardId: "card-1",
      consentVersion: AUTO_TOPUP_CONSENT_VERSION,
    });
  });

  it("refuses a threshold that one charge would retrigger", async () => {
    const { save } = renderPanel();
    const threshold = await screen.findByLabelText("Threshold");
    await userEvent.clear(threshold);
    await userEvent.type(threshold, "20");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: /Turn on auto top-up/i }),
    );

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("below the amount"),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps the amount inside the automatic range", async () => {
    const { save } = renderPanel();
    const amount = await screen.findByLabelText("Amount");
    await userEvent.clear(amount);
    await userEvent.type(amount, "500");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: /Turn on auto top-up/i }),
    );

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("at most"),
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("turns off in one step, with no consent needed", async () => {
    const { save } = renderPanel({
      wallet: wallet({
        auto_topup_enabled: true,
        auto_topup_consent_at: "2026-10-01T00:00:00Z",
        auto_topup_card_id: "card-1",
      }),
    });
    await userEvent.click(
      await screen.findByRole("button", { name: /Turn off auto top-up/i }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      ),
    );
  });

  it("shows why it switched itself off", async () => {
    renderPanel({
      wallet: wallet({
        auto_topup_disabled_reason:
          "Switched off after two charges in a row were declined.",
      }),
    });
    expect(screen.getByText(/Switched off after two charges/i)).toBeTruthy();
  });

  it("says plainly that a card is saved by topping up, when none is saved", async () => {
    renderPanel({ loadCards: async () => [] });
    expect(await screen.findByText(/Top up once by card/i)).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

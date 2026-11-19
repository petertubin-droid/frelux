import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const state = { configured: false, loadFails: false };
const renderWidget = vi.fn(
  (_container: HTMLElement, _options: Record<string, unknown>) => "widget-1",
);
const removeWidget = vi.fn();

vi.mock("@/lib/turnstile", () => ({
  get turnstileConfigured() {
    return state.configured;
  },
  TURNSTILE_SITE_KEY: "0x4AAAAAAA_test",
  loadTurnstile: () =>
    state.loadFails
      ? Promise.reject(new Error("turnstile script blocked"))
      : Promise.resolve({
          render: renderWidget,
          reset: vi.fn(),
          remove: removeWidget,
        }),
}));

import { TurnstileWidget } from "./TurnstileWidget";

describe("TurnstileWidget", () => {
  it("renders nothing and reports no token when no site key is configured", async () => {
    state.configured = false;
    const onToken = vi.fn();
    const { container } = render(
      <TurnstileWidget action="contact" onToken={onToken} />,
    );
    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(onToken).toHaveBeenCalledWith(null));
    expect(renderWidget).not.toHaveBeenCalled();
  });

  it("renders one widget for the action and hands the token back", async () => {
    state.configured = true;
    renderWidget.mockClear();
    const onToken = vi.fn();
    const { container } = render(
      <TurnstileWidget action="inquiry" onToken={onToken} />,
    );

    await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
    const host = container.querySelector('[data-turnstile-action="inquiry"]');
    expect(host).not.toBeNull();

    const options = renderWidget.mock.calls[0][1] as unknown as {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
    };
    expect(options.sitekey).toBe("0x4AAAAAAA_test");
    expect(options.action).toBe("inquiry");

    options.callback("solved-token");
    expect(onToken).toHaveBeenCalledWith("solved-token");
    options["expired-callback"]();
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("cleans the widget up on unmount", async () => {
    state.configured = true;
    renderWidget.mockClear();
    removeWidget.mockClear();
    const { unmount } = render(
      <TurnstileWidget action="contact" onToken={vi.fn()} />,
    );
    await waitFor(() => expect(renderWidget).toHaveBeenCalled());
    unmount();
    expect(removeWidget).toHaveBeenCalledWith("widget-1");
  });

  it("reports a blocked script so the page can explain the disabled button", async () => {
    state.configured = true;
    state.loadFails = true;
    const onToken = vi.fn();
    const onUnavailable = vi.fn();
    render(
      <TurnstileWidget
        action="signin"
        onToken={onToken}
        onUnavailable={onUnavailable}
      />,
    );

    await waitFor(() =>
      expect(onUnavailable).toHaveBeenCalledWith("load-failed"),
    );
    expect(onToken).toHaveBeenCalledWith(null);
    state.loadFails = false;
  });

  it("reports a challenge error and a timeout from the widget callbacks", async () => {
    state.configured = true;
    renderWidget.mockClear();
    const onUnavailable = vi.fn();
    render(
      <TurnstileWidget
        action="signin"
        onToken={vi.fn()}
        onUnavailable={onUnavailable}
      />,
    );

    await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
    const options = renderWidget.mock.calls[0][1] as unknown as {
      "error-callback": () => void;
      "timeout-callback": () => void;
    };
    options["error-callback"]();
    expect(onUnavailable).toHaveBeenCalledWith("challenge-error");
    options["timeout-callback"]();
    expect(onUnavailable).toHaveBeenCalledWith("timeout");
  });
});

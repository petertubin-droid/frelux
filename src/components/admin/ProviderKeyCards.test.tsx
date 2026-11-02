// =========================================================
// PROVIDER KEY CARDS TESTS (Integration Center key slots)
//
// Contract pinned here:
//   * one card per PROVIDER_REGISTRY entry, each with its
//     paste slot and honest status chips (Server-side only /
//     Client-safe key, Live / Slot ready)
//   * stored keys render MASKED (••••last4) — never the raw
//     value, which the list query never loads
//   * pasting + saving calls saveIntegrationSecret; an empty
//     draft never triggers a save
//   * a saved/loaded key shows Active/Disable or
//     Enable controls; slot-ready providers are labelled
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProviderKeyCards } from "./ProviderKeyCards";
import {
  PROVIDER_REGISTRY,
  type IntegrationSecretMeta,
} from "@/lib/integrations/provider-keys";

const listMock = vi.fn();
const saveMock = vi.fn();
const statusMock = vi.fn();

// Keep the REAL registry (tests must follow production) and only
// mock the network functions.
vi.mock("@/lib/integrations/provider-keys", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/integrations/provider-keys")>();
  return {
    ...actual,
    listIntegrationSecrets: (...a: unknown[]) => listMock(...(a as [])),
    saveIntegrationSecret: (...a: unknown[]) => saveMock(...(a as [])),
    setIntegrationSecretStatus: (...a: unknown[]) => statusMock(...(a as [])),
  };
});

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

function secretMeta(
  id: string,
  last4: string,
  status: "active" | "disabled" = "active",
): IntegrationSecretMeta {
  return {
    provider_id: id,
    key_last4: last4,
    status,
    updated_at: new Date("2026-10-14T12:00:00Z").toISOString(),
    created_at: new Date("2026-10-14T12:00:00Z").toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  listMock.mockResolvedValue([]);
});

describe("ProviderKeyCards", () => {
  it("renders a paste slot for every registered provider", async () => {
    render(<ProviderKeyCards />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    for (const p of PROVIDER_REGISTRY) {
      expect(screen.getByLabelText(`${p.label} API key`)).toBeTruthy();
      expect(screen.getByText(p.label)).toBeTruthy();
    }
  });

  it("labels exposure class and consumption state honestly", async () => {
    render(<ProviderKeyCards />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    // resend, web-push-private, open-exchange-rates
    expect(screen.getAllByText("Server-side only").length).toBe(3);
    // openweather, web-push-public
    expect(screen.getAllByText("Client-safe key").length).toBe(2);
    expect(screen.getByText("Slot ready")).toBeTruthy();
    // resend, openweather, web-push-public, web-push-private
    expect(screen.getAllByText("Live").length).toBe(4);
  });

  it("shows masked last4 and Disable for an active stored key, never the raw value", async () => {
    listMock.mockResolvedValue([secretMeta("openweather", "89ab")]);
    render(<ProviderKeyCards />);
    await waitFor(() => expect(screen.getByText("••••89ab")).toBeTruthy());
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.queryByText("••••89ab")?.textContent).not.toMatch(
      /[a-z0-9]{12,}/,
    );
    expect(screen.getByRole("button", { name: "Disable" })).toBeTruthy();
  });

  it("offers Enable for a disabled key", async () => {
    listMock.mockResolvedValue([secretMeta("resend", "xyz1", "disabled")]);
    render(<ProviderKeyCards />);
    await waitFor(() => expect(screen.getByText("Disabled")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Enable" }));
    await waitFor(() =>
      expect(statusMock).toHaveBeenCalledWith("resend", "active"),
    );
  });

  it("saves a pasted key via saveIntegrationSecret and clears the draft", async () => {
    saveMock.mockResolvedValue(secretMeta("resend", "9911"));
    render(<ProviderKeyCards />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    const input = screen.getByLabelText("Resend API key");
    fireEvent.change(input, { target: { value: "re_secret9911" } });
    // Registry order: resend is the first card's save button.
    fireEvent.click(
      screen.getAllByRole("button", { name: /save & activate|rotate key/i })[0],
    );
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith("resend", "re_secret9911"),
    );
    await waitFor(() => expect(input.getAttribute("value")).toBe(""));
    expect(screen.getByText("••••9911")).toBeTruthy();
  });

  it("never saves an empty draft", async () => {
    render(<ProviderKeyCards />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    const btns = screen.getAllByRole("button", {
      name: /save & activate|rotate key/i,
    });
    // Empty drafts disable every save button — no provider can fire a save.
    for (const b of btns) expect(b.hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByText("No key").length).toBe(5);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("surfaces a load failure notice instead of fake state", async () => {
    listMock.mockRejectedValue(new Error("RLS refused"));
    render(<ProviderKeyCards />);
    await waitFor(() => expect(screen.getByText(/RLS refused/)).toBeTruthy());
    expect(screen.queryByLabelText("Resend API key")).toBeNull();
  });
});

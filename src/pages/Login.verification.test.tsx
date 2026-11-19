import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * The sign-in form when the bot check cannot run at all.
 *
 * The submit button is disabled while a token is missing, so a blocked script
 * used to leave a button that does nothing and says nothing. The page must name
 * the cause and tell the visitor what to do about it, which on a phone is
 * turning the ad-blocker off in settings.
 */

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
// A configured key whose script never arrives: exactly what an ad-blocker does.
vi.mock("@/lib/turnstile", () => ({
  turnstileConfigured: true,
  TURNSTILE_SITE_KEY: "0x4AAAAAAA_test",
  TURNSTILE_SCRIPT_URL: "https://challenges.cloudflare.com/turnstile/v0/api.js",
  loadTurnstile: () => Promise.reject(new Error("turnstile script blocked")),
  verifyTurnstileToken: vi.fn(async () => ({ ok: false, reason: "missing" })),
  turnstileErrorMessage: () => "Complete the verification check to continue.",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/Login")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Login when the bot check is blocked", () => {
  it("says verification could not load and names the ad-blocker step", async () => {
    await renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/verification couldn't load/i);
    expect(alert.textContent).toMatch(/ad-blocker/i);
    expect(alert.textContent).toMatch(/phone settings/i);
    expect(alert.textContent).toMatch(/reload this page and try again/i);
  });

  it("still explains itself rather than leaving a silent dead button", async () => {
    await renderPage();
    const submit = await screen.findByRole("button", { name: /sign in/i });
    expect(submit).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(
        /disable your ad-blocker/i,
      ),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/useCookieConsent", () => ({
  useCookieConsent: vi.fn(() => ({
    showBanner: true,
    accept: vi.fn(),
    reject: vi.fn(),
    save: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

vi.mock("@/lib/cookie-consent", () => ({
  COOKIE_CATEGORIES: ["essential", "analytics", "advertising"] as const,
}));

import { useCookieConsent } from "@/lib/useCookieConsent";
import { CookieBanner } from "@/components/ui/CookieBanner";

function renderBanner() {
  return render(
    <MemoryRouter>
      <CookieBanner />
    </MemoryRouter>,
  );
}

describe("CookieBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCookieConsent as any).mockReturnValue({
      showBanner: true,
      accept: vi.fn(),
      reject: vi.fn(),
      save: vi.fn(),
      dismiss: vi.fn(),
    });
  });

  it("returns null when showBanner is false", () => {
    (useCookieConsent as any).mockReturnValue({
      showBanner: false,
      accept: vi.fn(),
      reject: vi.fn(),
      save: vi.fn(),
      dismiss: vi.fn(),
    });
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it("shows banner with title", () => {
    renderBanner();
    const title = document.getElementById("cookie-banner-title");
    expect(title).toBeTruthy();
  });

  it("has Accept All button", () => {
    renderBanner();
    expect(screen.getByText("Accept All")).toBeTruthy();
  });

  it("has Reject Non-Essential button", () => {
    renderBanner();
    expect(screen.getByText("Reject Non-Essential")).toBeTruthy();
  });

  it("calls accept when Accept All clicked", () => {
    const accept = vi.fn();
    (useCookieConsent as any).mockReturnValue({
      showBanner: true,
      accept,
      reject: vi.fn(),
      save: vi.fn(),
      dismiss: vi.fn(),
    });
    renderBanner();
    fireEvent.click(screen.getByText("Accept All"));
    expect(accept).toHaveBeenCalled();
  });

  it("calls reject when Reject Non-Essential clicked", () => {
    const reject = vi.fn();
    (useCookieConsent as any).mockReturnValue({
      showBanner: true,
      accept: vi.fn(),
      reject,
      save: vi.fn(),
      dismiss: vi.fn(),
    });
    renderBanner();
    fireEvent.click(screen.getByText("Reject Non-Essential"));
    expect(reject).toHaveBeenCalled();
  });

  it("has Customize button", () => {
    renderBanner();
    expect(screen.getByText("Customize")).toBeTruthy();
  });
});

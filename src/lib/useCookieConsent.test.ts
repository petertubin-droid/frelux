import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCookieConsent } from "@/lib/useCookieConsent";

// Mock cookie-consent functions
vi.mock("@/lib/cookie-consent", () => ({
  getStoredConsent: vi.fn(() => null),
  acceptAll: vi.fn((src: string) => ({
    version: 2,
    categories: {
      essential: true,
      analytics: true,
      advertising: true,
    },
    timestamp: Date.now(),
    source: src,
  })),
  rejectAll: vi.fn((src: string) => ({
    version: 2,
    categories: {
      essential: true,
      analytics: false,
      advertising: false,
    },
    timestamp: Date.now(),
    source: src,
  })),
  saveConsent: vi.fn((cats: Record<string, boolean>, src: string) => ({
    version: 2,
    categories: {
      essential: cats.essential ?? true,
      analytics: cats.analytics ?? false,
      advertising: cats.advertising ?? false,
    },
    timestamp: Date.now(),
    source: src,
  })),
  withdrawConsent: vi.fn(),
  COOKIE_CATEGORIES: [
    {
      key: "essential",
      label: "Essential",
      description: "Required",
      required: true,
    },
    {
      key: "analytics",
      label: "Analytics",
      description: "Optional",
      required: false,
    },
    {
      key: "advertising",
      label: "Advertising",
      description: "Optional",
      required: false,
    },
  ],
}));

import {
  getStoredConsent,
  acceptAll,
  rejectAll,
  saveConsent,
  withdrawConsent,
} from "@/lib/cookie-consent";

describe("useCookieConsent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredConsent).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null consent and showBanner=true when no stored consent", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBeNull();
    expect(result.current.showBanner).toBe(true);
  });

  it("returns stored consent and showBanner=false when consent exists", () => {
    vi.mocked(getStoredConsent).mockReturnValue({
      version: 2,
      categories: { essential: true, analytics: true, advertising: false },
      timestamp: Date.now(),
      source: "settings",
    });
    const { result } = renderHook(() => useCookieConsent());
    // Wait for mount effect
    expect(result.current.consent).toBeTruthy();
    expect(result.current.showBanner).toBe(false);
  });

  it("accept() calls acceptAll and hides banner", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => {
      result.current.accept();
    });
    expect(acceptAll).toHaveBeenCalledWith("banner");
    expect(result.current.showBanner).toBe(false);
    expect(result.current.consent).toBeTruthy();
    expect(result.current.consent?.categories.analytics).toBe(true);
  });

  it("reject() calls rejectAll and hides banner", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => {
      result.current.reject();
    });
    expect(rejectAll).toHaveBeenCalledWith("banner");
    expect(result.current.showBanner).toBe(false);
    expect(result.current.consent?.categories.analytics).toBe(false);
    expect(result.current.consent?.categories.advertising).toBe(false);
  });

  it("save() calls saveConsent with categories", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => {
      result.current.save({
        essential: true,
        analytics: true,
        advertising: false,
      });
    });
    expect(saveConsent).toHaveBeenCalledWith(
      { essential: true, analytics: true, advertising: false },
      "banner",
    );
    expect(result.current.showBanner).toBe(false);
  });

  it("withdraw() calls withdrawConsent and shows banner again", () => {
    const { result } = renderHook(() => useCookieConsent());
    // First accept
    act(() => result.current.accept());
    expect(result.current.showBanner).toBe(false);
    // Then withdraw
    act(() => result.current.withdraw());
    expect(withdrawConsent).toHaveBeenCalled();
    expect(result.current.showBanner).toBe(true);
    expect(result.current.consent).toBeNull();
  });

  it("dismiss() hides banner without saving", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.showBanner).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.showBanner).toBe(false);
    expect(acceptAll).not.toHaveBeenCalled();
    expect(rejectAll).not.toHaveBeenCalled();
  });

  it("listens for external consent change events", () => {
    const { result } = renderHook(() => useCookieConsent());
    // Simulate external change
    vi.mocked(getStoredConsent).mockReturnValue({
      version: 2,
      categories: { essential: true, analytics: false, advertising: false },
      timestamp: Date.now(),
      source: "settings",
    });
    act(() => {
      window.dispatchEvent(new Event("frelux:cookie-consent"));
    });
    expect(result.current.consent).toBeTruthy();
    expect(result.current.showBanner).toBe(false);
  });

  it("listens for storage events", () => {
    const { result } = renderHook(() => useCookieConsent());
    vi.mocked(getStoredConsent).mockReturnValue({
      version: 2,
      categories: { essential: true, analytics: true, advertising: true },
      timestamp: Date.now(),
      source: "settings",
    });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage"));
    });
    expect(result.current.consent?.categories.analytics).toBe(true);
  });
});

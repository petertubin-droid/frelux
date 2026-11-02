import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import {
  cachedConfigFetch,
  clearOfflineConfigCache,
} from "@/lib/estimation/offline-cache";

describe("OfflineIndicator", () => {
  beforeEach(() => {
    clearOfflineConfigCache();
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  it("returns null when online", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("shows banner when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    render(<OfflineIndicator />);
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });

  it("responds to online event", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).not.toBeNull();

    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(container.firstChild).toBeNull();
  });

  it("responds to offline event", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();

    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(container.firstChild).not.toBeNull();
  });

  it("shows the cached configuration date when a config fetch falls back", async () => {
    render(<OfflineIndicator />);

    // seed the cache while online
    await cachedConfigFetch("indicator-test", async () => ({
      data: [1, 2],
      error: null,
    }));

    // go offline and fail - the fallback announces the cached date
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    await cachedConfigFetch("indicator-test", async () => ({
      data: null,
      error: { message: "TypeError: Failed to fetch" },
    }));

    expect(await screen.findByText(/stored configuration from/i)).toBeTruthy();
  });
});

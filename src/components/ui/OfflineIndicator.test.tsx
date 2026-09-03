import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";

describe("OfflineIndicator", () => {
  beforeEach(() => {
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
});

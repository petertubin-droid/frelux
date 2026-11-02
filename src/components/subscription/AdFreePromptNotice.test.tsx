import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdFreePromptNotice from "./AdFreePromptNotice";
import {
  AD_FREE_PROMPT_STORAGE_KEY_DISMISSED,
  isRouteExcluded,
} from "./ad-free-prompt-config";

let mockIsPaid = false;

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isPaid: mockIsPaid,
    isAdmin: false,
    paidStatus: null,
  })),
}));

describe("AdFreePromptNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    mockIsPaid = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("identifies excluded routes correctly", () => {
    expect(isRouteExcluded("/pricing")).toBe(true);
    expect(isRouteExcluded("/pricing/")).toBe(true);
    expect(isRouteExcluded("/admin/dashboard")).toBe(true);
    expect(isRouteExcluded("/checkout")).toBe(true);
    expect(isRouteExcluded("/login")).toBe(true);
    expect(isRouteExcluded("/paint-calculator")).toBe(false);
    expect(isRouteExcluded("/")).toBe(false);
  });

  it("does not render when user has active paid subscription", () => {
    mockIsPaid = true;
    render(
      <MemoryRouter initialEntries={["/paint-calculator"]}>
        <AdFreePromptNotice initialDelayMs={0} />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByLabelText(/ad-free subscription notice/i)).toBeNull();
  });

  it("does not render on excluded route like /pricing", () => {
    mockIsPaid = false;
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <AdFreePromptNotice initialDelayMs={0} />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByLabelText(/ad-free subscription notice/i)).toBeNull();
  });

  it("shows after initial delay and allows dismissal", () => {
    mockIsPaid = false;
    const onDismiss = vi.fn();
    render(
      <MemoryRouter initialEntries={["/paint-calculator"]}>
        <AdFreePromptNotice
          initialDelayMs={5000}
          autoDismissMs={30000}
          onDismiss={onDismiss}
        />
      </MemoryRouter>,
    );

    // Before delay, not visible
    expect(screen.queryByLabelText(/ad-free subscription notice/i)).toBeNull();

    // Advance to trigger delay
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(
      screen.getByLabelText(/ad-free subscription notice/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/tired of advertisements\?/i)).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: /remove ads/i });
    expect(cta).toHaveAttribute("href", "/pricing");

    // Click dismiss button
    const closeBtn = screen.getByLabelText(/dismiss ad-free notice/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByLabelText(/ad-free subscription notice/i)).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Verifies dismissal timestamp was recorded in localStorage
    const saved = window.localStorage.getItem(
      AD_FREE_PROMPT_STORAGE_KEY_DISMISSED,
    );
    expect(saved).not.toBeNull();
  });

  it("auto-dismisses after autoDismissMs", () => {
    mockIsPaid = false;
    render(
      <MemoryRouter initialEntries={["/paint-calculator"]}>
        <AdFreePromptNotice initialDelayMs={1000} autoDismissMs={5000} />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(
      screen.getByLabelText(/ad-free subscription notice/i),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByLabelText(/ad-free subscription notice/i)).toBeNull();
  });

  it("respects dismissal cooldown", () => {
    mockIsPaid = false;
    // Set a recent dismissal in localStorage
    window.localStorage.setItem(
      AD_FREE_PROMPT_STORAGE_KEY_DISMISSED,
      String(Date.now()),
    );

    render(
      <MemoryRouter initialEntries={["/paint-calculator"]}>
        <AdFreePromptNotice initialDelayMs={0} dismissCooldownMs={60000} />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.queryByLabelText(/ad-free subscription notice/i)).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: false })),
}));

vi.mock("@/components/ui/AdSlot", () => ({
  default: () => {
    // Simulate the three render states AdSlot can produce: the
    // resolved wrapper (real unit), the hidden placeholder (nothing
    // can fill) and nothing at all. Controlled per-test below.
    const state = (window as unknown as Record<string, unknown>)
      .__stickyTestAdSlotState as string;
    if (state === "resolved") {
      return (
        <div className="frelux-ad-unit" style={{ height: "60px" }}>
          real ad
        </div>
      );
    }
    if (state === "placeholder") {
      return <div data-ad-reserved="sticky_bottom" className="hidden" />;
    }
    return null;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as Record<string, unknown>).__stickyTestAdSlotState =
    "resolved";
  try {
    sessionStorage.clear();
  } catch {
    // private mode, ignore
  }
});

async function renderSticky() {
  const { StickyBottomAd } = await import("@/components/ui/StickyBottomAd");
  return render(
    <MemoryRouter>
      <StickyBottomAd />
    </MemoryRouter>,
  );
}

describe("StickyBottomAd", () => {
  it("shows the bar only when a real ad unit is rendered inside", async () => {
    (window as unknown as Record<string, unknown>).__stickyTestAdSlotState =
      "resolved";
    const { container, findByText } = await renderSticky();
    expect(await findByText(/real ad/i)).toBeTruthy();
    expect(
      container.querySelector("aside[aria-label='Advertisement']"),
    ).toBeTruthy();
  });

  it("hides the bar while AdSlot is unresolved", async () => {
    (window as unknown as Record<string, unknown>).__stickyTestAdSlotState =
      "unresolved";
    const { container } = await renderSticky();
    // Give the mutation observer a beat to run its initial measure.
    await new Promise((r) => setTimeout(r, 100));
    const bar = container.querySelector<HTMLElement>(
      "aside[aria-label='Advertisement']",
    );
    expect(bar).not.toBeNull();
    expect(bar!.className).toContain("hidden");
    expect(bar!.getAttribute("aria-hidden")).toBe("true");
  });

  it("hides the bar when nothing can fill the slot (hidden placeholder)", async () => {
    (window as unknown as Record<string, unknown>).__stickyTestAdSlotState =
      "placeholder";
    const { container } = await renderSticky();
    await new Promise((r) => setTimeout(r, 100));
    const bar = container.querySelector<HTMLElement>(
      "aside[aria-label='Advertisement']",
    );
    expect(bar).not.toBeNull();
    expect(bar!.className).toContain("hidden");
  });

  it("dismiss hides the bar for the rest of the session", async () => {
    (window as unknown as Record<string, unknown>).__stickyTestAdSlotState =
      "resolved";
    const { container, findByRole } = await renderSticky();
    const close = await findByRole("button", { name: "Close ad" });
    await userEvent.click(close);

    await waitFor(() => {
      expect(
        container.querySelector("aside[aria-label='Advertisement']"),
      ).toBeNull();
    });
    expect(sessionStorage.getItem("frelux_sticky_ad_dismissed")).toBe("1");
  });

  it("stays hidden across mounts within the same session after dismissal", async () => {
    sessionStorage.setItem("frelux_sticky_ad_dismissed", "1");
    const { container } = await renderSticky();
    await new Promise((r) => setTimeout(r, 100));
    expect(
      container.querySelector("aside[aria-label='Advertisement']"),
    ).toBeNull();
  });
});

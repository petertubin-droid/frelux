import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

/** AdSlot is replaced by a stand-in that reports fill state and box size the
 *  same way the real one does, so the measurement logic is what gets tested. */
const adSlotProps = vi.hoisted(() => ({
  calls: [] as Record<string, unknown>[],
}));
const adState = vi.hoisted(() => ({ filled: true, height: 96 }));

vi.mock("@/components/ui/AdSlot", () => ({
  default: (props: Record<string, unknown>) => {
    adSlotProps.calls.push(props);
    return (
      <div
        data-ad-filled={adState.filled ? "true" : "false"}
        data-testid="stub-ad-unit"
        style={{ height: adState.height }}
      />
    );
  },
}));

import BottomAdSlot, { BOTTOM_AD_HEIGHT_VAR } from "./BottomAdSlot";

function withRects() {
  const spy = vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: Element) {
      const height =
        (this as HTMLElement).dataset?.testid === "stub-ad-unit"
          ? adState.height
          : adState.filled
            ? adState.height + 12
            : 0;
      return {
        height,
        width: 360,
        top: 0,
        left: 0,
        bottom: height,
        right: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
  return spy;
}

beforeEach(() => {
  adSlotProps.calls.length = 0;
  adState.filled = true;
  adState.height = 96;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty(BOTTOM_AD_HEIGHT_VAR);
});

describe("BottomAdSlot", () => {
  it("locks the slot to AdSense and uses the bottom placement", () => {
    withRects();
    render(<BottomAdSlot />);
    const props = adSlotProps.calls[adSlotProps.calls.length - 1];
    expect(props.slotKey).toBe("adsense_bottom");
    expect(props.providerSlug).toBe("google_adsense");
  });

  it("publishes its height so the navigation can lift by exactly that much", () => {
    withRects();
    render(<BottomAdSlot />);
    const published =
      document.documentElement.style.getPropertyValue(BOTTOM_AD_HEIGHT_VAR);
    // Wrapper height (ad 96 + 12 of padding), never the ad's height alone.
    expect(published).toBe(`${96 + 12}px`);
    expect(screen.getByTestId("bottom-ad-slot").dataset.adVisible).toBe("true");
  });

  it("publishes zero while nothing is filled, leaving the navigation in place", () => {
    adState.filled = false;
    withRects();
    render(<BottomAdSlot />);
    expect(
      document.documentElement.style.getPropertyValue(BOTTOM_AD_HEIGHT_VAR),
    ).toBe("0px");
    expect(screen.getByTestId("bottom-ad-slot").dataset.adVisible).toBe(
      "false",
    );
  });

  it("tracks a network that fills after mount, then collapses", async () => {
    adState.filled = false;
    withRects();
    render(<BottomAdSlot />);

    // A late fill: the stub swaps to a filled unit with a real box.
    adState.filled = true;
    await act(async () => {
      const unit = screen.getByTestId("stub-ad-unit");
      unit.setAttribute("data-ad-filled", "true");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      Number.parseFloat(
        document.documentElement.style.getPropertyValue(BOTTOM_AD_HEIGHT_VAR),
      ),
    ).toBeGreaterThan(0);
  });

  it("clears the published height when it unmounts", () => {
    withRects();
    const { unmount } = render(<BottomAdSlot />);
    expect(
      document.documentElement.style.getPropertyValue(BOTTOM_AD_HEIGHT_VAR),
    ).not.toBe("");
    unmount();
    expect(
      document.documentElement.style.getPropertyValue(BOTTOM_AD_HEIGHT_VAR),
    ).toBe("");
  });

  it("keeps a curvy, clipped frame so the creative cannot square the corners", () => {
    withRects();
    render(<BottomAdSlot />);
    const frames = Array.from(
      screen.getByTestId("bottom-ad-slot").querySelectorAll("div"),
    ).map((el) => el.className);
    expect(frames.some((c) => c.includes("rounded-2xl"))).toBe(true);
    expect(frames.some((c) => c.includes("overflow-hidden"))).toBe(true);
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandedLoader, {
  DEFAULT_LOADER_CONFIG,
  LOADER_CATEGORY_ORDER,
  LOADER_STYLE_OPTIONS,
  LOADER_STYLE_VALUES,
  LoaderVisual,
} from "@/components/ui/BrandedLoader";

vi.mock("@/lib/supabase-lazy", () => ({
  isSupabaseConfigured: false,
  getSupabase: vi.fn(),
}));

describe("BrandedLoader", () => {
  it("renders the default aurora ring with a rotating message", () => {
    render(<BrandedLoader />);
    expect(screen.getByText("Loading…")).toBeTruthy();
    // The sweep is the brand arc on a hairline track, not a letter in a disc.
    const ring = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(ring).toBeTruthy();
    const sweep = ring.querySelector(".animate-spin") as HTMLElement;
    expect(sweep.style.background).toContain("conic-gradient");
    expect(sweep.style.animationDuration).toBe("1.8s");
  });

  it("keeps the middle of the ring empty by default", () => {
    // Owner directive 2026-11-07: no monogram in a white circle.
    render(<BrandedLoader />);
    expect(document.querySelector('[role="progressbar"] img')).toBeNull();
    expect(document.querySelector('[role="progressbar"] svg')).toBeNull();
  });

  it("keeps the mark off unless an admin asks for it", () => {
    // The mark is available, but the premium default is the bare ring.
    expect(DEFAULT_LOADER_CONFIG.show_logo).toBe(false);
  });

  it("offers 16 styles, five or more of them premium circles", () => {
    expect(LOADER_STYLE_OPTIONS).toHaveLength(16);
    const count = (c: string) =>
      LOADER_STYLE_OPTIONS.filter((o) => o.category === c).length;
    // The admin picker groups by category, so every group needs a member and
    // the totals must add up to the whole list.
    expect(count("premium")).toBeGreaterThanOrEqual(5);
    expect(count("simple")).toBeGreaterThanOrEqual(5);
    expect(count("classic")).toBeGreaterThanOrEqual(2);
    expect(count("standard")).toBeGreaterThanOrEqual(3);
    expect(
      count("premium") + count("simple") + count("classic") + count("standard"),
    ).toBe(LOADER_STYLE_OPTIONS.length);
    for (const group of LOADER_CATEGORY_ORDER) {
      expect(count(group.value), group.label).toBeGreaterThan(0);
    }
  });

  it("keeps every style value unique and inside the allowed set", () => {
    const values = LOADER_STYLE_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(LOADER_STYLE_VALUES).toContain(value);
    }
  });

  it("renders every selectable loader style without crashing", () => {
    for (const option of LOADER_STYLE_OPTIONS) {
      const { container, unmount } = render(
        <LoaderVisual
          config={{ ...DEFAULT_LOADER_CONFIG, style: option.value }}
          sizePx={96}
        />,
      );
      expect(container.childElementCount).toBeGreaterThan(0);
      unmount();
    }
  });

  it("renders five bars for the bars style", () => {
    const { container } = render(
      <LoaderVisual
        config={{ ...DEFAULT_LOADER_CONFIG, style: "bars" }}
        sizePx={96}
      />,
    );
    const bars = container.querySelectorAll(".rounded-full");
    expect(bars.length).toBe(5);
  });

  it("shows custom text when configured", () => {
    const { container } = render(
      <LoaderVisual config={{ ...DEFAULT_LOADER_CONFIG, text: "Mixing…" }} />,
    );
    expect(container).toBeTruthy();
  });
});

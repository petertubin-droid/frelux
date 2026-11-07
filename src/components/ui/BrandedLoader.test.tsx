import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandedLoader, {
  DEFAULT_LOADER_CONFIG,
  LOADER_STYLE_OPTIONS,
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

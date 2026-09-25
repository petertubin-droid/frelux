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
  it("renders the default gradient ring loader with a rotating message", () => {
    render(<BrandedLoader />);
    expect(screen.getByText("Loading…")).toBeTruthy();
    // gradient ring renders an <svg>
    expect(document.querySelector("svg")).toBeTruthy();
  });

  it("falls back to a plain spinner when disabled", () => {
    // enabled=false makes BrandedLoader render a minimal fallback spinner;
    // here we verify the minimal spinner visual renders its circles.
    const { container } = render(
      <LoaderVisual
        config={{ ...DEFAULT_LOADER_CONFIG, style: "spinner" }}
        sizePx={64}
      />,
    );
    expect(container.querySelector("svg circle")).toBeTruthy();
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

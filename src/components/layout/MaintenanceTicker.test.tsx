import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import MaintenanceTicker from "@/components/layout/MaintenanceTicker";
import { MAINTENANCE_PRESETS } from "@/config/maintenance-presets";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

function mockReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("MaintenanceTicker", () => {
  beforeEach(() => mockReducedMotion(false));

  it("renders nothing without a message", () => {
    const { container } = render(<MaintenanceTicker message="   " />);
    expect(container).toBeEmptyDOMElement();
  });

  it("pins the strip under the header and reads the message once", () => {
    render(<MaintenanceTicker message="Scheduled maintenance tonight" />);
    const strip = screen.getByTestId("maintenance-ticker");
    expect(strip.className).toContain("sticky");
    expect(strip.className).toContain("top-14");
    // One live region carries the sentence in full for assistive tech.
    const status = screen.getByRole("status");
    expect(status).toHaveClass("sr-only");
    expect(status.textContent).toContain("Scheduled maintenance tonight");
  });

  it("duplicates the sentence only for the seamless loop", () => {
    const { container } = render(<MaintenanceTicker message="Working on it" />);
    const track = container.querySelector(".maintenance-ticker-track");
    expect(track).not.toBeNull();
    expect(track!.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(
      Array.from(track!.querySelectorAll("span")).filter(
        (span) => span.textContent === "Working on it",
      ),
    ).toHaveLength(2);
  });

  it("gives a longer sentence a longer travel time so it stays readable", () => {
    const { container: short } = render(<MaintenanceTicker message="Short" />);
    const { container: long } = render(
      <MaintenanceTicker
        message={
          "Payment maintenance in progress. New orders resume shortly; anything already paid is safe and unaffected."
        }
      />,
    );
    const duration = (el: Element) =>
      Number(
        (el.querySelector(".maintenance-ticker-track") as HTMLElement).style
          .animationDuration.replace("s", ""),
      );
    expect(duration(long)).toBeGreaterThan(duration(short));
  });

  it("holds the sentence still for visitors who ask for reduced motion", () => {
    mockReducedMotion(true);
    const { container } = render(<MaintenanceTicker message="Back shortly" />);
    expect(container.querySelector(".maintenance-ticker-track")).toBeNull();
    expect(screen.getByTestId("maintenance-ticker").textContent).toContain(
      "Back shortly",
    );
  });

  it("does not pin itself inside the admin preview", () => {
    render(<MaintenanceTicker inline message="Preview copy" />);
    expect(screen.getByTestId("maintenance-ticker").className).not.toContain(
      "sticky",
    );
  });

  it("ships presets the database will accept", () => {
    for (const preset of MAINTENANCE_PRESETS) {
      expect(preset.message.trim().length).toBeGreaterThan(0);
      expect(preset.message.trim().length).toBeLessThanOrEqual(240);
    }
  });
});

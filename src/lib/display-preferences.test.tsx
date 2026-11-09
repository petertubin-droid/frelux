import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { viewportContent } from "@/lib/display-viewport";
import {
  DEFAULT_PREFERENCES,
  DISPLAY_PREFERENCE_KEY,
  DISPLAY_SCALE_OPTIONS,
  DisplayPreferencesProvider,
  useDisplayPreferences,
} from "./display-preferences";

function Readout() {
  const { scale, compact, wideView, setScale, setCompact, reset } =
    useDisplayPreferences();
  return (
    <div>
      <span data-testid="readout">
        {scale}/{String(compact)}/{String(wideView)}
      </span>
      <button onClick={() => setScale(75)}>Use 75</button>
      <button onClick={() => setCompact(false)}>Turn compact off</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

describe("display preferences", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute("data-frelux-scale");
    document.documentElement.removeAttribute("data-frelux-compact");
    document.documentElement.removeAttribute("data-frelux-wide-view");
    document.documentElement.style.removeProperty("--frelux-display-scale");
  });

  it("defaults to a compact 50% wide view", () => {
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");
  });

  it("persists changes and applies the scale without a reload", () => {
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use 75" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn compact off" }));
    expect(screen.getByTestId("readout").textContent).toBe("75/false/true");
    expect(
      document.documentElement.style.getPropertyValue("--frelux-display-scale"),
    ).toBe("0.75");
    expect(
      JSON.parse(localStorage.getItem(DISPLAY_PREFERENCE_KEY) ?? "{}"),
    ).toEqual({
      scale: 75,
      compact: false,
      wideView: true,
    });
  });

  it("rehydrates saved preferences when the provider mounts again", () => {
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({ scale: 90, compact: false, wideView: true }),
    );
    const first = render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("90/false/true");
    first.unmount();
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("90/false/true");
  });

  it("restores all defaults", () => {
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({ scale: 125, compact: false, wideView: false }),
    );
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");
  });
});

describe("pre-paint script parity", () => {
  // index.html applies the saved scale before React mounts to avoid a flash of
  // the wrong size. That script restates the valid scales and the defaults, so
  // it can silently drift from the provider; these keep the two in step.
  const html = readFileSync("index.html", "utf8");

  it("offers exactly the scales the provider offers", () => {
    const match = html.match(/var valid=\[([^\]]+)\]/);
    expect(
      match,
      "index.html should declare the valid scale list",
    ).not.toBeNull();
    const inline = match![1].split(",").map((value) => Number(value.trim()));
    expect(inline).toEqual([...DISPLAY_SCALE_OPTIONS]);
  });

  it("falls back to the same defaults the provider uses", () => {
    expect(html).toContain(`scale=${DEFAULT_PREFERENCES.scale}`);
    expect(html).toContain(`compact=${String(DEFAULT_PREFERENCES.compact)}`);
    expect(html).toContain(`wide=${String(DEFAULT_PREFERENCES.wideView)}`);
  });

  it("computes the same viewport as the module, so first paint matches React", () => {
    // Run the real inline script against several phones and scales and compare it
    // to viewportContent(): they are two copies of one formula.
    const block = html.match(
      /<script>\s*\(function\(\)\{var apply=[\s\S]*?<\/script>/,
    );
    expect(block, "pre-paint display script present").not.toBeNull();
    const script = block![0]
      .replace(/^<script>/, "")
      .replace(/<\/script>$/, "");

    // Triples are [screenWidth, screenHeight, scale]: portrait and landscape
    // phones, a desktop, and 100%.
    for (const [screenW, screenH, scale] of [
      [412, 915, 50],
      [390, 844, 60],
      [360, 740, 75],
      [430, 932, 90],
      [412, 915, 100],
      [915, 412, 50],
      [1440, 900, 50],
    ] as const) {
      const landscape = screenW > screenH;
      // A real phone takes touch input; the script requires it before scaling.
      Object.defineProperty(window.navigator, "maxTouchPoints", {
        configurable: true,
        value: 5,
      });
      localStorage.setItem(
        DISPLAY_PREFERENCE_KEY,
        JSON.stringify({ scale, compact: true, wideView: true }),
      );
      document.head.innerHTML =
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">';
      Object.defineProperty(window, "screen", {
        configurable: true,
        value: {
          width: screenW,
          height: screenH,
          orientation: {
            type: landscape ? "landscape-primary" : "portrait-primary",
          },
        },
      });
      new Function(script)();
      const inline = document.head.querySelector<HTMLMetaElement>(
        'meta[name="viewport"]',
      )!.content;
      expect(inline, `${screenW}x${screenH} @ ${scale}%`).toBe(
        viewportContent({
          deviceWidth: landscape
            ? Math.max(screenW, screenH)
            : Math.min(screenW, screenH),
          deviceShortEdge: Math.min(screenW, screenH),
          touch: true,
          scalePercent: scale,
        }).content,
      );
      // The parity check is worthless if both sides are neutral, so prove the
      // script really did produce a scaled viewport for the scaling cases.
      if (scale !== 100 && Math.min(screenW, screenH) <= 600) {
        expect(inline).toContain("width=");
        expect(inline).not.toContain("width=device-width");
      }
    }
  });
});

describe("external changes", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("follows a change made in another tab", () => {
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");

    // Another tab writes the preference and the browser announces it here.
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({ scale: 90, compact: false, wideView: false }),
    );
    fireEvent(window, new Event("storage"));

    expect(screen.getByTestId("readout").textContent).toBe("90/false/false");
  });

  it("re-reads storage when the page is restored from the back/forward cache", () => {
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({ scale: 70, compact: true, wideView: true }),
    );
    fireEvent(window, new Event("pageshow"));
    expect(screen.getByTestId("readout").textContent).toBe("70/true/true");
  });
});

describe("without a provider", () => {
  afterEach(cleanup);

  it("renders at the defaults instead of taking the page down", () => {
    // The settings trigger lives in the shell; a harness or an alternative
    // layout tree that renders the header without the provider must still work.
    expect(() => render(<Readout />)).not.toThrow();
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");
  });

  it("treats setters as no-ops rather than crashing", () => {
    render(<Readout />);
    fireEvent.click(screen.getByRole("button", { name: "Use 75" }));
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");
  });
});

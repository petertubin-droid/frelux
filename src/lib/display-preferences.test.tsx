import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { viewportContent } from "@/lib/display-viewport";
import {
  DEFAULT_DESKTOP_SCALE,
  DEFAULT_MOBILE_SCALE,
  DEFAULT_PREFERENCES,
  DISPLAY_PREFERENCE_KEY,
  defaultScaleForDevice,
  DISPLAY_SCALE_OPTIONS,
  DisplayPreferencesProvider,
  readDisplayPreferences,
  useDisplayPreferences,
} from "./display-preferences";
import { DEVICE_SHORT_EDGE_KEY, deviceCssShortEdge } from "./display-viewport";

/**
 * The inline display script, found by what it does rather than by position:
 * index.html carries several inline scripts and only one touches display keys.
 */
function displayScript(html: string): string {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (match) => match[1],
  );
  const script = blocks.find(
    (block) =>
      block.includes("frelux_display_preferences_v1") &&
      block.includes("var apply="),
  );
  expect(script, "pre-paint display script present").toBeTruthy();
  return script!;
}

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
      chosen: true,
    });
  });

  it("rehydrates saved preferences when the provider mounts again", () => {
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({
        scale: 90,
        compact: false,
        wideView: true,
        chosen: true,
      }),
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
      JSON.stringify({
        scale: 125,
        compact: false,
        wideView: false,
        chosen: true,
      }),
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
    const script = displayScript(html);

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
        JSON.stringify({ scale, compact: true, wideView: true, chosen: true }),
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

describe("phone vs desktop defaults", () => {
  // 50% is a desktop layout width. On a phone it is unreadable, so phones start
  // at 80%; whatever the visitor saves afterwards still wins.
  const DESKTOP_SCREEN = { width: 1440, height: 900 };

  function setDevice(width: number, height: number, touch = 5) {
    Object.defineProperty(window, "screen", {
      configurable: true,
      value: {
        width,
        height,
        orientation: {
          type: width > height ? "landscape-primary" : "portrait-primary",
        },
      },
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: touch,
    });
  }

  afterEach(() => {
    cleanup();
    localStorage.clear();
    setDevice(DESKTOP_SCREEN.width, DESKTOP_SCREEN.height, 0);
  });

  it("judges the device the same way the viewport does", () => {
    setDevice(412, 915);
    expect(defaultScaleForDevice()).toBe(DEFAULT_MOBILE_SCALE);
    setDevice(390, 844);
    expect(defaultScaleForDevice()).toBe(DEFAULT_MOBILE_SCALE);
    // A tablet is wide on its short edge: it keeps the desktop starting point.
    setDevice(820, 1180);
    expect(defaultScaleForDevice()).toBe(DEFAULT_DESKTOP_SCALE);
    // Touchless at phone width is a narrow desktop window, not a phone.
    setDevice(412, 915, 0);
    expect(defaultScaleForDevice()).toBe(DEFAULT_DESKTOP_SCALE);
  });

  it("starts a phone at 80% and keeps a saved choice", () => {
    setDevice(412, 915);
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("80/true/true");

    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({
        scale: 60,
        compact: true,
        wideView: true,
        chosen: true,
      }),
    );
    expect(readDisplayPreferences().scale).toBe(60);
  });

  it("resets a phone to 80%, not to a desktop 50%", () => {
    setDevice(412, 915);
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    fireEvent.click(screen.getByText("Use 75"));
    expect(screen.getByTestId("readout").textContent).toBe("75/true/true");
    fireEvent.click(screen.getByText("Reset"));
    expect(screen.getByTestId("readout").textContent).toBe("80/true/true");
  });

  it("gives a phone 80% before React mounts, and a desktop 50%", () => {
    const html = readFileSync("index.html", "utf8");
    const script = displayScript(html);

    for (const [w, h, touch, expected] of [
      [412, 915, 5, DEFAULT_MOBILE_SCALE],
      [390, 844, 5, DEFAULT_MOBILE_SCALE],
      [1440, 900, 0, DEFAULT_DESKTOP_SCALE],
    ] as const) {
      setDevice(w, h, touch);
      localStorage.removeItem(DISPLAY_PREFERENCE_KEY);
      document.head.innerHTML =
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">';
      new Function(script)();
      // The dataset value is what the panel and the CSS read, so this is the
      // same number the provider would have chosen for this device.
      expect(
        document.documentElement.dataset.freluxScale,
        `${w}x${h} touch=${touch}`,
      ).toBe(String(expected));
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
      JSON.stringify({
        scale: 90,
        compact: false,
        wideView: false,
        chosen: true,
      }),
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
      JSON.stringify({
        scale: 70,
        compact: true,
        wideView: true,
        chosen: true,
      }),
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

describe("a phone after signing in", () => {
  // The reported bug: signing in with Google reloads the page, and the phone
  // came back in the desktop layout. A reload is exactly when a widened
  // viewport is already on the document, so the device was being measured from
  // our own scaling and then saved as if the visitor had chosen it.
  function setDevice(width: number, height: number, touch = 5) {
    Object.defineProperty(window, "screen", {
      configurable: true,
      value: {
        width,
        height,
        orientation: {
          type: width > height ? "landscape-primary" : "portrait-primary",
        },
      },
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: touch,
    });
  }

  it("keeps the phone layout when the reload reports a widened screen", () => {
    localStorage.setItem(DEVICE_SHORT_EDGE_KEY, "390");
    document.head.innerHTML =
      '<meta name="viewport" content="width=780, initial-scale=0.8, viewport-fit=cover">';
    setDevice(780, 1690);

    expect(deviceCssShortEdge()).toBe(390);
    expect(defaultScaleForDevice()).toBe(DEFAULT_MOBILE_SCALE);
  });

  it("never stores a device guess as a choice", () => {
    setDevice(412, 915);
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe(
      `${DEFAULT_MOBILE_SCALE}/true/true`,
    );
    expect(localStorage.getItem(DISPLAY_PREFERENCE_KEY)).toBeNull();
  });

  it("ignores an unmarked desktop record on a phone", () => {
    setDevice(412, 915);
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({
        scale: DEFAULT_DESKTOP_SCALE,
        compact: true,
        wideView: true,
      }),
    );
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe(
      `${DEFAULT_MOBILE_SCALE}/true/true`,
    );
  });

  it("still honours a marked choice on the same phone", () => {
    setDevice(412, 915);
    localStorage.setItem(
      DISPLAY_PREFERENCE_KEY,
      JSON.stringify({
        scale: 90,
        compact: true,
        wideView: true,
        chosen: true,
      }),
    );
    render(
      <DisplayPreferencesProvider>
        <Readout />
      </DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("90/true/true");
  });
  it("gives the same phone 80% at first paint after that reload", () => {
    const html = readFileSync("index.html", "utf8");
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1])
      .find((body) => body.includes("frelux_display_preferences_v1"));
    expect(inline, "pre-paint display script").toBeTruthy();

    localStorage.setItem(DEVICE_SHORT_EDGE_KEY, "390");
    localStorage.removeItem(DISPLAY_PREFERENCE_KEY);
    document.head.innerHTML =
      '<meta name="viewport" content="width=780, initial-scale=0.8, viewport-fit=cover">';
    setDevice(780, 1690);
    new Function(inline!)();

    expect(document.documentElement.dataset.freluxScale).toBe(
      String(DEFAULT_MOBILE_SCALE),
    );
  });
});

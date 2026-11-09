import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
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
    expect(html).toContain(`?p.scale:${DEFAULT_PREFERENCES.scale};`);
    expect(html).toContain(
      `?p.compact:${String(DEFAULT_PREFERENCES.compact)};`,
    );
    expect(html).toContain(
      `?p.wideView:${String(DEFAULT_PREFERENCES.wideView)};`,
    );
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

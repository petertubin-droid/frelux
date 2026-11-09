import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  DISPLAY_PREFERENCE_KEY,
  DisplayPreferencesProvider,
  useDisplayPreferences,
} from "./display-preferences";

function Readout() {
  const { scale, compact, wideView, setScale, setCompact, reset } =
    useDisplayPreferences();
  return (
    <div>
      <span data-testid="readout">{scale}/{String(compact)}/{String(wideView)}</span>
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
    render(<DisplayPreferencesProvider><Readout /></DisplayPreferencesProvider>);
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");
  });

  it("persists changes and applies the scale without a reload", () => {
    render(<DisplayPreferencesProvider><Readout /></DisplayPreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Use 75" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn compact off" }));
    expect(screen.getByTestId("readout").textContent).toBe("75/false/true");
    expect(document.documentElement.style.getPropertyValue("--frelux-display-scale")).toBe("0.75");
    expect(JSON.parse(localStorage.getItem(DISPLAY_PREFERENCE_KEY) ?? "{}")).toEqual({
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
      <DisplayPreferencesProvider><Readout /></DisplayPreferencesProvider>,
    );
    expect(screen.getByTestId("readout").textContent).toBe("90/false/true");
    first.unmount();
    render(<DisplayPreferencesProvider><Readout /></DisplayPreferencesProvider>);
    expect(screen.getByTestId("readout").textContent).toBe("90/false/true");
  });

  it("restores all defaults", () => {
    localStorage.setItem(DISPLAY_PREFERENCE_KEY, JSON.stringify({ scale: 125, compact: false, wideView: false }));
    render(<DisplayPreferencesProvider><Readout /></DisplayPreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("readout").textContent).toBe("50/true/true");
  });
});

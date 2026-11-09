import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DisplaySettings from "./DisplaySettings";
import { DisplayPreferencesProvider } from "@/lib/display-preferences";

describe("DisplaySettings", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("opens accessible settings and applies scale and layout toggles", () => {
    render(<DisplayPreferencesProvider><DisplaySettings /></DisplayPreferencesProvider>);
    fireEvent.click(screen.getByRole("button", { name: /display settings, 50% scale/i }));
    const panel = screen.getByRole("region", { name: "Display settings" });
    expect(panel).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Display scale"), { target: { value: "90" } });
    expect(screen.getByLabelText(/display settings, 90% scale/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Compact spacing"));
    expect((screen.getByLabelText("Compact spacing") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText("Wide calculator view"));
    expect((screen.getByLabelText("Wide calculator view") as HTMLInputElement).checked).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Display settings" })).toBeNull();
  });
});

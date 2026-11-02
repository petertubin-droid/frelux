import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AdminMacroTracker from "./AdminMacroTracker";

describe("AdminMacroTracker Page", () => {
  it("renders System A Fluctuation Filter and simulation sandbox", async () => {
    render(<AdminMacroTracker />);

    expect(
      screen.getByText("The Fluctuation Filter (Macro Tracker)"),
    ).toBeDefined();
    expect(screen.getByText("System A")).toBeDefined();
    expect(screen.getByText("Simulate Economic Shocks")).toBeDefined();

    await waitFor(() => {
      expect(
        screen.getByText(/Central Bank & Commodity Baseline Feeds \(Kenya\)/i),
      ).toBeDefined();
    });
  });
});

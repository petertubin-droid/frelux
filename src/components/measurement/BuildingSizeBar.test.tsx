import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BuildingSizeProvider } from "@/lib/measurement/building-size-context";
import { BuildingSizeBar } from "./BuildingSizeBar";

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ market: { marketCode: "NG", country_name: "Nigeria" } }),
}));

function renderBar() {
  return render(
    <MemoryRouter>
      <BuildingSizeProvider>
        <BuildingSizeBar />
      </BuildingSizeProvider>
    </MemoryRouter>,
  );
}

describe("building size bar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("invites a building before one is set", () => {
    renderBar();
    expect(screen.getByRole("button", { name: /set building size/i })).toBeTruthy();
    expect(screen.getByText(/every tool will measure it/i)).toBeTruthy();
  });

  it("opens the editor and applies a template to the shared building", () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /set building size/i }));
    const select = screen.getByLabelText(/building type/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((item) => item.value !== "");
    expect(option).toBeTruthy();
    fireEvent.change(select, { target: { value: option!.value } });

    // The editor stays open after a template is applied, so the toggle still
    // offers to close it; the summary is already showing the new building.
    fireEvent.click(screen.getByRole("button", { name: /close building size/i }));
    expect(screen.getByRole("button", { name: /edit building size/i })).toBeTruthy();
    const stored = window.localStorage.getItem("frelux.building-size.v1");
    expect(JSON.parse(stored!).label).toBe(option!.text);
  });

  it("clears the building from the bar", () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /set building size/i }));
    const select = screen.getByLabelText(/building type/i) as HTMLSelectElement;
    const option = Array.from(select.options).find((item) => item.value !== "");
    fireEvent.change(select, { target: { value: option!.value } });
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(screen.getByRole("button", { name: /set building size/i })).toBeTruthy();
    expect(window.localStorage.getItem("frelux.building-size.v1")).toBeNull();
  });
});

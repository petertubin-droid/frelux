import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeatherLocationSelect } from "./WeatherLocationSelect";

describe("WeatherLocationSelect", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the current city and opens the picker", () => {
    render(<WeatherLocationSelect />);
    const trigger = screen.getByRole("button", { name: /weather location/i });
    expect(trigger.textContent).toContain("Lagos");
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: /choose weather location/i }),
    ).toBeTruthy();
    expect(screen.getByPlaceholderText(/search any city/i)).toBeTruthy();
  });

  it("offers the market city for a US visitor", () => {
    localStorage.setItem("frelux_market", "US");
    render(<WeatherLocationSelect />);
    expect(
      screen.getByRole("button", { name: /weather location/i }).textContent,
    ).toContain("New York");
  });
});

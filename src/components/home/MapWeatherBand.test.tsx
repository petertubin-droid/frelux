import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MapWeatherBand from "@/components/home/MapWeatherBand";

describe("MapWeatherBand", () => {
  it("links the new capabilities straight to their live surfaces", () => {
    render(
      <MemoryRouter>
        <MapWeatherBand />
      </MemoryRouter>,
    );

    const mapLink = screen
      .getByRole("link", { name: /See the work on a 3D globe/i })
      .getAttribute("href");
    const weatherLink = screen
      .getByRole("link", { name: /Plan around the weather/i })
      .getAttribute("href");

    expect(mapLink).toBe("/map");
    expect(weatherLink).toBe("/paint-calculator");
    expect(screen.getByText(/Beyond the numbers/i)).toBeTruthy();
  });

  it("makes no claim the platform cannot back up", () => {
    const { container } = render(
      <MemoryRouter>
        <MapWeatherBand />
      </MemoryRouter>,
    );
    const text = container.textContent ?? "";

    // Standing copy rules: no em dashes, no star-like decoration.
    expect(text).not.toContain("—");
    expect(text).not.toContain("⭐");
    expect(text).not.toContain("✦");
    // No invented coverage numbers.
    expect(text).not.toMatch(/\d+\s?(pros|professionals|listings)/i);
  });
});

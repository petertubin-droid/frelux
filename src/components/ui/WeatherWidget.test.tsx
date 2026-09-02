import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/weather", () => ({
  usePaintingWeather: vi.fn(() => ({
    city: "Lagos",
    days: [],
    loading: false,
    error: null,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderWidget() {
  const { WeatherWidget } = await import("@/components/ui/WeatherWidget");
  return render(
    <MemoryRouter>
      <WeatherWidget />
    </MemoryRouter>,
  );
}

const mockDay = {
  date: "2026-09-02",
  dayName: "Wednesday",
  tempMin: 24,
  tempMax: 31,
  humidity: 70,
  precipitation: 0,
  windSpeed: 3,
  condition: "Clear",
  icon: "01d",
  paintRating: "good" as const,
  paintNote: "Great day to paint",
};

describe("WeatherWidget", () => {
  it("returns null when no data", async () => {
    const { container } = await renderWidget();
    expect(container.innerHTML).toBe("");
  });

  it("shows loading state", async () => {
    const { usePaintingWeather } = await import("@/lib/weather");
    vi.mocked(usePaintingWeather).mockReturnValue({
      city: "Lagos", days: [], loading: true, error: null,
    } as never);
    await renderWidget();
    expect(screen.getByText(/Loading weather/i)).toBeTruthy();
  });

  it("returns null on error", async () => {
    const { usePaintingWeather } = await import("@/lib/weather");
    vi.mocked(usePaintingWeather).mockReturnValue({
      city: "Lagos", days: [], loading: false, error: "Failed to fetch",
    } as never);
    const { container } = await renderWidget();
    expect(container.innerHTML).toBe("");
  });

  it("renders weather data when available", async () => {
    const { usePaintingWeather } = await import("@/lib/weather");
    vi.mocked(usePaintingWeather).mockReturnValue({
      city: "Lagos", days: [mockDay], loading: false, error: null,
    } as never);
    const { container } = await renderWidget();
    expect(container.innerHTML).not.toBe("");
    expect(screen.getByText(/forecast/i)).toBeTruthy();
  });
});

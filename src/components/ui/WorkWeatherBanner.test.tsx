import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockToday = {
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

vi.mock("@/lib/weather-work", () => ({
  useWorkWeather: vi.fn(() => ({
    today: mockToday,
    days: [mockToday],
    city: "Lagos",
    loading: false,
    canWorkToday: true,
    workRating: "good",
    workNote: "Good conditions",
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderBanner() {
  const { WorkWeatherBanner } = await import("@/components/ui/WorkWeatherBanner");
  return render(
    <MemoryRouter>
      <WorkWeatherBanner workType="painting" />
    </MemoryRouter>,
  );
}

describe("WorkWeatherBanner", () => {
  it("renders without crashing", async () => {
    const { container } = await renderBanner();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows city name", async () => {
    await renderBanner();
    expect(screen.getByText(/Lagos/i)).toBeTruthy();
  });

  it("shows loading state", async () => {
    const { useWorkWeather } = await import("@/lib/weather-work");
    vi.mocked(useWorkWeather).mockReturnValue({
      today: null, days: [], city: "Lagos", loading: true, canWorkToday: false, workRating: "unknown", workNote: "",
    } as never);
    await renderBanner();
    expect(screen.getByText(/Checking weather/i)).toBeTruthy();
  });
});

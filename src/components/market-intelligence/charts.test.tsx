import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceChart from "@/components/market-intelligence/PriceChart";
import CandleChart from "@/components/market-intelligence/CandleChart";

const series = [
  { ts: "2026-01-01", value: 100 },
  { ts: "2026-02-01", value: 104.5 },
  { ts: "2026-03-01", value: 99.25 },
];

const candles = [
  { ts: "2026-01-02", open: 10, high: 12, low: 9.5, close: 11.5, volume: 1000 },
  { ts: "2026-01-03", open: 11.5, high: 12.4, low: 10.8, close: 10.9, volume: 1200 },
];

describe("PriceChart", () => {
  it("announces the series, its point count and the latest value", () => {
    render(<PriceChart series={series} label="US cement PPI" />);
    const chart = screen.getByRole("img", { name: /US cement PPI/i });
    expect(chart.getAttribute("aria-label")).toContain("3 data points");
    expect(chart.getAttribute("aria-label")).toContain("99.25");
  });

  it("draws the line and the date axis so the series is readable without hovering", () => {
    const { container } = render(<PriceChart series={series} label="US cement PPI" />);
    expect(container.querySelectorAll("svg path").length).toBeGreaterThanOrEqual(2);
    // The axis labels carry the first and last observation dates.
    expect(screen.getByText(new Date(series[0].ts).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(series[2].ts).toLocaleDateString())).toBeInTheDocument();
  });

  it("says so instead of drawing an empty frame when there is no data", () => {
    render(<PriceChart series={[]} label="US cement PPI" />);
    expect(screen.getByText(/No data available/i)).toBeInTheDocument();
  });
});

describe("CandleChart", () => {
  it("draws a body and a wick for every observation", () => {
    const { container } = render(<CandleChart candles={candles} label="CAT daily" currency="USD" />);
    expect(screen.getByRole("img", { name: /CAT daily/i })).toBeInTheDocument();
    expect(container.querySelectorAll("svg rect").length).toBeGreaterThanOrEqual(candles.length);
    expect(container.querySelectorAll("svg line").length).toBeGreaterThanOrEqual(candles.length);
  });

  it("does not draw a chart when the provider returned no candles", () => {
    render(<CandleChart candles={[]} label="CAT daily" currency="USD" />);
    expect(screen.getByText(/No price history/i)).toBeInTheDocument();
  });
});

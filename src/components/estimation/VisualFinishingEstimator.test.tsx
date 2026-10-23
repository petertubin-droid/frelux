import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { VisualFinishingEstimator } from "./VisualFinishingEstimator";

describe("VisualFinishingEstimator Component", () => {
  it("renders the initial media input step with activity choices", () => {
    render(<VisualFinishingEstimator />);

    expect(screen.getByText("Visual Surface Estimation")).toBeDefined();
    expect(screen.getByText("Upload or Capture Project Photo")).toBeDefined();
    expect(screen.getByText("Wall & Ceiling Painting")).toBeDefined();
    expect(screen.getByText("Wall Screeding")).toBeDefined();
    expect(screen.getByText("Floor & Wall Tiling")).toBeDefined();
    expect(screen.getByText("POP / Ceiling Finishing")).toBeDefined();
    expect(screen.getByText("Plank & Sheet Flooring")).toBeDefined();
  });

  it("allows switching market country and shows currency", () => {
    render(<VisualFinishingEstimator initialMarket="US" />);
    const select = screen.getByLabelText("Market:") as HTMLSelectElement;
    expect(select.value).toBe("US");

    fireEvent.change(select, { target: { value: "GB" } });
    expect(select.value).toBe("GB");
  });
});

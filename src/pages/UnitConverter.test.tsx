import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UnitConverter from "./UnitConverter";

/**
 * The converter is the bridge between a tape measure and the calculators, so
 * these tests guard the two things that would quietly break an estimate: the
 * arithmetic on the page, and the refusal to convert nonsense.
 */

function renderPage() {
  return render(
    <MemoryRouter>
      <UnitConverter />
    </MemoryRouter>,
  );
}

describe("measurement converter page", () => {
  it("renders every conversion category", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        name: /construction measurement converter/i,
      }),
    ).toBeInTheDocument();
    [
      "Length",
      "Area & land",
      "Volume",
      "Weight",
      "Materials",
      "Paint",
      "Roofing",
    ].forEach((label) => {
      expect(
        screen.getByRole("tab", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    });
  });

  it("converts feet to metres from the default input", () => {
    renderPage();
    // 12 ft default converts to 3.6576 m
    expect(screen.getAllByText(/3\.6576/).length).toBeGreaterThan(0);
  });

  it("rejects an empty or negative measurement instead of showing a number", () => {
    renderPage();
    const input = screen.getByLabelText(/^Measurement$/i);
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "-4" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it("shows land results for the standard plot preset", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /area & land/i }));
    expect(screen.getAllByText(/668\.9/).length).toBeGreaterThan(0);
  });

  it("converts a 20 tonne sand load into cubic metres and bags", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /materials/i }));
    expect(screen.getByText(/12\.5 m³/)).toBeInTheDocument();
    expect(screen.getByText(/400 bags/)).toBeInTheDocument();
  });

  it("plans paint in 20 L and 4 L buckets rather than wasting litres", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /paint/i }));
    fireEvent.change(screen.getByLabelText(/litres needed/i), {
      target: { value: "24" },
    });
    expect(screen.getByText(/1 x 20 L \+ 1 x 4 L/)).toBeInTheDocument();
  });
});

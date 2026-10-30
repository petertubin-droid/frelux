import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UnitConverter from "./UnitConverter";

/**
 * The converter is the bridge between a tape measure and the calculators, so
 * these tests guard the two things that would quietly break an estimate: the
 * arithmetic on the page, and the refusal to convert nonsense. The all-units
 * tab additionally has to cross dimensions only when it has what it needs.
 */

function renderPage() {
  return render(
    <MemoryRouter>
      <UnitConverter />
    </MemoryRouter>,
  );
}

function openTab(name: RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
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
      "All units",
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

  it("offers every unit on both sides of the all-units tab", () => {
    renderPage();
    const from = screen.getByLabelText(/^From$/i) as HTMLSelectElement;
    const to = screen.getByLabelText(/^To$/i) as HTMLSelectElement;
    expect(from.options.length).toBeGreaterThanOrEqual(24);
    expect(to.options.length).toBe(from.options.length);
    // plots and imperial units sit in the same list as metric ones
    expect(
      Array.from(from.options).some((o) =>
        o.textContent?.includes("Plot, 60 x 120 ft"),
      ),
    ).toBe(true);
    expect(
      Array.from(from.options).some((o) =>
        o.textContent?.includes("Imperial gallons"),
      ),
    ).toBe(true);
  });

  it("converts a plot into square metres by default", () => {
    renderPage();
    expect(screen.getAllByText(/668\.9/).length).toBeGreaterThan(0);
  });

  it("converts feet to metres on the length tab", () => {
    renderPage();
    openTab(/^Length$/i);
    // 12 ft default converts to 3.6576 m
    expect(screen.getAllByText(/3\.6576/).length).toBeGreaterThan(0);
  });

  it("rejects an empty or negative measurement instead of showing a number", () => {
    renderPage();
    openTab(/^Length$/i);
    const input = screen.getByLabelText(/^Measurement$/i);
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "-4" } });
    expect(screen.getByText(/enter a number/i)).toBeInTheDocument();
  });

  it("converts any length into any other length", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Measurement$/i), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText(/^From$/i), {
      target: { value: "len-ft" },
    });
    fireEvent.change(screen.getByLabelText(/^To$/i), {
      target: { value: "len-in" },
    });
    expect(screen.getAllByText(/^144$/).length).toBeGreaterThan(0);
  });

  it("squares a length into an area and says so", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Measurement$/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/^From$/i), {
      target: { value: "len-m" },
    });
    fireEvent.change(screen.getByLabelText(/^To$/i), {
      target: { value: "area-m2" },
    });
    expect(screen.getAllByText(/^100$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/treated as a square/i)).toBeInTheDocument();
  });

  it("asks for a depth before crossing area and volume", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Measurement$/i), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText(/^From$/i), {
      target: { value: "area-m2" },
    });
    fireEvent.change(screen.getByLabelText(/^To$/i), {
      target: { value: "vol-m3" },
    });

    const depth = screen.getByLabelText(/depth of the layer/i);
    fireEvent.change(depth, { target: { value: "" } });
    expect(screen.getByText(/add a depth/i)).toBeInTheDocument();
    fireEvent.change(depth, { target: { value: "0.1" } });
    expect(screen.getAllByText(/^5$/).length).toBeGreaterThan(0);
  });

  it("asks for a density before crossing volume and weight", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^Measurement$/i), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText(/^From$/i), {
      target: { value: "mass-tonne" },
    });
    fireEvent.change(screen.getByLabelText(/^To$/i), {
      target: { value: "vol-m3" },
    });
    // sand at 1600 kg per cubic metre
    expect(screen.getAllByText(/^12\.5$/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/density/i), {
      target: { value: "" },
    });
    expect(screen.getByText(/add a density/i)).toBeInTheDocument();
  });

  it("refuses to turn a length into a weight", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/^From$/i), {
      target: { value: "len-ft" },
    });
    fireEvent.change(screen.getByLabelText(/^To$/i), {
      target: { value: "mass-kg" },
    });
    expect(
      screen.getByText(/need a volume first|different things/i),
    ).toBeInTheDocument();
  });

  it("shows land results for the standard plot preset", () => {
    renderPage();
    openTab(/^Area & land$/i);
    expect(screen.getAllByText(/668\.9/).length).toBeGreaterThan(0);
  });

  it("converts a 20 tonne sand load into cubic metres and bags", () => {
    renderPage();
    openTab(/^Materials$/i);
    expect(screen.getByText(/12\.5 m³/)).toBeInTheDocument();
    expect(screen.getByText(/400 bags/)).toBeInTheDocument();
  });

  it("plans paint in 20 L and 4 L buckets rather than wasting litres", () => {
    renderPage();
    openTab(/^Paint$/i);
    fireEvent.change(screen.getByLabelText(/litres needed/i), {
      target: { value: "24" },
    });
    expect(screen.getByText(/1 x 20 L \+ 1 x 4 L/)).toBeInTheDocument();
  });
});

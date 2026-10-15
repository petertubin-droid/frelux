import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EarthworksEstimator from "./EarthworksEstimator";
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));

describe("EarthworksEstimator page", () => {
  it("calculates from entered cross sections and refuses missing survey/factor inputs", () => {
    render(
      <MemoryRouter>
        <EarthworksEstimator />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate cut & fill/i }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Enter every station chainage/,
    );
    const values = [
      ["Station 1 Chainage (m)", "0"],
      ["Station 1 Cut area (m²)", "2"],
      ["Station 1 Fill area (m²)", "1"],
      ["Station 2 Chainage (m)", "10"],
      ["Station 2 Cut area (m²)", "4"],
      ["Station 2 Fill area (m²)", "3"],
    ];
    for (const [label, value] of values)
      fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
        target: { value },
      });
    const factors = screen.getAllByPlaceholderText("Enter verified factor");
    fireEvent.change(factors[0], { target: { value: "20" } });
    fireEvent.change(factors[1], { target: { value: "10" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate cut & fill/i }),
    );
    expect(screen.getByText("30 m³")).toBeInTheDocument();
    expect(screen.getByText("20 m³")).toBeInTheDocument();
    expect(
      screen.getByText(/No cut\/fill reuse balance is claimed/),
    ).toBeInTheDocument();
  });
});

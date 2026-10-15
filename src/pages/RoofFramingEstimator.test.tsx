import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoofFramingEstimator from "./RoofFramingEstimator";
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));

describe("RoofFramingEstimator page", () => {
  it("requires measured geometry and outputs member/board-foot schedule", () => {
    render(
      <MemoryRouter>
        <RoofFramingEstimator />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate framing takeoff/i }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Building length/);
    const values: Record<string, string> = {
      "Building length (m)": "10",
      "Building width (m)": "8",
      "Roof pitch (rise per 12 horizontal)": "6",
      "Eave overhang (m)": "0",
      "Maximum rafter spacing (m)": "0.6",
    };
    for (const [label, value] of Object.entries(values))
      fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
        target: { value },
      });
    for (const key of ["common", "jack", "hip", "ridge"]) {
      fireEvent.change(
        screen.getByRole("spinbutton", { name: `${key} widthIn` }),
        { target: { value: "2" } },
      );
      fireEvent.change(
        screen.getByRole("spinbutton", { name: `${key} depthIn` }),
        { target: { value: "6" } },
      );
    }
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate framing takeoff/i }),
    );
    expect(screen.getByText("Member layout")).toBeInTheDocument();
    expect(screen.getAllByText(/Common rafters/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/BF/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Valleys are not auto-calculated/).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

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

it("keeps preliminary member checks separate and requires explicit engineer inputs", () => {
  render(
    <MemoryRouter>
      <RoofFramingEstimator />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Preliminary structural check/i }),
  );
  fireEvent.change(screen.getByRole("combobox", { name: /Market research context/i }), {
    target: { value: "NG" },
  });
  expect(screen.getByText(/reference\/research context only/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /National Building Code/i })).toHaveAttribute("href", "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf");
  fireEvent.click(
    screen.getByRole("button", { name: /Run preliminary member check/i }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    /Clear span must be greater than zero/,
  );
  expect(screen.getByText(/Jurisdictional structural design is not yet available/)).toBeInTheDocument();

  const values: Record<string, string> = {
    "Clear span (m)": "4",
    "Tributary spacing, horizontal (m)": "0.6",
    "Total downward load per plan area (kN/m²)": "2",
    "Section modulus S (mm³)": "300000",
    "Second moment I (mm⁴)": "30000000",
    "Effective shear area (mm²)": "200",
    "Elastic modulus E (GPa)": "10",
    "Design bending resistance (MPa)": "10",
    "Design shear resistance (MPa)": "15",
    "Deflection limit span / ratio": "200",
  };
  for (const [label, value] of Object.entries(values))
    fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
      target: { value },
    });
  fireEvent.click(
    screen.getByRole("button", { name: /Run preliminary member check/i }),
  );
  expect(
    screen.getByText(/Passes the entered bending, shear and deflection limits/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/No jurisdictional code, load factors/),
  ).toBeInTheDocument();
});

it("shows sourced Nigerian roof live-load references separately from total design load", () => {
  render(<MemoryRouter><RoofFramingEstimator /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Preliminary structural check/i }));
  fireEvent.change(screen.getByRole("spinbutton", { name: /Roof rise \(mm per 1 m horizontal\)/i }), { target: { value: "0" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /Member tributary loaded area/i }), { target: { value: "500" } });
  fireEvent.click(screen.getByRole("button", { name: /Look up published live-load reference/i }));
  expect(screen.getByText(/2 kN\/m² ordinary-roof live load/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Table 8.10/i })).toHaveAttribute("href", "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf");
  expect(screen.getByRole("spinbutton", { name: /Total downward load per plan area/i })).toHaveValue(null);
});

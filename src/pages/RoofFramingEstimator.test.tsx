import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RoofFramingEstimator from "./RoofFramingEstimator";
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
// Ad slots in the page call useAuth, which needs the app provider at runtime.
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: false })),
}));
import {
  BuildingSizeProvider,
  BUILDING_SIZE_STORAGE_KEY,
} from "@/lib/measurement/building-size-context";
import {
  draftsToSchedule,
  scheduleTotals,
} from "@/lib/measurement/building-schedule";

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
  fireEvent.change(
    screen.getByRole("combobox", { name: /Market research context/i }),
    {
      target: { value: "NG" },
    },
  );
  expect(
    screen.getByText(/reference\/research context only/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /National Building Code/i }),
  ).toHaveAttribute(
    "href",
    "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf",
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Run preliminary member check/i }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    /Clear span must be greater than zero/,
  );
  expect(
    screen.getByText(/Jurisdictional structural design is not yet available/),
  ).toBeInTheDocument();

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
  render(
    <MemoryRouter>
      <RoofFramingEstimator />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Preliminary structural check/i }),
  );
  fireEvent.change(
    screen.getByRole("spinbutton", {
      name: /Roof rise \(mm per 1 m horizontal\)/i,
    }),
    { target: { value: "0" } },
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: /Member tributary loaded area/i }),
    { target: { value: "500" } },
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: /Look up published live-load reference/i,
    }),
  );
  expect(
    screen.getByText(/2 kN\/m² ordinary-roof live load/i),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Table 8.10/i })).toHaveAttribute(
    "href",
    "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf",
  );
  expect(
    screen.getByRole("spinbutton", {
      name: /Total downward load per plan area/i,
    }),
  ).toHaveValue(null);
  });

  it("fills plan dimensions from the measured building", () => {
    const drafts = [
      {
        id: "r1",
        spaceType: "living_room" as const,
        label: "Room 1",
        length: 10,
        width: 8,
        height: 3,
        quantity: 1,
        doors: 1,
        windows: 1,
      },
    ];
    window.localStorage.setItem(
      BUILDING_SIZE_STORAGE_KEY,
      JSON.stringify({
        schedule: draftsToSchedule(drafts, "meters"),
        totals: scheduleTotals(draftsToSchedule(drafts, "meters")),
        label: "One room",
        unit: "meters",
        drafts,
      }),
    );
    render(
      <MemoryRouter>
        <BuildingSizeProvider>
          <RoofFramingEstimator />
        </BuildingSizeProvider>
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Use the measured building/i }),
    );
    expect(
      (screen.getByRole("spinbutton", { name: "Building length (m)" }) as HTMLInputElement)
        .value,
    ).toBe("10.00");
    expect(
      (screen.getByRole("spinbutton", { name: "Building width (m)" }) as HTMLInputElement)
        .value,
    ).toBe("8.00");
    expect(screen.getByRole("status")).toHaveTextContent(/10.00 m x 8.00 m/);
    window.localStorage.clear();
  });

describe("RoofFramingEstimator reading a roof plan", () => {
  const roofFixture = {
    lengthM: 18,
    widthM: 12,
    pitchDegrees: 30,
    risePer12: 6.93,
    overhangM: 0.45,
    ridgeLengthM: 18,
    shape: "gable" as const,
    valleys: 0,
    hips: 0,
    documentKind: "roof_plan" as const,
    needsConfirmation: [],
  };

  const renderPage = () =>
    render(
      <MemoryRouter>
        <RoofFramingEstimator />
      </MemoryRouter>,
    );

  it("fills length, width, pitch, overhang and shape from the measured roof", () => {
    window.localStorage.setItem("frelux.plan-roof.v1", JSON.stringify(roofFixture));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Use the measured roof/i }));

    expect(screen.getByRole("spinbutton", { name: "Building length (m)" })).toHaveValue(18);
    expect(screen.getByRole("spinbutton", { name: "Building width (m)" })).toHaveValue(12);
    expect(screen.getByRole("spinbutton", { name: "Roof pitch (rise per 12 horizontal)" })).toHaveValue(6.93);
    expect(screen.getByRole("spinbutton", { name: "Eave overhang (m)" })).toHaveValue(0.45);
    expect(screen.getByRole("status")).toHaveTextContent(/pitch 30\.00 degrees \(6\.93 rise per 12\)/);
    window.localStorage.clear();
  });

  it("refuses a shape this calculator does not frame and says so", () => {
    window.localStorage.setItem(
      "frelux.plan-roof.v1",
      JSON.stringify({ ...roofFixture, shape: "flat", pitchDegrees: 0, risePer12: 0 }),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Use the measured roof/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/frames gable and hip roofs/i);
    // The geometry still reaches the form; the shape stays the user's choice.
    expect(screen.getByRole("spinbutton", { name: "Building length (m)" })).toHaveValue(18);
    window.localStorage.clear();
  });

  it("says plainly when no roof has been read", () => {
    window.localStorage.clear();
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Use the measured roof/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/No roof has been read from a plan yet/i);
  });
});

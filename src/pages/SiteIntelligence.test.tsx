/**
 * Site & Soil Intelligence page wiring.
 *
 * The engine has its own tests. These pin the promises the page makes on
 * screen: the screening disclaimer is present, nothing runs without a bearing
 * capacity, scenarios are presented as a comparison rather than a prescription,
 * and unpriced cost is stated as incomplete.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const queries = vi.hoisted(() => ({
  fetchSoilClassifications: vi.fn(),
  fetchSites: vi.fn(),
  fetchReports: vi.fn(),
  fetchMyProjects: vi.fn(),
  saveSite: vi.fn(),
  uploadReport: vi.fn(),
  signedReportUrl: vi.fn(),
}));
vi.mock("@/lib/site-intelligence/queries", () => queries);

const screening = vi.hoisted(() => ({
  buildScreening: vi.fn(),
  slopeBand: (d: number) => (d < 2 ? "Level to gently sloping" : "Sloping"),
}));
vi.mock("@/lib/site-intelligence/screening", () => screening);

const foundation = vi.hoisted(() => {
  class ScenarioInputError extends Error {}
  return { runScenario: vi.fn(), ScenarioInputError };
});
vi.mock("@/lib/site-intelligence/foundation", () => foundation);

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({ marketCode: "NG" }),
}));
vi.mock("@/lib/price-index/use-project-city", () => ({
  useProjectCity: () => ({ citySlug: "lagos" }),
}));
vi.mock("@/lib/map/geocode", () => ({ searchPlaces: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) } },
}));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/map/GlobeMap", () => ({
  GlobeMap: () => <div data-testid="map" />,
}));

import SiteIntelligence from "./SiteIntelligence";

const soilClass = {
  id: "c1",
  slug: "clay",
  code: "CL",
  name: "Clay",
  name_fr: "Argile",
  summary: "Cohesive material",
  engineering_notes: "Strength depends on consistency.",
  implication: "Investigate before sizing.",
  drainage_flag: false,
  dewatering_flag: false,
  ground_improvement_flag: false,
  investigation_priority: "elevated" as const,
  sort_order: 10,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SiteIntelligence />
    </MemoryRouter>,
  );
}

describe("SiteIntelligence page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.fetchSoilClassifications.mockResolvedValue([soilClass]);
    queries.fetchSites.mockResolvedValue([]);
    queries.fetchReports.mockResolvedValue([]);
    queries.fetchMyProjects.mockResolvedValue([]);
    screening.buildScreening.mockResolvedValue({
      latitude: 6.5,
      longitude: 3.3,
      elevation_m: { value: 12.4, confidence: "screening", source: "Elevation model", limitation: "Not a survey." },
      slope_degrees: { value: 1.2, confidence: "screening", source: "Elevation model", limitation: "Not a survey." },
      coastal_distance_km: { value: 3.1, confidence: "screening", source: "Coastline reference", limitation: "Straight line." },
      flood_exposure: { value: null, confidence: "unknown", source: null, limitation: "No sourced record for this location yet." },
      drainage_note: { value: null, confidence: "unknown", source: null, limitation: "No sourced drainage record." },
      groundwater_note: { value: null, confidence: "unknown", source: null, limitation: "No sourced groundwater record." },
      erosion_note: { value: null, confidence: "unknown", source: null, limitation: "No sourced erosion record." },
      regional_profile: null,
      generated_at: "2026-10-31T00:00:00Z",
    });
  });

  it("states on arrival that this is screening, not a survey", () => {
    renderPage();
    expect(screen.getByText(/Screening, not a survey/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot identify your soil/i)).toBeInTheDocument();
  });

  it("explains that a classification carries no strength value", () => {
    renderPage();
    expect(
      screen.getByText(/carries no strength value/i),
    ).toBeInTheDocument();
  });

  it("refuses to compare scenarios without a bearing capacity", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Compare scenarios/i }));
    expect(
      await screen.findByText(/Enter the allowable bearing capacity/i),
    ).toBeInTheDocument();
    expect(foundation.runScenario).not.toHaveBeenCalled();
  });

  it("presents the five options as a comparison, not a recommendation", async () => {
    foundation.runScenario.mockResolvedValue({
      quantities: {
        excavation_m3: 10,
        concrete_m3: 4,
        blinding_m3: 0.4,
        hardcore_m3: 2,
        reinforcement_kg: 320,
        formwork_m2: 0,
        dewatering_allowance: 0,
        ground_improvement_m2: 0,
        pile_metres: 0,
      },
      design: {
        required_width_mm: 600,
        recommended_width_mm: 600,
        bearing_check_pass: true,
        applied_pressure_kpa: 120,
      },
      warnings: ["Bearing capacity is an unverified assumption entered by the user."],
      cost: { currency: "NGN", lines: [], subtotal: null, unpriced: ["Cement"], price_basis: {} },
    });

    renderPage();
    const bearingInput = screen.getAllByLabelText(/Allowable bearing capacity/i)[0];
    fireEvent.change(bearingInput, { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: /Compare scenarios/i }));

    await waitFor(() => expect(foundation.runScenario).toHaveBeenCalledTimes(5));
    expect(await screen.findByText(/Strip foundation/)).toBeInTheDocument();
    expect(screen.getByText(/does not choose a foundation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Incomplete: Cement/i).length).toBeGreaterThan(0);
  });

  it("reports the cost basis it used", async () => {
    foundation.runScenario.mockResolvedValue({
      quantities: {
        excavation_m3: 1,
        concrete_m3: 1,
        blinding_m3: 0,
        hardcore_m3: 0,
        reinforcement_kg: 80,
        formwork_m2: 0,
        dewatering_allowance: 0,
        ground_improvement_m2: 0,
        pile_metres: 0,
      },
      design: {
        required_width_mm: 600,
        recommended_width_mm: 600,
        bearing_check_pass: true,
        applied_pressure_kpa: 100,
      },
      warnings: ["Reinforcement uses an assumed 80 kg/m³ intensity."],
      cost: {
        currency: "NGN",
        lines: [],
        subtotal: 100000,
        unpriced: [],
        price_basis: { city_slug: "lagos" },
      },
    });

    renderPage();
    const bearingInput = screen.getAllByLabelText(/Allowable bearing capacity/i)[0];
    fireEvent.change(bearingInput, { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: /Compare scenarios/i }));

    await waitFor(() => expect(foundation.runScenario).toHaveBeenCalled());
    expect(
      await screen.findByText(/Labour, plant and margin are excluded/i),
    ).toBeInTheDocument();
  });
});

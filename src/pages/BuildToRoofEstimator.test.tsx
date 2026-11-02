import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BuildToRoofEstimator from "./BuildToRoofEstimator";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user" },
    isAdmin: true,
    isPaid: true,
    loading: false,
  })),
}));
vi.mock("@/components/subscription/SubscriptionGate", () => ({
  SubscriptionGate: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/rewards", () => ({ trackBuildToRoofRewards: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

describe("BuildToRoofEstimator 4-Phase UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    window.confirm = vi.fn().mockReturnValue(true);
  });

  it("renders 4 phases in the progress navigation", () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );

    expect(screen.getByText("Building Footprint & Envelope")).toBeDefined();
    expect(screen.getByText("Assemblies (Modular)")).toBeDefined();
    expect(screen.getByText("Material & Labor Rates")).toBeDefined();
    expect(screen.getByText("Summary BOQ & Export")).toBeDefined();
  });

  it("navigates directly between phases using header tabs", () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );

    // Initial phase is Phase 1 (Envelope)
    expect(screen.getByText("Building Dimensions")).toBeDefined();

    // Click Assemblies phase
    const assembliesBtn = screen.getByRole("button", { name: /Assemblies/i });
    fireEvent.click(assembliesBtn);

    // Phase 2 should be active with modular toggles
    expect(screen.getByText("Modular Assemblies Configuration")).toBeDefined();
    expect(screen.getByText("Foundation")).toBeDefined();
    expect(screen.getByText("Superstructure Walls")).toBeDefined();
    expect(screen.getByText("Roofing & Trusses")).toBeDefined();

    // Click Rates phase
    const ratesBtn = screen.getByRole("button", {
      name: /Material & Labor Rates/i,
    });
    fireEvent.click(ratesBtn);

    // Phase 3 should show Rate mode
    expect(screen.getByText("Material & Labor Rates Mode")).toBeDefined();
    expect(screen.getByText("Country Standard Rates")).toBeDefined();
    expect(screen.getByText("Custom Contractor Rates")).toBeDefined();

    // Direct jump back to Phase 1
    const envelopeBtn = screen.getByRole("button", { name: /Envelope/i });
    fireEvent.click(envelopeBtn);
    expect(screen.getByText("Building Dimensions")).toBeDefined();
  });

  it("toggles modular assembly stages on and off", () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );

    // Go to Assemblies phase
    fireEvent.click(screen.getByRole("button", { name: /Assemblies/i }));

    // By default 3 of 3 assemblies are active
    expect(screen.getByText("3 of 3 Assemblies Active")).toBeDefined();

    // Toggle Foundation off
    const foundationHeading = screen.getByText("Foundation");
    const foundationCard = foundationHeading.closest("[role='button']");
    expect(foundationCard).not.toBeNull();
    fireEvent.click(foundationCard!);

    // Now 2 of 3 should be active
    expect(screen.getByText("2 of 3 Assemblies Active")).toBeDefined();
    expect(
      screen.getByText(
        "Foundation & Substructure is currently excluded from calculation.",
      ),
    ).toBeDefined();

    // Toggle Walls off
    const wallsHeading = screen.getByText("Superstructure Walls");
    const wallsCard = wallsHeading.closest("[role='button']");
    fireEvent.click(wallsCard!);
    expect(screen.getByText("1 of 3 Assemblies Active")).toBeDefined();
    expect(
      screen.getByText(
        "Superstructure Blockwork & Walls are currently excluded from calculation.",
      ),
    ).toBeDefined();
  });

  it("switches between Country Standard Rates and Custom Contractor Rates", () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );

    // Go to Rates phase
    fireEvent.click(screen.getByRole("button", { name: /Rates & Pricing/i }));

    expect(screen.getByText(/Active: Country Standard Rates/i)).toBeDefined();

    // Click Custom Contractor Rates
    const customRatesBtn = screen.getByText("Custom Contractor Rates");
    fireEvent.click(customRatesBtn);

    expect(screen.getByText(/Active: Custom Contractor Rates/i)).toBeDefined();
  });

  it("generates Summary BOQ calculation and navigates to Phase 4", async () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );

    // Go to Rates phase and click Generate Summary BOQ
    fireEvent.click(screen.getByRole("button", { name: /Rates & Pricing/i }));
    const generateBtn = screen.getByRole("button", {
      name: /Generate Summary BOQ/i,
    });
    fireEvent.click(generateBtn);

    // Phase 4 summary BOQ should render
    await waitFor(() => {
      expect(screen.getByText(/total floor area/i)).toBeDefined();
      expect(screen.getByText(/Export quote \(PDF\)/i)).toBeDefined();
    });
  });

  it("handles Start fresh button with confirmation", () => {
    render(
      <MemoryRouter>
        <BuildToRoofEstimator />
      </MemoryRouter>,
    );

    const startFreshBtn = screen.getByText("Start fresh");
    fireEvent.click(startFreshBtn);

    expect(window.confirm).toHaveBeenCalled();
  });
});

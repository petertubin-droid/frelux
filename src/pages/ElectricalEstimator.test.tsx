import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ElectricalEstimator from "./ElectricalEstimator";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ showToast: vi.fn() })),
}));

describe("ElectricalEstimator", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/ElectricalEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  it("restores saved draft from localStorage and allows start fresh reset", async () => {
    localStorage.setItem(
      "frelux_draft_electrical_estimator",
      JSON.stringify({
        data: {
          buildingType: "Commercial: shop / office",
          counts: {
            lighting_points: "25",
            socket_points: "20",
            dedicated_points: "4",
            switches: "15",
            distribution_boards: "2",
          },
          runs: {
            avg_run_lighting_m: "12",
            avg_run_socket_m: "15",
            avg_run_dedicated_m: "20",
            avg_run_earth_m: "15",
            avg_run_feeder_m: "25",
          },
          labourMode: "per_point",
          labourRate: "2500",
        },
        savedAt: new Date().toISOString(),
      }),
    );

    render(
      <MemoryRouter>
        <ElectricalEstimator />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/restored your previous electrical calculation draft/i),
      ).toBeDefined();
    });

    const startFresh = screen.getByText("Start fresh");
    expect(startFresh).toBeDefined();
    fireEvent.click(startFresh);

    await waitFor(() => {
      expect(
        screen.queryByText(/restored your previous electrical calculation draft/i),
      ).toBeNull();
    });
  });
});

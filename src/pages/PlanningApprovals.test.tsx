import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("@/components/ui/AdSlot", () => ({
  default: ({ slotKey }: { slotKey: string }) => (
    <div data-testid={`ad-${slotKey}`} />
  ),
}));

import PlanningApprovals from "./PlanningApprovals";
import {
  ALL_JURISDICTIONS,
  NG_JURISDICTIONS,
  PLANNING_COUNTRIES,
  getJurisdictionsByCountry,
} from "@/lib/codes/planning-approvals";

describe("Planning approvals guide", () => {
  it("renders the guide heading and the FCT route by default", () => {
    render(
      <MemoryRouter>
        <PlanningApprovals />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: /building permit and setback guide/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/FCT Development Control Department/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Set by the local scheme/i).length,
    ).toBeGreaterThan(0);
  });

  it("covers all 36 states and the Federal Capital Territory", () => {
    const regions = NG_JURISDICTIONS.map((j) => j.region);
    expect(regions).toContain("Federal Capital Territory");
    expect(regions).toContain("Lagos");
    expect(
      regions.filter((r) => r !== "Federal Capital Territory"),
    ).toHaveLength(36);
    expect(new Set(regions).size).toBe(37);
  });

  it("never publishes a numeric setback without a stated basis", () => {
    for (const jurisdiction of ALL_JURISDICTIONS) {
      for (const rule of jurisdiction.setbacks) {
        expect(rule.basis.trim().length).toBeGreaterThan(0);
      }
      expect(jurisdiction.setbackNote.trim().length).toBeGreaterThan(0);
      expect(jurisdiction.approvals.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("marks every non numeric setback as scheme driven, not estimated", () => {
    const lagos = NG_JURISDICTIONS.find((j) => j.region === "Lagos");
    expect(lagos?.setbackStatus).toBe("indicative");
    const gb = getJurisdictionsByCountry("GB")[0];
    expect(gb.setbackStatus).toBe("set-by-scheme");
    expect(gb.setbacks).toHaveLength(0);
  });

  it("lists Nigeria first in the country picker", () => {
    expect(PLANNING_COUNTRIES[0].code).toBe("NG");
    expect(PLANNING_COUNTRIES.length).toBeGreaterThanOrEqual(20);
  });
});

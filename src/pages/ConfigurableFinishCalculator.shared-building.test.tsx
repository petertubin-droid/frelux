// A finish tool must be able to take its area from the shared building rather
// than asking the user to retype it, and it must take the right face: walls for
// paint, floors for screed and tiling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BuildingSizeProvider } from "@/lib/measurement/building-size-context";
import {
  draftsToSchedule,
  scheduleTotals,
} from "@/lib/measurement/building-schedule";
import type { RoomDraft } from "@/lib/measurement/building-presets";

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    market: { marketCode: "NG", country_name: "Nigeria" },
  }),
  // The page reads the symbol through the barrel, so the mock has to supply it.
  useCurrencySymbol: () => "NGN ",
}));
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useLanguage: () =>
      ({ t: (key: string) => key }) as unknown as ReturnType<
        typeof actual.useLanguage
      >,
  };
});
vi.mock("@/lib/seo", () => ({
  useSeo: () => {},
  useBreadcrumbJsonLd: () => {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import ConfigurableFinishCalculator from "./ConfigurableFinishCalculator";

const drafts: RoomDraft[] = [
  {
    id: "r1",
    spaceType: "bedroom",
    label: "Bedroom",
    length: 4,
    width: 3.5,
    height: 2.7,
    quantity: 1,
    doors: 1,
    windows: 1,
  },
];

function storeBuilding() {
  const schedule = draftsToSchedule(drafts, "meters", { label: "Two rooms" });
  window.localStorage.setItem(
    "frelux.building-size.v1",
    JSON.stringify({
      schedule,
      totals: scheduleTotals(schedule),
      label: "Two rooms",
      unit: "meters",
      drafts,
    }),
  );
}

const renderTool = () =>
  render(
    <MemoryRouter>
      <BuildingSizeProvider>
        <ConfigurableFinishCalculator
          category="mineral_stone"
          refPrefix="MST"
          title="Mineral Stone Calculator"
          subtitle="Deterministic Mineral Stone estimation."
          calcEvent="mineral_stone_calculated"
          calculatorType="mineral_stone"
          embedded
        />
      </BuildingSizeProvider>
    </MemoryRouter>,
  );

describe("finish calculator taking the shared building", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("offers the walls and the floors of the stored building", () => {
    storeBuilding();
    renderTool();
    expect(
      screen.getByRole("button", { name: /walls after openings/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /floors/i })).toBeTruthy();
  });

  it("offers the wall area after openings, not the gross face", () => {
    storeBuilding();
    renderTool();
    const button = screen.getByRole("button", {
      name: /walls after openings/i,
    });
    // 2 x (4 + 3.5) x 2.7 = 40.5 gross, less one door 1.89 and one window 1.8.
    expect(button.textContent).toContain("36.81 m²");
  });

  it("offers the floor area separately from the walls", () => {
    storeBuilding();
    renderTool();
    const button = screen.getByRole("button", { name: /floors/i });
    expect(button.textContent).toContain("14 m²");
  });

  it("offers nothing when no building is stored", () => {
    renderTool();
    expect(
      screen.queryByRole("button", { name: /walls after openings/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /floors/i })).toBeNull();
  });
});

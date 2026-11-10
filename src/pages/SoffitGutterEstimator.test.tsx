import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
  useFaqJsonLd: vi.fn(),
}));

// The calculator reads its rates from the shared material database. Here the
// market book quotes fascia only, so the other lines stay unpriced and the test
// can tell a real total from a substituted one.
vi.mock("@/components/calculators/useSpecialtyPrices", () => ({
  useSpecialtyPrices: () => ({
    priceMap: { "fascia-per-meter": 4200 },
    ruleRows: [],
    bookSummary: null,
    loading: false,
  }),
  mergePriceOverrides: (
    base: Record<string, number | null>,
    overrides: Record<string, string>,
  ) => {
    const merged = { ...base };
    for (const [slug, raw] of Object.entries(overrides)) {
      const n = Number(raw);
      if (raw.trim() !== "" && Number.isFinite(n) && n >= 0) merged[slug] = n;
    }
    return merged;
  },
}));

vi.mock("@/lib/measurement/building-size-context", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/measurement/building-size-context")
  >("@/lib/measurement/building-size-context");
  return { ...actual, useBuildingSize: () => ({ building: seeded.current, setBuilding: () => {} }) };
});
vi.mock("@/lib/pricing/price-book-context", () => ({
  usePriceBook: () => ({
    book: { version: 1, entries: [] },
    resolve: () => ({ rates: {}, skipped: [] }),
    saveEntry: () => ({ ok: false, reason: "not here" }),
    removeEntry: () => {},
  }),
}));

import SoffitGutterEstimator from "@/pages/SoffitGutterEstimator";
import { draftsToSchedule, scheduleTotals } from "@/lib/measurement/building-schedule";

const seeded: { current: unknown } = { current: null };

function seedBuilding(drafts: Parameters<typeof draftsToSchedule>[0]) {
  seeded.current = {
    schedule: draftsToSchedule(drafts, "meters"),
    totals: scheduleTotals(draftsToSchedule(drafts, "meters")),
    label: "Measured",
    unit: "meters",
    drafts,
  };
}

const room = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  spaceType: "living_room" as const,
  label: "Room 1",
  length: 10,
  width: 8,
  height: 3,
  quantity: 1,
  doors: 1,
  windows: 2,
  ...over,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <SoffitGutterEstimator />
    </MemoryRouter>,
  );

describe("Soffit, fascia and gutter page", () => {
  it("fills the footprint from the measured building and says the wall line is shorter", () => {
    seedBuilding([room()]);
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /Use the measured building footprint/i }),
    );
    const length = screen.getByLabelText(/Building length/i) as HTMLInputElement;
    const width = screen.getByLabelText(/Building width/i) as HTMLInputElement;
    expect(length.value).toBe("10.00");
    expect(width.value).toBe("8.00");
    expect(screen.getByRole("status").textContent ?? "").toMatch(
      /wall perimeter 36\.00 m/,
    );
  });

  it("refuses a multi-room footprint instead of averaging it", () => {
    seedBuilding([room(), room({ id: "r2", label: "Room 2", length: 4, width: 3 })]);
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: /Use the measured building footprint/i }),
    );
    expect(screen.getByRole("status").textContent ?? "").toMatch(/2 rooms/);
    // The footprint fields stay closed, so nothing can be typed into a shape the
    // schedule never measured.
    expect(screen.queryByLabelText(/Building length/i)).toBeNull();
  });
});

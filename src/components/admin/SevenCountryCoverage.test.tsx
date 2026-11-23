/**
 * SevenCountryCoverage conformance (admin coverage pass, 2026-11-23).
 *
 * The component's whole job is to not overstate coverage, so the tests check
 * the two counters it shows (open interfaces, and countries with supplier
 * prices), the sort order it promises, and that a failed read says so instead
 * of rendering an empty table that looks like "no coverage anywhere".
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { coverage, sources, state } = vi.hoisted(() => ({
  state: { coverageError: null as null | { message: string } },
  coverage: [
    {
      market: "GH",
      country_name: "Ghana",
      currency: "GHS",
      official_sources: 2,
      official_sources_live: 0,
      product_sources: 1,
      index_points: 10,
      latest_index_period: "2026-09",
      last_index_at: null,
      product_observations: 5,
      suppliers: 1,
      last_product_at: null,
      awaiting_approval: 0,
      open_alerts: 0,
      categories_priced: 3,
      categories_required: 16,
      priced_materials: 12,
      coverage_status: "index_only",
    },
    {
      market: "NG",
      country_name: "Nigeria",
      currency: "NGN",
      official_sources: 3,
      official_sources_live: 2,
      product_sources: 4,
      index_points: 40,
      latest_index_period: "2026-10",
      last_index_at: null,
      product_observations: 300,
      suppliers: 12,
      last_product_at: null,
      awaiting_approval: 0,
      open_alerts: 1,
      categories_priced: 16,
      categories_required: 16,
      priced_materials: 240,
      coverage_status: "covered",
    },
    {
      market: "KE",
      country_name: "Kenya",
      currency: "KES",
      official_sources: 1,
      official_sources_live: 1,
      product_sources: 0,
      index_points: 5,
      latest_index_period: "2026-08",
      last_index_at: null,
      product_observations: 0,
      suppliers: 0,
      last_product_at: null,
      awaiting_approval: 0,
      open_alerts: 0,
      categories_priced: 0,
      categories_required: 16,
      priced_materials: 0,
      coverage_status: "no_data",
    },
  ],
  sources: [
    {
      market: "NG",
      publisher: "NBS",
      source_class: "official_statistics",
      access_status: "live",
      licence_name: "Open",
    },
  ],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        const result =
          table === "country_coverage_seven"
            ? { data: coverage, error: state.coverageError }
            : { data: sources, error: null };
        const promise = Promise.resolve(result);
        return {
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
          finally: promise.finally.bind(promise),
          like: () => Promise.resolve(result),
        };
      },
    }),
  },
}));

import SevenCountryCoverage from "@/components/admin/SevenCountryCoverage";

beforeEach(() => {
  state.coverageError = null;
});

describe("SevenCountryCoverage counters", () => {
  it("counts only countries with a live official interface as open", async () => {
    render(<SevenCountryCoverage />);
    await waitFor(() => expect(screen.getByText("Nigeria")).toBeTruthy());
    // NG has 2 live interfaces, KE has 1, GH has 0: two countries, not three.
    expect(screen.getByText("2 open interfaces")).toBeTruthy();
  });

  it("does not count index-only or no-data countries as having supplier prices", async () => {
    render(<SevenCountryCoverage />);
    await waitFor(() => expect(screen.getByText("Nigeria")).toBeTruthy());
    // Only NG is beyond index_only and no_data.
    expect(screen.getByText("1 with supplier prices")).toBeTruthy();
  });

  it("sorts countries by name rather than by feed order", async () => {
    const { container } = render(<SevenCountryCoverage />);
    await waitFor(() => expect(screen.getByText("Nigeria")).toBeTruthy());

    const names = ["Ghana", "Kenya", "Nigeria"];
    const order = names
      .map((n) => container.textContent?.indexOf(n) ?? -1)
      .filter((i) => i >= 0);
    expect(order).toHaveLength(3);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("SevenCountryCoverage failure handling", () => {
  it("says the read failed instead of showing an empty table as zero coverage", async () => {
    state.coverageError = { message: "permission denied" };
    render(<SevenCountryCoverage />);

    await waitFor(() =>
      expect(screen.getByText(/Could not read coverage data/i)).toBeTruthy(),
    );
  });
});

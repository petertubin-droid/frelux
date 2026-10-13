/**
 * Admin Price Pipeline page tests (Phase 5+6+7)
 *
 * Pin the admin surface wiring: run history from price_scan_runs,
 * the rankings book rendering WITH sources, and the core honesty
 * rule — the "Add sourced metric" form refuses to store an
 * unsourced metric.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPricePipeline from "./AdminPricePipeline";

const mockRuns = vi.hoisted(() => [
  {
    id: "aaaabbbb-1111-2222-3333-444455556666",
    trigger: "cron",
    markets: [],
    status: "completed",
    sources_total: 49,
    sources_scanned: 49,
    candidates_created: 40,
    candidates_failed: 9,
    notes: "9 source-level failures; first: US/interior-paint (blocked)",
    error: null,
    started_at: "2026-10-13T06:40:00Z",
    finished_at: "2026-10-13T06:41:30Z",
  },
]);

const mockRankings = vi.hoisted(() => [
  {
    id: "r1",
    market_code: "US",
    metric: "construction_output",
    value: 2190,
    unit: "billion USD (SAAR, Dec 2024)",
    source_name: "U.S. Census Bureau",
    source_url: "https://www.census.gov/constructionspending/",
    as_of: "2024-12-01",
    confidence: "medium",
    notes: null,
    is_active: true,
  },
  {
    id: "r2",
    market_code: "NG",
    metric: "frelux_coverage_level",
    value: 3,
    unit: "level",
    source_name: "FRELUX internal",
    source_url: null,
    as_of: "2026-10-13",
    confidence: "high",
    notes: null,
    is_active: true,
  },
]);

const mockMarkets = vi.hoisted(() => [
  { country_code: "NG", country_name: "Nigeria" },
  { country_code: "US", country_name: "United States" },
]);

const insertState = vi.hoisted(() => ({
  error: null as null | { message: string },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const data =
        table === "price_scan_runs"
          ? mockRuns
          : table === "market_rankings"
            ? mockRankings
            : table === "market_profiles"
              ? mockMarkets
              : [];
      void 0;
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (_c: string, _v: unknown) => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data, error: null }),
        update: () => chain,
        upsert: () => Promise.resolve({ error: insertState.error }),
        then: (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
          Promise.resolve({ data, error: null }).then(resolve, reject),
      };
      return chain;
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null }) },
  },
  getFunctionErrorMessage: vi.fn(async () => "function error"),
}));
vi.mock("@/lib/safeError", () => ({
  getSafeError: vi.fn((e: unknown, fallback: string) =>
    e instanceof Error ? e.message : fallback,
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPricePipeline />
    </MemoryRouter>,
  );
}

describe("AdminPricePipeline page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertState.error = null;
  });

  it("renders the pipeline run history with counts", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/49\/49/)).toBeTruthy();
    });
    expect(screen.getByText(/40 filed/)).toBeTruthy();
    expect(screen.getByText("cron")).toBeTruthy();
    expect(screen.getByText(/9 source-level failures/)).toBeTruthy();
  });

  it("renders external ranking rows with their source, frelux rows excluded", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("construction_output")).toBeTruthy();
    });
    expect(screen.getByText("U.S. Census Bureau")).toBeTruthy();
    // frelux_* rows never appear in the rankings table
    expect(screen.queryByText("frelux_coverage_level")).toBeNull();
  });

  it("refuses to save an unsourced metric (never invent provenance)", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Market rankings")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Add sourced metric"));
    // Fill value + unit but leave the source BLANK: the refusal must
    // come from the source rule specifically.
    const valueInput = (await screen.findAllByRole("textbox")).find(
      (el) =>
        el instanceof HTMLInputElement &&
        el.getAttribute("inputMode") === "decimal",
    ) as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: "500" } });
    const unitInput = screen.getByLabelText(
      /Unit \(with currency/,
    ) as HTMLInputElement;
    fireEvent.change(unitInput, { target: { value: "billion USD (2024)" } });
    const save = await screen.findByText("Save metric");
    fireEvent.click(save);
    await waitFor(() => {
      expect(
        screen.getByText(
          /Source name is required: unsourced metrics are never stored/i,
        ),
      ).toBeTruthy();
    });
  });

  it("shows the scan notice explaining nothing was auto-applied", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase.functions.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        run_id: "ccccdddd-1111-2222-3333-444455556666",
        sources: 49,
        candidates_created: 40,
        candidates_failed: 9,
      },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Run scheduled scan now")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Run scheduled scan now"));
    await waitFor(() => {
      expect(screen.getByText(/Nothing was auto-applied/i)).toBeTruthy();
    });
  });
});

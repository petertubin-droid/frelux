/**
 * PredictiveAnalytics page tests — FRELUX engine #3 UI
 * (2026-10-15). The persistence and validation fetchers are
 * mocked; every number shown comes from the tested pure chain
 * (outcomes -> data-quality -> backtest -> safety).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PredictiveAnalytics from "./PredictiveAnalytics";

const mockFetchOutcomes = vi.fn();
const mockSaveOutcome = vi.fn();
const mockFetchValidation = vi.fn();

vi.mock("@/lib/predictive-intelligence/outcomes", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/predictive-intelligence/outcomes")
  >();
  return {
    ...actual,
    fetchProjectOutcomes: (...a: unknown[]) => mockFetchOutcomes(...a),
    saveProjectOutcome: (...a: unknown[]) => mockSaveOutcome(...a),
  };
});

vi.mock("@/lib/predictive-intelligence/safety", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/predictive-intelligence/safety")
  >();
  return {
    ...actual,
    fetchSafetyValidation: (...a: unknown[]) => mockFetchValidation(...a),
  };
});

let seq = 0;
function record(
  id: string,
  actual_end_date: string,
  delay_days: number | null,
  cost_overrun_pct: number | null,
) {
  seq++;
  return {
    id,
    user_id: null,
    project_id: null,
    market_code: "NG",
    project_type: seq % 3 === 0 ? "bungalow" : "detached duplex",
    finish_quality: null,
    size_m2: 100 + seq,
    stories: 2,
    planned_start_date: null,
    planned_end_date: null,
    actual_end_date,
    budgeted_amount: null,
    budgeted_currency: "NGN",
    final_amount: null,
    delay_days,
    cost_overrun_pct,
    safety_incident_count: 0,
    rfi_count: null,
    weather_delay_days: null,
    notes: null,
    created_at: actual_end_date,
  };
}

beforeEach(() => {
  mockFetchOutcomes.mockReset();
  mockSaveOutcome.mockReset();
  mockFetchValidation.mockReset().mockResolvedValue(null);
});

describe("PredictiveAnalytics", () => {
  it("renders the honest empty state: no invented dataset, back-test refuses", async () => {
    mockFetchOutcomes.mockResolvedValue({ ok: true, records: [] });
    render(<PredictiveAnalytics />);
    expect(await screen.findByText(/0 outcome records/)).toBeInTheDocument();
    // Both back-test panels (delay + cost) refuse — duplicate by design.
    expect(
      screen.getAllByText(/No target could be scored/i).length,
    ).toBe(2);
    expect(
      screen.getByText(/pending independent validation/i),
    ).toBeInTheDocument();
    // The safety panel refuses honestly (insufficient history), and
    // the h3 itself carries the permanent decision-support label.
    expect(
      screen.getByText(/Safety risk — decision support only/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not substitute national averages/i),
    ).toBeInTheDocument();
  });

  it("renders dataset stats, data-quality verdicts and back-test disclosure", async () => {
    const records = [
      ...Array.from({ length: 20 }, (_, i) =>
        record(
          `r${i}`,
          `2026-0${(i % 7) + 1}-1${i % 10}`,
          i % 2 === 0 ? 10 : 14,
          5,
        ),
      ),
    ];
    mockFetchOutcomes.mockResolvedValue({ ok: true, records });
    render(<PredictiveAnalytics />);
    expect(await screen.findByText(/20 outcome records/)).toBeInTheDocument();
    expect(await screen.findByText(/Regional data quality/)).toBeInTheDocument();
    expect(screen.getByText("Walk-forward back-test (market-mean baseline)")).toBeInTheDocument();
    expect(
      screen.getAllByText(/strictly earlier completions/).length,
    ).toBeGreaterThan(0);
  });

  it("shows the save form's honest refusal when validation fails", async () => {
    mockFetchOutcomes.mockResolvedValue({ ok: true, records: [] });
    mockSaveOutcome.mockResolvedValue({
      ok: false,
      error:
        'Unknown market "XX". The outcome dataset only accepts the 20 registered markets.',
    });
    render(<PredictiveAnalytics />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Add completed project/i }),
    );
    fireEvent.change(screen.getByPlaceholderText(/detached duplex/i), {
      target: { value: "highrise" },
    });
    fireEvent.change(
      screen.getByLabelText(/Actual end date \*/i),
      { target: { value: "2026-09-30" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Save outcome/i }));
    await waitFor(() => {
      expect(mockSaveOutcome).toHaveBeenCalled();
    });
    expect(
      await screen.findByText(/Unknown market "XX"/),
    ).toBeInTheDocument();
  });

  it("saves a valid outcome and refreshes the dataset", async () => {
    mockFetchOutcomes.mockResolvedValue({ ok: true, records: [] });
    mockSaveOutcome.mockResolvedValue({ ok: true });
    render(<PredictiveAnalytics />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Add completed project/i }),
    );
    fireEvent.change(screen.getByPlaceholderText(/detached duplex/i), {
      target: { value: "detached duplex" },
    });
    fireEvent.change(
      screen.getByLabelText(/Actual end date \*/i),
      { target: { value: "2026-09-30" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Save outcome/i }));
    await waitFor(() => {
      expect(mockSaveOutcome).toHaveBeenCalledWith(
        expect.objectContaining({
          market_code: "NG",
          project_type: "detached duplex",
          actual_end_date: "2026-09-30",
        }),
      );
    });
  });

  it("renders the validated badge when an independent validation record exists", async () => {
    mockFetchOutcomes.mockResolvedValue({ ok: true, records: [] });
    mockFetchValidation.mockResolvedValue({
      id: "v1",
      model_scope: "safety_risk",
      method: "Independent expert review",
      validator_name: "External review board",
      validated_on: "2026-10-01",
      scope_summary: "NG, 20 projects",
      limitations: "Decision support only.",
      created_at: "2026-10-01T00:00:00Z",
    });
    render(<PredictiveAnalytics />);
    expect(
      await screen.findByText(/independently validated/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Limitations: Decision support only\./)).toBeInTheDocument();
  });
});

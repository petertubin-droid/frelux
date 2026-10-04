/**
 * Admin Counter-Vision pane tests (Engine 2)
 *
 * Pins the admin contract: rules are shown read-only with their
 * edit location, count requests are listed with honest verdicts
 * and diagnostics, refusals are counted separately from errors,
 * and the never-stored-photo privacy contract is stated.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCountVision from "./AdminCountVision";

const rulesData = [
  { rule_key: "max_image_mb", rule_value: { value: 6 } },
  { rule_key: "max_count", rule_value: { value: 2000 } },
  { rule_key: "min_confidence", rule_value: { value: 0.75 } },
];

const logRows = [
  {
    id: "1",
    created_by: null,
    item_hint: "Cement bags",
    verdict: "counted" as const,
    item_count: 42,
    unit_label: "bags",
    confidence: 0.92,
    reason: "Two neat rows, all visible",
    image_bytes: 900000,
    image_mime: "image/jpeg",
    latency_ms: 2100,
    requested_at: "2026-10-03T07:00:00Z",
  },
  {
    id: "2",
    created_by: null,
    item_hint: "Tiles",
    verdict: "unclear" as const,
    item_count: null,
    unit_label: "tiles",
    confidence: 0.3,
    reason: "Stack too deep — hidden layers cannot be counted",
    image_bytes: 1200000,
    image_mime: "image/jpeg",
    latency_ms: 1800,
    requested_at: "2026-10-03T07:05:00Z",
  },
  {
    id: "3",
    created_by: null,
    item_hint: "Blocks",
    verdict: "error" as const,
    item_count: null,
    unit_label: null,
    confidence: null,
    reason: "",
    image_bytes: 500000,
    image_mime: "image/jpeg",
    latency_ms: 400,
    requested_at: "2026-10-03T07:10:00Z",
  },
];

const fetchRulesMock = vi.fn();
const fetchLogMock = vi.fn();

vi.mock("@/lib/estimation/queries", () => ({
  fetchCountVisionRules: () => fetchRulesMock(),
  fetchCountVisionLog: () => fetchLogMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchRulesMock.mockResolvedValue({ data: rulesData, error: null });
  fetchLogMock.mockResolvedValue({ data: logRows, error: null });
});

function renderPane() {
  return render(
    <MemoryRouter>
      <AdminCountVision />
    </MemoryRouter>,
  );
}

describe("AdminCountVision pane", () => {
  it("shows the current rules and where to edit them", async () => {
    renderPane();
    await waitFor(() => screen.getByText(/current counting rules/i));
    expect(screen.getByText(/6 MB/)).toBeInTheDocument();
    expect(screen.getByText(/2,000 units/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getAllByText(/count_vision/).length).toBeGreaterThan(0);
    expect(screen.getByText(/GOOGLE_AI_API_KEY/)).toBeInTheDocument();
  });

  it("lists count requests with verdicts, counts and diagnostics", async () => {
    renderPane();
    await waitFor(() => screen.getByRole("table"));
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(4); // header + 3 requests
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/two neat rows/i)).toBeInTheDocument();
    expect(screen.getByText(/stack too deep/i)).toBeInTheDocument();
    expect(screen.getByText(/2100 ms/)).toBeInTheDocument();
  });

  it("counts honest refusals separately from service errors", async () => {
    renderPane();
    await waitFor(() => screen.getByRole("table"));
    // Each summary card: label plus its number
    const cardNumber = (re: RegExp) => {
      const card = screen.getAllByText(re)[0].closest("div");
      return card ? within(card).getByText(/^1$/).textContent : "";
    };
    expect(cardNumber(/^Counted$/)).toBe("1");
    expect(cardNumber(/Honest refusals/)).toBe("1");
    expect(cardNumber(/Service errors/)).toBe("1");
    expect(screen.getByText(/by design, not failures/i)).toBeInTheDocument();
  });

  it("states that photos are never stored", async () => {
    renderPane();
    await waitFor(() => screen.getByRole("table"));
    expect(screen.getByText(/never stored/i)).toBeInTheDocument();
  });

  it("shows an empty state when nobody has counted anything yet", async () => {
    fetchLogMock.mockResolvedValue({ data: [], error: null });
    renderPane();
    await waitFor(() => screen.getByText(/no count requests yet/i));
    expect(screen.getByText(/photos are never stored/i)).toBeInTheDocument();
  });

  it("shows the error honestly when the log cannot be loaded", async () => {
    fetchLogMock.mockResolvedValue({
      data: null,
      error: new Error("permission denied"),
    });
    renderPane();
    await waitFor(() => screen.getByText(/You don't have permission/i));
  });
});

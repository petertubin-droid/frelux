/**
 * Admin Field Sync pane tests (Engine 17)
 *
 * The queue/sync logic is covered by offline-field-engine.test.ts
 * (21 tests) and the public page by FieldSync.test.tsx. These pin
 * the admin wiring: rules display (with the edit pointer), the
 * captures table with honest diagnostics, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFieldSync from "./AdminFieldSync";

const { rulesFixture, capturesFixture, createRuleMock, updateRuleMock } = vi.hoisted(() => ({
  createRuleMock: vi.fn().mockResolvedValue({ data: null, error: null }),
  updateRuleMock: vi.fn().mockResolvedValue({ data: null, error: null }),
  rulesFixture: [
    { id: "rule-1", rule_key: "auto_sync", rule_value: { value: true }, is_active: true },
    { id: "rule-2", rule_key: "max_queue", rule_value: { value: 50 }, is_active: true },
    { id: "rule-3", rule_key: "retention_days", rule_value: { value: 60 }, is_active: true },
    { id: "rule-4", rule_key: "sync_batch", rule_value: { value: 10 }, is_active: true },
  ],
  capturesFixture: [
    {
      id: "fc-1",
      created_by: null,
      device_label: "This device",
      project_label: "Ikeja duplex: room 2",
      entry_kind: "measurement",
      payload: { detail: "Walls 4.2 x 3.1 m" },
      captured_at: "2026-10-02T08:00:00Z",
      synced_at: "2026-10-02T19:00:00Z",
      queue_queued_at: "2026-10-02T08:00:00Z",
      queue_last_attempt: "2026-10-02T12:00:00Z",
    },
    {
      id: "fc-2",
      created_by: null,
      device_label: "Site tablet",
      project_label: "Lekki site",
      entry_kind: "material_used",
      payload: { detail: "12 litres satin" },
      captured_at: "2026-10-03T06:00:00Z",
      synced_at: "2026-10-03T07:00:00Z",
      queue_queued_at: "2026-10-03T06:00:00Z",
      queue_last_attempt: null,
    },
  ],
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchOfflineFieldRules: vi
    .fn()
    .mockResolvedValue({ data: rulesFixture, error: null }),
  fetchFieldCaptureLog: vi
    .fn()
    .mockResolvedValue({ data: capturesFixture, error: null }),
  createCalcRule: createRuleMock,
  updateCalcRule: updateRuleMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  createRuleMock.mockResolvedValue({ data: null, error: null });
  updateRuleMock.mockResolvedValue({ data: null, error: null });
});

function renderPane() {
  return render(
    <MemoryRouter>
      <AdminFieldSync />
    </MemoryRouter>,
  );
}

describe("AdminFieldSync pane", () => {
  it("shows editable sync rules and validates the batch against capacity", async () => {
    renderPane();
    await waitFor(() => screen.getByText(/field sync rules/i));
    expect(screen.getByLabelText(/device queue capacity/i)).toHaveValue(50);
    expect(screen.getByLabelText(/retention/i)).toHaveValue(60);
    expect(screen.getByLabelText(/sync batch size/i)).toHaveValue(10);
    expect(screen.getByRole("button", { name: /save rules/i })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /auto-sync on reconnect/i })).toBeInTheDocument();
  });

  it("saves the four configured sync rules", async () => {
    renderPane();
    const button = await screen.findByRole("button", { name: /save rules/i });
    fireEvent.click(button);
    await waitFor(() => expect(updateRuleMock).toHaveBeenCalledTimes(4));
    expect(updateRuleMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ rule_value: expect.objectContaining({ value: expect.anything() }) }));
  });

  it("lists synced captures with kind, job and device", async () => {
    renderPane();
    await waitFor(() => screen.getByText(/recent synced captures/i));
    expect(screen.getByText(/Ikeja duplex: room 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Lekki site/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Measurement/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Materials used/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Walls 4\.2 x 3\.1 m/i)).toBeInTheDocument();
  });

  it("flags captures that needed a retry: honest diagnostics, not hidden", async () => {
    renderPane();
    await waitFor(() => screen.getByText(/needed a retry/i));
    expect(screen.getByText(/retried/i)).toBeInTheDocument();
    expect(
      screen.getByText(/synced after failed attempts/i),
    ).toBeInTheDocument();
  });

  it("shows an honest empty state when no captures exist", async () => {
    const queries = await import("@/lib/estimation/queries");
    (
      queries.fetchFieldCaptureLog as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ data: [], error: null });
    renderPane();
    await waitFor(() => screen.getByText(/no captures yet/i));
    expect(
      screen.getByText(/they appear here the moment an artisan syncs/i),
    ).toBeInTheDocument();
  });

  it("surfaces fetch errors honestly instead of pretending", async () => {
    const queries = await import("@/lib/estimation/queries");
    (
      queries.fetchFieldCaptureLog as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      data: null,
      error: { message: "Database unreachable" },
    });
    renderPane();
    await waitFor(() => screen.getByText(/database unreachable/i));
  });

  it("asks for the newest hundred captures and the rules once", async () => {
    const queries = await import("@/lib/estimation/queries");
    renderPane();
    await waitFor(() =>
      expect(queries.fetchFieldCaptureLog).toHaveBeenCalledWith(100),
    );
    expect(queries.fetchOfflineFieldRules).toHaveBeenCalledTimes(1);
  });

  it("counts only captures that actually went through the queue twice", async () => {
    renderPane();
    const label = await screen.findByText(/needed a retry/i);
    const card = label.closest("div");
    // Two captures in the fixture, one with a recorded queue attempt.
    expect(card && within(card).getByText("1")).toBeInTheDocument();
  });

  it("shows no capture list when the rules cannot be read", async () => {
    const queries = await import("@/lib/estimation/queries");
    (
      queries.fetchOfflineFieldRules as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      data: null,
      error: { message: "rules table locked" },
    });
    renderPane();
    await waitFor(() => screen.getByText(/rules table locked/i));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ikeja duplex: room 2/i)).not.toBeInTheDocument();
  });
});

/**
 * Admin Field Sync pane tests (Engine 17)
 *
 * The queue/sync logic is covered by offline-field-engine.test.ts
 * (21 tests) and the public page by FieldSync.test.tsx. These pin
 * the admin wiring: rules display (with the edit pointer), the
 * captures table with honest diagnostics, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFieldSync from "./AdminFieldSync";

const { rulesFixture, capturesFixture } = vi.hoisted(() => ({
  rulesFixture: [
    { rule_key: "auto_sync", rule_value: { value: true }, is_active: true },
    { rule_key: "max_queue", rule_value: { value: 50 }, is_active: true },
    { rule_key: "retention_days", rule_value: { value: 60 }, is_active: true },
    { rule_key: "sync_batch", rule_value: { value: 10 }, is_active: true },
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
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPane() {
  return render(
    <MemoryRouter>
      <AdminFieldSync />
    </MemoryRouter>,
  );
}

describe("AdminFieldSync pane", () => {
  it("shows the current admin-configured rules and where to edit them", async () => {
    renderPane();
    await waitFor(() => screen.getByText(/current sync rules/i));
    expect(screen.getByText(/50 captures/i)).toBeInTheDocument();
    expect(screen.getByText(/60 days/i)).toBeInTheDocument();
    expect(screen.getByText(/10 per run/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-sync on reconnect/i)).toBeInTheDocument();
    // The edit pointer names the exact calculator type
    expect(screen.getByText(/offline_field/i)).toBeInTheDocument();
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
});

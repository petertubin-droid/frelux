// =========================================================
// ARCHIE PWA — ANATOMY VIEW (mobile)
//
// Real probes only: statuses come from the archie-anatomy
// edge function; NOT_OPERATIONAL organs are shown honestly,
// never faked. Failures surface in the alert region.
// =========================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const invokeMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import ArchieAnatomyView from "@/pages/archie/ArchieAnatomyView";

function subsystem(over: Record<string, unknown> = {}) {
  return {
    key: "core",
    organ: "🧠",
    name: "Core Cognition",
    purpose: "The reasoning core.",
    code_bindings: ["archie-core"],
    data_bindings: ["archie_state"],
    operational: true,
    criticality: "CRITICAL",
    live_status: {
      status: "HEALTHY",
      metric: "99.9% uptime",
      details: {},
      checked_at: "2026-09-16T00:00:00.000Z",
    },
    ...over,
  };
}

function anatomyResponse() {
  return {
    constitution: { version: 3, verified: true },
    anatomy: [
      subsystem(),
      subsystem({
        key: "offline_organ",
        organ: "🦴",
        name: "Legacy Organ",
        purpose: "Not yet built.",
        code_bindings: [],
        data_bindings: [],
        operational: false,
        live_status: {
          status: "NOT_OPERATIONAL",
          metric: null,
          details: {},
          checked_at: "2026-09-16T00:00:00.000Z",
        },
      }),
    ],
    summary: {
      healthy: 1,
      degraded: 0,
      offline: 0,
      not_operational: 1,
      total: 2,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  invokeMock.mockResolvedValue({ data: anatomyResponse(), error: null });
});

describe("ArchieAnatomyView", () => {
  it("renders the live summary and the verified constitution", async () => {
    render(<ArchieAnatomyView />);
    expect(
      await screen.findByText(
        /1 healthy · 0 degraded · 0 offline · 1 not operational \(of 2\)/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/DNA v3 verified/i)).toBeTruthy();
  });

  it("shows each subsystem's honest live status", async () => {
    render(<ArchieAnatomyView />);
    await screen.findByText("Core Cognition");
    expect(screen.getByText("99.9% uptime")).toBeTruthy();
    expect(screen.getByText("HEALTHY")).toBeTruthy();
    expect(screen.getByText("NOT_OPERATIONAL")).toBeTruthy();
  });

  it("expands a subsystem to its real bindings and purpose", async () => {
    render(<ArchieAnatomyView />);
    fireEvent.click(await screen.findByText("Core Cognition"));
    expect(screen.getByText(/The reasoning core\./i)).toBeTruthy();
    expect(screen.getByText(/Real binding:/i)).toBeTruthy();
    expect(screen.getByText(/archie-core/i)).toBeTruthy();
    expect(screen.getByText(/archie_state/i)).toBeTruthy();
  });

  it("admits NOT_OPERATIONAL organs honestly — never faked", async () => {
    render(<ArchieAnatomyView />);
    fireEvent.click(await screen.findByText("Legacy Organ"));
    expect(
      screen.getByText(/Honestly NOT_OPERATIONAL — never faked\./i),
    ).toBeTruthy();
    expect(screen.getByText(/\(no backend yet\)/i)).toBeTruthy();
  });

  it("collapses an expanded subsystem on a second tap", async () => {
    render(<ArchieAnatomyView />);
    fireEvent.click(await screen.findByText("Core Cognition"));
    expect(screen.getByText(/The reasoning core\./i)).toBeTruthy();
    fireEvent.click(screen.getByText("Core Cognition"));
    expect(screen.queryByText(/The reasoning core\./i)).toBeNull();
  });

  it("surfaces probe failure honestly in the alert region", async () => {
    invokeMock.mockResolvedValue({
      data: { error: "probe backend down" },
      error: null,
    });
    render(<ArchieAnatomyView />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/probe backend down/i)).toBeTruthy();
  });

  it("re-probes on the Probe button", async () => {
    render(<ArchieAnatomyView />);
    await screen.findByText("Core Cognition");
    fireEvent.click(screen.getByRole("button", { name: /probe/i }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2));
  });
});

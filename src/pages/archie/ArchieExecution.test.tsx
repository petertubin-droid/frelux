import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const listTargets = vi.fn();
const runTarget = vi.fn();
const history = vi.fn();

const getUserMock = vi.fn(async () => ({ data: { user: { id: "u1" } } }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: () => getUserMock() },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { role: "admin" } }) }),
      }),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/lib/archie/execution-client", () => ({
  listExecutionTargets: (...a: unknown[]) => listTargets(...a),
  runExecution: (...a: unknown[]) => runTarget(...a),
  getExecutionHistory: (...a: unknown[]) => history(...a),
}));

import ArchieExecution from "@/pages/archie/ArchieExecution";

const TARGETS = [
  {
    key: "health-check",
    label: "Platform Health Check",
    description: "Read-only health probe.",
    kind: "EDGE_FUNCTION",
    environment: "SANDBOX",
    requires_owner_secret: false,
    allowed_initiators: ["ARCHIE_CHAT", "OWNER_PWA"],
    risk_class: "STANDARD",
    enabled: true,
    http_method: "GET",
    idempotent: true,
  },
  {
    key: "sitemap-regenerate",
    label: "Sitemap Regeneration",
    description: "Production sitemap rebuild.",
    kind: "EDGE_FUNCTION",
    environment: "PRODUCTION",
    requires_owner_secret: true,
    allowed_initiators: ["OWNER_PWA"],
    risk_class: "ELEVATED",
    enabled: true,
    http_method: "GET",
    idempotent: true,
  },
];

const RUNS = [
  {
    id: "run-1",
    target_key: "health-check",
    environment: "SANDBOX",
    status: "SUCCESS",
    attempts: 1,
    duration_ms: 240,
    initiator_system: "OWNER_PWA",
    authority_method: "JWT_ADMIN",
    created_date: "2026-09-10T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  listTargets.mockResolvedValue({ ok: true, targets: TARGETS });
  history.mockResolvedValue({ ok: true, runs: RUNS });
  runTarget.mockResolvedValue({ ok: true, status: "SUCCESS", runId: "run-9", attempts: 1 });
});

describe("ArchieExecution console", () => {
  it("gates non-owners out", async () => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValueOnce({ data: { user: null } } as never);
    render(<ArchieExecution />);
    await waitFor(() =>
      expect(screen.getByText("Owner access only.")).toBeTruthy(),
    );
    getUserMock.mockReset();
    getUserMock.mockImplementation(async () => ({
      data: { user: { id: "u1" } },
    }));
  });

  it("shows the target registry with environment badges", async () => {
    render(<ArchieExecution />);
    await waitFor(() =>
      expect(screen.getByText("Platform Health Check")).toBeTruthy(),
    );
    expect(screen.getByText("SANDBOX")).toBeTruthy();
    expect(screen.getByText("PRODUCTION")).toBeTruthy();
    expect(screen.getByText("Owner Secret required")).toBeTruthy();
  });

  it("shows the audit history", async () => {
    render(<ArchieExecution />);
    const historyTab = screen.getByRole("button", { name: "history" });
    historyTab.click();
    await waitFor(() => expect(screen.getByText("health-check")).toBeTruthy());
    expect(screen.getByText("SUCCESS")).toBeTruthy();
    expect(
      screen.getAllByText((_, el) =>
        el?.textContent?.includes("OWNER_PWA") ?? false,
      ).length,
    ).toBeGreaterThan(0);
  });
});

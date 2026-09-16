import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listTargets = vi.fn();
const runTarget = vi.fn();
const history = vi.fn();

const getUserMock = vi.fn(async () => ({ data: { user: { id: "u1" } } }));

// RequireOwner gate reads the auth context, not the supabase
// client — the honest Owner boundary is the component's.
const authState = vi.fn(() => ({
  user: { id: "u1" },
  profile: { role: "admin", id: "u1" },
  isAdmin: true,
  loading: false,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => authState() }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: () => getUserMock() },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: "admin" } }),
        }),
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
  runTarget.mockResolvedValue({
    ok: true,
    status: "SUCCESS",
    runId: "run-9",
    attempts: 1,
  });
});

describe("ArchieExecution console", () => {
  it("gates non-owners out with the honest recorded boundary", async () => {
    getUserMock.mockReset();
    getUserMock.mockResolvedValueOnce({ data: { user: null } } as never);
    authState.mockReset();
    authState.mockReturnValue({
      user: { id: "u2" },
      profile: { role: "user", id: "u2" },
      isAdmin: false,
      loading: false,
    });
    render(
      <MemoryRouter>
        <ArchieExecution />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Owner access only")).toBeTruthy(),
    );
    expect(screen.getByText(/This attempt is recorded/i)).toBeTruthy();
    // restore the owner default for the tests that follow
    authState.mockReset();
    authState.mockReturnValue({
      user: { id: "u1" },
      profile: { role: "admin", id: "u1" },
      isAdmin: true,
      loading: false,
    });
    getUserMock.mockReset();
    getUserMock.mockImplementation(async () => ({
      data: { user: { id: "u1" } },
    }));
  });

  it("shows the target registry with environment badges", async () => {
    render(
      <MemoryRouter>
        <ArchieExecution />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Platform Health Check")).toBeTruthy(),
    );
    expect(screen.getByText("SANDBOX")).toBeTruthy();
    expect(screen.getByText("PRODUCTION")).toBeTruthy();
    expect(screen.getByText("Owner Secret required")).toBeTruthy();
  });

  it("shows the audit history", async () => {
    render(
      <MemoryRouter>
        <ArchieExecution />
      </MemoryRouter>,
    );
    const historyTab = screen.getByRole("button", { name: "history" });
    historyTab.click();
    await waitFor(() => expect(screen.getByText("health-check")).toBeTruthy());
    expect(screen.getByText("SUCCESS")).toBeTruthy();
    expect(
      screen.getAllByText(
        (_, el) => el?.textContent?.includes("OWNER_PWA") ?? false,
      ).length,
    ).toBeGreaterThan(0);
  });
});

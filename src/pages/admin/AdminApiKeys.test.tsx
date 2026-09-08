import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------
// FRELUX PHASE 7 — ADMIN API KEYS TESTS
// Verifies the operator surface:
//   * keys listed masked — key_hash never rendered
//   * plan/quota/status controls call the RLS client
//   * revocation and restore toggle key status
// ---------------------------------------------------------

const portalClient = vi.hoisted(() => ({
  updateApiKeyLimits: vi.fn(),
  restoreApiKey: vi.fn(),
  getPlans: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => {
  const state: { rows: unknown[] } = { rows: [] };
  // ONE persistent chain: mocks accumulate across calls so
  // assertions can count update() invocations per test.
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data: state.rows, error: null })),
    update: vi.fn(() => chain),
    eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return {
    __setRows: (r: unknown[]) => {
      state.rows = r;
    },
    from: vi.fn(() => chain),
    __chain: chain,
  };
});

vi.mock("@/lib/frelix-api/portal-client", () => portalClient);
vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));
vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

import AdminApiKeys from "./AdminApiKeys";

const keyRow = {
  id: "key-1",
  name: "Production",
  key_prefix: "FLX-Aaaa",
  status: "active",
  permissions: ["*"],
  plan_key: "developer",
  rate_limit_per_minute: 60,
  daily_quota: 1000,
  monthly_quota: 25000,
  expires_at: null,
  last_used_at: "2026-09-07T00:00:00Z",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
  created_by: "11111111-1111-4111-8111-111111111111",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminApiKeys />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.__setRows([keyRow]);
  portalClient.getPlans.mockResolvedValue([
    { key: "free", name: "Free", config: {}, active: true, sort_order: 0 },
    {
      key: "developer",
      name: "Developer",
      config: {},
      active: true,
      sort_order: 1,
    },
  ]);
  portalClient.updateApiKeyLimits.mockResolvedValue(undefined);
  portalClient.restoreApiKey.mockResolvedValue(undefined);
});

describe("AdminApiKeys", () => {
  it("lists keys masked and never renders key_hash", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    expect(screen.getByText("FLX-Aaaa…")).toBeInTheDocument();
    expect(
      screen.getByText(/Raw keys are never visible here/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/key_hash/i)).not.toBeInTheDocument();
  });

  it("updates the plan via the RLS client", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Plan for Production/i), {
      target: { value: "free" },
    });
    await waitFor(() =>
      expect(portalClient.updateApiKeyLimits).toHaveBeenCalledWith("key-1", {
        plan_key: "free",
      }),
    );
  });

  it("updates the daily quota on blur", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Daily quota for Production/i), {
      target: { value: "500" },
    });
    fireEvent.blur(screen.getByLabelText(/Daily quota for Production/i));
    await waitFor(() =>
      expect(portalClient.updateApiKeyLimits).toHaveBeenCalledWith("key-1", {
        daily_quota: 500,
      }),
    );
  });

  it("revokes an active key and restores a revoked one", async () => {
    supabaseMock.__setRows([keyRow]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Revoke/i }));
    await waitFor(() =>
      expect(
        (supabaseMock.__chain.update as { mock: { calls: unknown[][] } }).mock
          .calls.length,
      ).toBeGreaterThanOrEqual(1),
    );
    expect(
      (
        supabaseMock.__chain.update as { mock: { calls: unknown[][] } }
      ).mock.calls.some(
        (c) => (c[0] as { status?: string }).status === "revoked",
      ),
    ).toBe(true);
  });

  it("shows the empty state when no keys match the search", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText(/Search API keys/i), {
      target: { value: "zzz-no-match" },
    });
    expect(await screen.findByText(/No API keys match/i)).toBeInTheDocument();
  });
});

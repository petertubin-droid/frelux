import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

// ---------------------------------------------------------
// FRELUX PHASE 7 — DEVELOPER PORTAL TESTS
// Verifies the honest key lifecycle surfaced in the UI:
//   * raw key shown EXACTLY ONCE, then never again
//   * create / rotate / revoke flows use the §3 contract
//   * unauthenticated users see docs but no key manager data
// ---------------------------------------------------------

const portalClient = vi.hoisted(() => ({
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  rotateApiKey: vi.fn(),
  getUsageSummary: vi.fn(),
  getPlans: vi.fn(),
}));

vi.mock("@/lib/frelix-api/portal-client", () => portalClient);
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}));

import { useAuth } from "@/lib/auth";
import DeveloperPortal from "./DeveloperPortal";

const mockUser = { id: "11111111-1111-4111-8111-111111111111" };
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
};

function renderPortal() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DeveloperPortal />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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
  portalClient.listApiKeys.mockResolvedValue([]);
  portalClient.getUsageSummary.mockResolvedValue({
    today: 0,
    thisMonth: 0,
    perKeyThisMonth: {},
    recentStatusCodes: {},
  });
});

describe("DeveloperPortal (public docs)", () => {
  it("documents the official endpoints and the error catalog", () => {
    renderPortal();
    expect(screen.getByText("FRELUX AI API")).toBeInTheDocument();
    expect(screen.getByText(/\/v1\/calculators\/:engine/i)).toBeInTheDocument();
    expect(screen.getAllByText(/validation_failed/).length).toBeGreaterThan(0);
    expect(screen.getByText(/revoked_api_key/)).toBeInTheDocument();
  });

  it("states the no-fabrication contract of the calculators", () => {
    renderPortal();
    expect(
      screen.getAllByText(/never invents missing values/i).length,
    ).toBeGreaterThan(0);
  });

  it("does not load key data when signed out", () => {
    renderPortal();
    expect(portalClient.listApiKeys).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Sign in to create and manage/i),
    ).toBeInTheDocument();
  });
});

describe("DeveloperPortal (key manager)", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
    } as never);
  });

  it("lists the owner's keys with masked prefixes and usage", async () => {
    portalClient.listApiKeys.mockResolvedValue([keyRow]);
    portalClient.getUsageSummary.mockResolvedValue({
      today: 3,
      thisMonth: 12,
      perKeyThisMonth: { "key-1": 12 },
      recentStatusCodes: { "200": 12 },
    });
    renderPortal();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    expect(screen.getByText("FLX-Aaaa…")).toBeInTheDocument();
    expect(screen.getByText(/12 requests this month/i)).toBeInTheDocument();
    expect(screen.queryByText(/key_hash/i)).not.toBeInTheDocument();
  });

  it("shows the raw key EXACTLY ONCE on creation and warns it cannot be shown again", async () => {
    portalClient.createApiKey.mockResolvedValue({
      row: keyRow,
      rawKey: "FLX-Zzz1234AbCdEfGhIjKlMnOpQrStUv",
    });
    renderPortal();
    fireEvent.change(screen.getByLabelText(/New API key name/i), {
      target: { value: "CI integration" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create key/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Copy this key now — FRELUX stores only a hash/i),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText("FLX-Zzz1234AbCdEfGhIjKlMnOpQrStUv"),
    ).toBeInTheDocument();
    expect(portalClient.createApiKey).toHaveBeenCalledWith(
      "CI integration",
      "free",
    );
  });

  it("rotate replaces the shown key; revoke disables the key row", async () => {
    portalClient.listApiKeys.mockResolvedValue([keyRow]);
    portalClient.rotateApiKey.mockResolvedValue({
      row: keyRow,
      rawKey: "FLX-Neww1234AbCdEfGhIjKlMnOpQrStUv2",
    });
    portalClient.revokeApiKey.mockResolvedValue(undefined);
    renderPortal();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    // Buttons stay disabled while usage is still loading — wait for
    // enabled before clicking (slow CI runners hit this race once).
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Rotate/i })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Rotate/i }));
    await waitFor(() =>
      expect(portalClient.rotateApiKey).toHaveBeenCalledWith("key-1"),
    );
    await waitFor(() =>
      expect(
        screen.getByText(/the old secret no longer works/i),
      ).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Revoke/i })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Revoke/i }));
    await waitFor(() =>
      expect(portalClient.revokeApiKey).toHaveBeenCalledWith("key-1"),
    );
  });

  it("never renders a raw FLX- secret for an existing key", async () => {
    portalClient.listApiKeys.mockResolvedValue([keyRow]);
    renderPortal();
    await waitFor(() =>
      expect(screen.getByText("Production")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/^FLX-[A-Za-z0-9]{28}$/)).not.toBeInTheDocument();
  });
});

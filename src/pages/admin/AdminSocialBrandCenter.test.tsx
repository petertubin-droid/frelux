import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSocialBrandCenter from "@/pages/admin/AdminSocialBrandCenter";

const mockListSocialAccounts = vi.fn();
const mockListSocialAnalyses = vi.fn();
const mockGetSocialAuthorizeUrl = vi.fn();
const mockCompleteSocialConnection = vi.fn();
const mockSyncSocialAccount = vi.fn();
const mockDisconnectSocialAccount = vi.fn();
const mockRevokeSocialAccess = vi.fn();

vi.mock("@/lib/social/social-client", () => ({
  listSocialAccounts: () => mockListSocialAccounts(),
  listSocialAnalyses: () => mockListSocialAnalyses(),
  getSocialAuthorizeUrl: (...args: any[]) => mockGetSocialAuthorizeUrl(...args),
  completeSocialConnection: (...args: any[]) => mockCompleteSocialConnection(...args),
  syncSocialAccount: (...args: any[]) => mockSyncSocialAccount(...args),
  disconnectSocialAccount: (...args: any[]) => mockDisconnectSocialAccount(...args),
  revokeSocialAccess: (...args: any[]) => mockRevokeSocialAccess(...args),
}));

const mockListPlatformCredentials = vi.fn();
const mockSavePlatformCredentials = vi.fn();
const mockRemovePlatformCredentials = vi.fn();
const mockConnectorPlatformStatus = vi.fn();

vi.mock("@/lib/social/platform-credentials", () => ({
  CREDENTIAL_PLATFORMS: [
    {
      platform: "meta",
      label: "Meta / Instagram",
      idLabel: "App ID",
      secretLabel: "App Secret",
      where: "developers.facebook.com",
    },
    {
      platform: "x",
      label: "X (Twitter)",
      idLabel: "Client ID",
      secretLabel: "Client Secret",
      where: "developer.twitter.com",
    },
  ],
  listPlatformCredentials: () => mockListPlatformCredentials(),
  savePlatformCredentials: (...args: any[]) => mockSavePlatformCredentials(...args),
  removePlatformCredentials: (...args: any[]) => mockRemovePlatformCredentials(...args),
  connectorPlatformStatus: () => mockConnectorPlatformStatus(),
}));

vi.mock("@/lib/social/social-connections", () => ({
  listSocialPlatforms: () => [
    {
      platform: "meta",
      label: "Meta / Instagram",
      auth_mechanism: "oauth2",
      note: "Read insights and manage authorized brand pages.",
    },
    {
      platform: "x",
      label: "X (Twitter)",
      auth_mechanism: "oauth2",
      note: "Official Twitter API v2 user context.",
    },
  ],
  TOKEN_GOVERNANCE: {
    storage: "AES-256 GCM encrypted vault",
    rotation: "Automatic 60-day rotation",
    revocation: "Immediate server-side token destruction",
  },
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const initialAccounts = [
  {
    id: "acc-1",
    platform: "meta",
    account_handle: "@frelux_official",
    scopes: ["pages_read_engagement", "instagram_basic"],
    status: "CONNECTED",
    synced_at: "2026-11-20T10:00:00Z",
  },
];

const initialAnalyses = [
  {
    id: "an-1",
    platform: "meta",
    created_date: "2026-11-20T12:00:00Z",
    observed_platform_data: ["12.4k followers", "4.2% engagement"],
    archie_recommendations: ["Publish milestone video on Fridays"],
    archie_assumptions: ["Audience active during 17:00-20:00 WAT"],
  },
];

describe("AdminSocialBrandCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListSocialAccounts.mockResolvedValue(initialAccounts);
    mockListSocialAnalyses.mockResolvedValue(initialAnalyses);
    mockListPlatformCredentials.mockResolvedValue({
      meta: {
        platform: "meta",
        status: "active",
        keyLast4: "9876",
        updatedAt: "2026-11-10T00:00:00Z",
      },
    });
    mockConnectorPlatformStatus.mockResolvedValue({});
    mockSavePlatformCredentials.mockResolvedValue({ ok: true });
    mockRemovePlatformCredentials.mockResolvedValue({ ok: true });
    mockGetSocialAuthorizeUrl.mockResolvedValue({
      ok: true,
      authorize_url: "https://auth.meta.com/oauth/authorize?test=1",
    });
    mockSyncSocialAccount.mockResolvedValue({ ok: true });
    mockDisconnectSocialAccount.mockResolvedValue({ ok: true });
    mockRevokeSocialAccess.mockResolvedValue({ ok: true });
  });

  it("renders header, token governance, and platform cards", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Social Intelligence & Brand Center" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Token governance/i)).toBeInTheDocument();
      expect(screen.getByText(/AES-256 GCM encrypted vault/i)).toBeInTheDocument();
      expect(screen.getByText(/@frelux_official/i)).toBeInTheDocument();
    });
  });

  it("adds and saves platform credentials", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Add keys for X (Twitter)" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add keys for X (Twitter)" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Client ID")).toBeInTheDocument();
      expect(screen.getByLabelText("Client secret")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Client ID"), {
      target: { value: "x-client-123" },
    });
    fireEvent.change(screen.getByLabelText("Client secret"), {
      target: { value: "x-secret-xyz" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save keys for X (Twitter)" }));

    await waitFor(() => {
      expect(mockSavePlatformCredentials).toHaveBeenCalledWith({
        platform: "x",
        clientId: "x-client-123",
        clientSecret: "x-secret-xyz",
        label: "X (Twitter)",
      });
    });
  });

  it("removes existing platform credentials", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove credentials for Meta / Instagram" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove credentials for Meta / Instagram" }),
    );

    await waitFor(() => {
      expect(mockRemovePlatformCredentials).toHaveBeenCalledWith("meta");
    });
  });

  it("connects an unconnected platform account", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect X (Twitter)" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Connect X (Twitter)" }));

    await waitFor(() => {
      expect(mockGetSocialAuthorizeUrl).toHaveBeenCalledWith("x");
    });
  });

  it("syncs an already connected social account", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sync Meta / Instagram" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync Meta / Instagram" }));

    await waitFor(() => {
      expect(mockSyncSocialAccount).toHaveBeenCalledWith("acc-1");
    });
  });

  it("opens and closes permissions modal for connected account", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Permissions for Meta / Instagram" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Permissions for Meta / Instagram" }),
    );

    await waitFor(() => {
      expect(screen.getByText("pages_read_engagement")).toBeInTheDocument();
      expect(screen.getByText("instagram_basic")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(screen.queryByText("pages_read_engagement")).not.toBeInTheDocument();
    });
  });

  it("disconnects a connected account", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Disconnect Meta / Instagram" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Disconnect Meta / Instagram" }),
    );

    await waitFor(() => {
      expect(mockDisconnectSocialAccount).toHaveBeenCalledWith("acc-1");
    });
  });

  it("revokes access permanently for an account", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Revoke access for Meta / Instagram" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Revoke access for Meta / Instagram" }),
    );

    await waitFor(() => {
      expect(mockRevokeSocialAccess).toHaveBeenCalledWith("acc-1");
    });
  });

  it("displays ARCHIE insight reports with observations and recommendations", async () => {
    render(
      <MemoryRouter>
        <AdminSocialBrandCenter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("ARCHIE insight reports")).toBeInTheDocument();
      expect(screen.getByText("12.4k followers · 4.2% engagement")).toBeInTheDocument();
      expect(
        screen.getByText("Publish milestone video on Fridays"),
      ).toBeInTheDocument();
    });
  });
});

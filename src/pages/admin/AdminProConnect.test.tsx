import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminProConnect from "./AdminProConnect";

const {
  mockRegistrations,
  mockProfiles,
  mockVerificationRequests,
  adminAwardProLevelMock,
  adminRevokeProLevelMock,
  adminApproveVerificationMock,
} = vi.hoisted(() => {
  const mockRegistrations = {
    window_days: 7,
    since: new Date().toISOString(),
    pros: [
      {
        id: "reg-pro-1",
        user_id: "user-1",
        display_name: "Adeola Construction",
        business_name: "Adeola Ltd",
        verification_status: "pending",
        created_at: new Date().toISOString(),
        email: "adeola@example.com",
      },
    ],
    clients: [
      {
        id: "reg-client-1",
        email: "client@example.com",
        created_at: new Date().toISOString(),
      },
    ],
    pros_in_window: 1,
    clients_in_window: 1,
    pros_total: 10,
    pros_pending: 2,
    clients_total: 25,
  };

  const mockProfiles = [
    {
      id: "pro-1",
      user_id: "user-1",
      display_name: "Chukwuma Obi",
      business_name: "Obi Painting Services",
      rating_avg: 4.8,
      rating_count: 12,
      pro_level: false,
      is_listed: true,
      verification_status: "pending",
      created_at: new Date().toISOString(),
    },
  ];

  const mockVerificationRequests = [
    {
      id: "vr-1",
      profile_id: "pro-1",
      request_type: "tier_upgrade",
      status: "pending",
      submitted_at: new Date().toISOString(),
      profile: {
        display_name: "Chukwuma Obi",
        slug: "chukwuma-obi",
        business_name: "Obi Painting Services",
      },
    },
  ];

  return {
    mockRegistrations,
    mockProfiles,
    mockVerificationRequests,
    adminAwardProLevelMock: vi.fn().mockResolvedValue(true),
    adminRevokeProLevelMock: vi.fn().mockResolvedValue(true),
    adminApproveVerificationMock: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("@/lib/pro-connect", () => ({
  adminAwardProLevel: adminAwardProLevelMock,
  adminRevokeProLevel: adminRevokeProLevelMock,
  adminApproveVerification: adminApproveVerificationMock,
  adminRejectVerification: vi.fn().mockResolvedValue(true),
  adminRequestMoreInfo: vi.fn().mockResolvedValue(true),
  adminSuspendVerification: vi.fn().mockResolvedValue(true),
  adminReinstateVerification: vi.fn().mockResolvedValue(true),
  getAllVerificationRequests: vi
    .fn()
    .mockResolvedValue(mockVerificationRequests),
  fetchProSettings: vi.fn().mockResolvedValue({}),
  updateProSettings: vi.fn().mockResolvedValue(true),
  getAdminVerificationDocuments: vi.fn().mockResolvedValue([]),
  createAdminSignedUrlForDocument: vi
    .fn()
    .mockResolvedValue("https://example.com/doc.pdf"),
  adminListCredentialsForReview: vi.fn().mockResolvedValue([]),
  adminRequestCredentialCorrection: vi.fn().mockResolvedValue(true),
  adminRevokeCredential: vi.fn().mockResolvedValue(true),
  adminSuspendCredential: vi.fn().mockResolvedValue(true),
  adminUnableToVerifyCredential: vi.fn().mockResolvedValue(true),
  adminVerifyCredentialByReviewer: vi.fn().mockResolvedValue(true),
  adminVerifyCredentialBySource: vi.fn().mockResolvedValue(true),
  getCredentialEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/worker-channels", () => ({
  adminGetNinSubmissions: vi.fn().mockResolvedValue([]),
  adminApproveNin: vi.fn().mockResolvedValue(true),
  adminRejectNin: vi.fn().mockResolvedValue(true),
  fetchChannelCategories: vi.fn().mockResolvedValue([]),
  fetchChannels: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn((fnName: string) => {
      if (fnName === "admin_recent_registrations") {
        return Promise.resolve({ data: mockRegistrations, error: null });
      }
      if (fnName === "admin_list_pro_profiles") {
        return Promise.resolve({ data: mockProfiles, error: null });
      }
      if (fnName === "admin_set_pro_profile_status") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-user-id" } },
      }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminProConnect />
    </MemoryRouter>,
  );
}

describe("AdminProConnect", () => {
  it("renders page header and default Registrations tab", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Pro Connect Management/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Professionals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verification" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "KYC / NIN" }),
    ).toBeInTheDocument();

    expect(await screen.findByText("Adeola Construction")).toBeInTheDocument();
    expect(screen.getByText("client@example.com")).toBeInTheDocument();
  });

  it("switches to Professionals tab and displays professionals list", async () => {
    renderPage();

    await screen.findByText("Adeola Construction");
    const prosTab = screen.getByRole("button", { name: "Professionals" });
    fireEvent.click(prosTab);

    expect(await screen.findByText("Chukwuma Obi")).toBeInTheDocument();
    expect(screen.getByText(/Obi Painting Services/)).toBeInTheDocument();
  });

  it("toggles listing status for a professional", async () => {
    renderPage();

    await screen.findByText("Adeola Construction");
    const prosTab = screen.getByRole("button", { name: "Professionals" });
    fireEvent.click(prosTab);

    await screen.findByText("Chukwuma Obi");
    const listedBtn = screen.getByRole("button", { name: "Listed" });
    fireEvent.click(listedBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Unlisted" }),
      ).toBeInTheDocument();
    });
  });

  it("awards FRELUX Pro level to an eligible professional", async () => {
    renderPage();

    await screen.findByText("Adeola Construction");
    const prosTab = screen.getByRole("button", { name: "Professionals" });
    fireEvent.click(prosTab);

    await screen.findByText("Chukwuma Obi");
    const awardBtn = screen.getByLabelText("Award FRELUX Pro");
    fireEvent.click(awardBtn);

    await waitFor(() => {
      expect(adminAwardProLevelMock).toHaveBeenCalledWith("pro-1");
    });
  });

  it("switches to Verification tab and displays requests", async () => {
    renderPage();

    await screen.findByText("Adeola Construction");
    const verifTab = screen.getByRole("button", { name: "Verification" });
    fireEvent.click(verifTab);

    expect(await screen.findByText("tier_upgrade")).toBeInTheDocument();
  });
});

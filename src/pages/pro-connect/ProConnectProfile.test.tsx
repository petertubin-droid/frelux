import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import type { DbProProfile } from "@/types/pro-connect";

let mockUser: { id: string; email: string } | null = null;
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: mockUser, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue({ balance: 30 }),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

const sampleProfile: DbProProfile = {
  id: "pro-999",
  user_id: "user-artisan-888",
  category_id: "cat-1",
  business_name: "Ade Stone Masonry",
  display_name: "Adeola Adeleke",
  slug: "adeola-adeleke",
  country: "NG",
  service_area_text: "Ikeja, Lagos",
  bio: "Master stone mason and structural bricklayer.",
  profile_image_url: null,
  cover_image_url: null,
  years_experience: 15,
  availability: "available",
  verification_status: "verified",
  is_profile_complete: true,
  is_listed: true,
  contact_email_public: false,
  contact_phone_public: true,
  contact_phone: "+2348012345678",
  website_url: null,
  rating_avg: 4.8,
  rating_count: 12,
  project_count: 10,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  contact_verified_at: "2026-01-02T00:00:00Z",
  identity_verified_at: "2026-01-02T00:00:00Z",
  pro_level: true,
  pro_level_awarded_at: null,
  phone_verified: true,
  nin_verified: true,
  mobile_otp_verified: true,
  seo_title: null,
  seo_description: null,
  seo_indexable: true,
};

vi.mock("@/lib/pro-connect", async () => {
  const actual = await vi.importActual("@/lib/pro-connect");
  return {
    ...actual,
    getProProfileBySlug: vi.fn().mockResolvedValue(sampleProfile),
    getProProfileServices: vi.fn().mockResolvedValue([]),
    getProProfileLocations: vi.fn().mockResolvedValue([]),
    getProPortfolio: vi.fn().mockResolvedValue([]),
    getProReviews: vi.fn().mockResolvedValue([]),
    getPublicCredentials: vi.fn().mockResolvedValue([]),
    fetchProSettings: vi.fn().mockResolvedValue(null),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: "+2348012345678", error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  isSupabaseConfigured: true,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = null;
});

async function renderPage() {
  const Comp = (await import("@/pages/pro-connect/ProConnectProfile")).default;
  return render(
    <MemoryRouter initialEntries={["/pro-connect/adeola-adeleke"]}>
      <ToastProvider>
        <Routes>
          <Route path="/pro-connect/:slug" element={<Comp />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ProConnectProfile", () => {
  it("renders profile header and details without crashing", async () => {
    const { container } = await renderPage();
    await waitFor(() => {
      expect(screen.getByText("Adeola Adeleke")).toBeInTheDocument();
    });
    expect(container.innerHTML).not.toBe("");
  });

  it("opens quick message modal when clicking message button as authenticated customer", async () => {
    mockUser = { id: "cust-buyer-111", email: "client@example.com" };
    await renderPage();

    await waitFor(() => {
      expect(screen.getByText("Adeola Adeleke")).toBeInTheDocument();
    });

    const messageBtn = screen.getByRole("button", { name: /Message this professional/i });
    fireEvent.click(messageBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Provide project details/i)).toBeInTheDocument();
    });
  });
});

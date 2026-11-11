import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import Profile from "@/pages/Profile";
import { CreditsProvider } from "@/lib/credits-context";

// Mutable auth mock state
let mockAuthState = {
  user: null as { id: string; email: string } | null,
  profile: null as Record<string, unknown> | null,
  loading: false,
  isPaid: false,
  paidStatus: null as Record<string, unknown> | null,
  refreshProfile: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockAuthState,
}));

// Mutable credits mock
const mockWallet = {
  user_id: "user-1",
  balance: 120,
  total_earned: 150,
  total_spent: 30,
};

const mockStreak = {
  user_id: "user-1",
  current_streak: 5,
  longest_streak: 10,
  last_active_date: "2026-11-10",
  updated_at: "2026-11-10T00:00:00Z",
};

vi.mock("@/lib/credits", () => ({
  AI_CREDIT_COST: 10,
  CREDITS_PER_AD: 5,
  MAX_ADS_PER_DAY: 4,
  getCreditWallet: vi.fn().mockImplementation(() => Promise.resolve(mockWallet)),
  getActivityStreak: vi.fn().mockImplementation(() => Promise.resolve(mockStreak)),
  recordActivity: vi.fn().mockResolvedValue(true),
  getCreditTasks: vi.fn().mockResolvedValue([
    {
      id: "task-1",
      task_key: "first_calc",
      title: "First Calculation",
      description: "Run any structural or civil takeoff calculation",
      credit_reward: 15,
      completed: false,
    },
  ]),
  getCreditTransactions: vi.fn().mockResolvedValue({
    transactions: [
      {
        id: "tx-1",
        user_id: "user-1",
        amount: 15,
        type: "earn",
        reason: "Milestone bonus",
        reference_id: null,
        balance_after: 120,
        metadata: {},
        created_at: "2026-11-11T12:00:00Z",
      },
    ],
  }),
  getTodayRewardedAdCount: vi.fn().mockResolvedValue(1),
  completeCreditTask: vi.fn().mockResolvedValue({ success: true }),
  REWARD_EVENTS: {},
}));

vi.mock("@/lib/ad-config", () => ({
  fetchAdConfig: vi.fn().mockResolvedValue({ providers: [] }),
  hasRewardedAdProvider: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

// Mock Supabase
const mockSupabaseUpdate = vi.fn().mockResolvedValue({ error: null });
const mockSupabaseUpload = vi.fn().mockResolvedValue({ error: null });
const mockSupabaseGetPublicUrl = vi.fn().mockReturnValue({
  data: { publicUrl: "https://example.com/avatar.webp" },
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      update: (...args: unknown[]) => ({
        eq: () => mockSupabaseUpdate(...args),
      }),
    }),
    storage: {
      from: () => ({
        upload: mockSupabaseUpload,
        getPublicUrl: mockSupabaseGetPublicUrl,
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState = {
    user: null,
    profile: null,
    loading: false,
    isPaid: false,
    paidStatus: null,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
  };
});

function renderComponent() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CreditsProvider>
          <Profile />
        </CreditsProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Profile Page", () => {
  it("renders sign in prompt when user is unauthenticated and not loading", () => {
    mockAuthState.user = null;
    mockAuthState.loading = false;
    renderComponent();

    expect(
      screen.getByText(/Please sign in to view and edit your profile/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute(
      "href",
      "/login/?redirect=/profile",
    );
  });

  it("renders accessible loading indicator while auth is bootstrapping", () => {
    mockAuthState.user = null;
    mockAuthState.loading = true;
    renderComponent();

    expect(screen.getByRole("status", { name: /Loading profile/i })).toBeInTheDocument();
    expect(screen.queryByText(/Please sign in to view and edit your profile/i)).not.toBeInTheDocument();
  });

  it("renders authenticated profile details, marketplace ID, and active status", async () => {
    mockAuthState.user = { id: "user-1", email: "builder@frelux.com" };
    mockAuthState.profile = {
      id: "user-1",
      full_name: "Amara Nwachukwu",
      phone: "+1 555 432 1098",
      marketplace_id: "MKP-7890",
      role: "member",
      account_type: "pro_worker",
      created_at: "2026-01-15T10:00:00Z",
    };
    mockAuthState.isPaid = true;
    mockAuthState.paidStatus = {
      plan: "pro",
      is_paid: true,
      paid_until: "2026-12-31T23:59:59Z",
    };

    renderComponent();

    expect(screen.getByText("Amara Nwachukwu")).toBeInTheDocument();
    expect(screen.getByText("builder@frelux.com")).toBeInTheDocument();
    expect(screen.getByText("MKP-7890")).toBeInTheDocument();
    expect(screen.getByText("Pro Worker")).toBeInTheDocument();

    // Verify marketplace messaging is updated and links to marketplace
    expect(screen.getByText(/Marketplace & Pro Identity/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore Marketplace/i })).toHaveAttribute(
      "href",
      "/marketplace",
    );

    // Verify member since date
    expect(screen.getByText(/January 15, 2026/i)).toBeInTheDocument();

    // Verify subscription status
    expect(screen.getByText(/Pro · Active/i)).toBeInTheDocument();
  });

  it("handles missing member-since registration date gracefully without empty blank text", () => {
    mockAuthState.user = { id: "user-1", email: "builder@frelux.com" };
    mockAuthState.profile = {
      id: "user-1",
      full_name: "Builder One",
      created_at: null,
    };

    renderComponent();
    expect(screen.getByText(/Registration date unavailable/i)).toBeInTheDocument();
  });

  it("tracks dirty state and validates name and phone input", async () => {
    mockAuthState.user = { id: "user-1", email: "builder@frelux.com" };
    mockAuthState.profile = {
      id: "user-1",
      full_name: "Initial Name",
      phone: "+1 555 000 0000",
    };

    renderComponent();

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    // Pristine: disabled
    expect(saveButton).toBeDisabled();
    expect(screen.queryByText(/Unsaved changes/i)).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Full Name/i);
    const phoneInput = screen.getByLabelText(/Phone Number/i);

    // Enter valid new name
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });
    expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    // Enter single character (invalid name length < 2)
    fireEvent.change(nameInput, { target: { value: "A" } });
    fireEvent.blur(nameInput);
    expect(await screen.findByText(/Full name must be at least 2 characters/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Restore valid name
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });
    expect(saveButton).not.toBeDisabled();

    // Enter invalid phone
    fireEvent.change(phoneInput, { target: { value: "invalid-phone" } });
    fireEvent.blur(phoneInput);
    expect(
      await screen.findByText(/Enter a valid international phone number/i),
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Fix phone with valid international format
    fireEvent.change(phoneInput, { target: { value: "+44 20 7946 0991" } });
    expect(saveButton).not.toBeDisabled();

    // Save triggers update
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        full_name: "Valid Name",
        phone: "+44 20 7946 0991",
      });
      expect(mockAuthState.refreshProfile).toHaveBeenCalled();
    });
  });

  it("handles copy marketplace ID with accessible announcement and clipboard fallback", async () => {
    mockAuthState.user = { id: "user-1", email: "builder@frelux.com" };
    mockAuthState.profile = {
      id: "user-1",
      full_name: "Builder One",
      marketplace_id: "MKP-VAL-456",
    };

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    renderComponent();

    const copyBtn = screen.getByRole("button", { name: /Copy Marketplace ID/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("MKP-VAL-456");
      expect(screen.getByRole("button", { name: /Marketplace ID copied/i })).toBeInTheDocument();
    });
  });

  it("validates avatar uploads for allowed MIME types and size limit", async () => {
    mockAuthState.user = { id: "user-1", email: "builder@frelux.com" };
    mockAuthState.profile = { id: "user-1", full_name: "Builder One" };

    renderComponent();

    const fileInput = screen.getByLabelText(/Profile photo upload/i);

    // Unsupported MIME (PDF)
    const pdfFile = new File(["dummy content"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(mockSupabaseUpload).not.toHaveBeenCalled();
      expect(screen.getByText(/Invalid file format/i)).toBeInTheDocument();
    });

    // File too large (> 5MB)
    const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], "huge.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(mockSupabaseUpload).not.toHaveBeenCalled();
      expect(screen.getByText(/File too large/i)).toBeInTheDocument();
    });
  });

  it("renders centralized credits wallet with dynamic constants and streak overview", async () => {
    mockAuthState.user = { id: "user-1", email: "builder@frelux.com" };
    mockAuthState.profile = { id: "user-1", full_name: "Builder One" };

    renderComponent();

    // Top streak card
    expect(screen.getByText(/Daily Activity Streak/i)).toBeInTheDocument();
    expect(await screen.findByText(/5 days/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Explore Rewards & Milestones/i }),
    ).toHaveAttribute("href", "/rewards/");

    // Centralized wallet header & balance
    expect(screen.getByText(/AI Credits & Rewards Wallet/i)).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();

    // Dynamic credit constants (10, +5, 4)
    expect(screen.getByText(/10 Credits/i)).toBeInTheDocument();
    expect(screen.getByText(/\+5 Credits/i)).toBeInTheDocument();
    expect(screen.getByText(/Max 4 ads daily/i)).toBeInTheDocument();

    // Clarified Pro access copy
    expect(screen.getByText(/Standard AI Included/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Standard tools exempt from credit deductions/i),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminRewards from "./AdminRewards";

const {
  mockWallets,
  mockTransactions,
  mockRewards,
  mockSettings,
  adminAdjustCreditsMock,
  adminUpdateRewardMock,
  adminUpdateSettingsMock,
  adminSeedRewardsMock,
} = vi.hoisted(() => {
  const mockWallets = [
    {
      user_id: "user-12345678-abcd",
      balance: 450,
      total_earned: 600,
      total_spent: 150,
      updated_at: new Date().toISOString(),
    },
  ];

  const mockTransactions = [
    {
      id: "tx-1",
      user_id: "user-12345678-abcd",
      amount: 50,
      type: "reward_claim",
      reason: "Completed weekly mission",
      reference_id: "mission-1",
      created_at: new Date().toISOString(),
    },
  ];

  const mockRewards = [
    {
      id: "rwd-1",
      key: "discount_10",
      name: "10% Platform Discount",
      description: "Get 10% off your next subscription",
      credit_cost: 200,
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockSettings = {
    rewards_enabled: true,
    weekly_mission_credits: 50,
    streak_7_day_credits: 100,
    streak_grace_days: 1,
  };

  return {
    mockWallets,
    mockTransactions,
    mockRewards,
    mockSettings,
    adminAdjustCreditsMock: vi
      .fn()
      .mockResolvedValue({ success: true, newBalance: 500 }),
    adminUpdateRewardMock: vi.fn().mockResolvedValue(true),
    adminUpdateSettingsMock: vi.fn().mockResolvedValue(true),
    adminSeedRewardsMock: vi
      .fn()
      .mockResolvedValue({ success: true, message: "4 rewards created" }),
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "admin-user-id" },
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/credits", () => ({
  adminGetAllWallets: vi.fn().mockResolvedValue(mockWallets),
  adminGetAllTransactions: vi.fn().mockResolvedValue(mockTransactions),
  getRewardCatalogue: vi.fn().mockResolvedValue(mockRewards),
  getRewardSettings: vi.fn().mockResolvedValue(mockSettings),
  adminUpdateReward: adminUpdateRewardMock,
  adminUpdateSettings: adminUpdateSettingsMock,
  adminAdjustCredits: adminAdjustCreditsMock,
  adminSeedRewards: adminSeedRewardsMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminRewards />
    </MemoryRouter>,
  );
}

describe("AdminRewards", () => {
  it("renders page header and Overview stats by default", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /FRELUX Credits & Rewards/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Overview/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Reward Catalogue/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Settings/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Suspicious Activity/i }),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("Total Credits in Circulation"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("450").length).toBeGreaterThan(0);
    expect(screen.getByText("Completed weekly mission")).toBeInTheDocument();
  });

  it("submits manual credit adjustment", async () => {
    renderPage();

    await screen.findByText("Adjust User Credits");

    const userField = screen.getByLabelText("User ID");
    const amountField = screen.getByLabelText("Amount");
    const reasonField = screen.getByLabelText("Reason");

    fireEvent.change(userField, { target: { value: "user-target-id" } });
    fireEvent.change(amountField, { target: { value: "50" } });
    fireEvent.change(reasonField, {
      target: { value: "Customer support compensation" },
    });

    const adjustBtn = screen.getByRole("button", { name: "Adjust" });
    fireEvent.click(adjustBtn);

    await waitFor(() => {
      expect(adminAdjustCreditsMock).toHaveBeenCalledWith(
        "admin-user-id",
        "user-target-id",
        50,
        "Customer support compensation",
      );
    });
  });

  it("switches to Reward Catalogue tab and allows editing a reward", async () => {
    renderPage();

    await screen.findByText("Total Credits in Circulation");
    const tabBtn = screen.getByRole("tab", { name: /Reward Catalogue/i });
    fireEvent.click(tabBtn);

    expect(
      await screen.findByDisplayValue("10% Platform Discount"),
    ).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue("10% Platform Discount");
    fireEvent.change(nameInput, { target: { value: "15% Platform Discount" } });

    const saveBtn = screen.getByRole("button", { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(adminUpdateRewardMock).toHaveBeenCalledWith(
        "rwd-1",
        expect.objectContaining({ name: "15% Platform Discount" }),
      );
    });
  });

  it("triggers Seed 4 Core Rewards action", async () => {
    renderPage();

    await screen.findByText("Total Credits in Circulation");
    const tabBtn = screen.getByRole("tab", { name: /Reward Catalogue/i });
    fireEvent.click(tabBtn);

    const seedBtn = await screen.findByRole("button", {
      name: /Seed 4 Core Rewards/i,
    });
    fireEvent.click(seedBtn);

    await waitFor(() => {
      expect(adminSeedRewardsMock).toHaveBeenCalled();
    });
  });

  it("switches to Settings tab and updates reward settings", async () => {
    renderPage();

    await screen.findByText("Total Credits in Circulation");
    const settingsTab = screen.getByRole("tab", { name: /Settings/i });
    fireEvent.click(settingsTab);

    expect(await screen.findByText("Rewards Enabled")).toBeInTheDocument();
    const saveSettingsBtn = screen.getByRole("button", {
      name: /Save Settings/i,
    });
    fireEvent.click(saveSettingsBtn);

    await waitFor(() => {
      expect(adminUpdateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          rewards_enabled: true,
          weekly_mission_credits: 50,
        }),
      );
    });
  });

  it("switches to Suspicious Activity tab", async () => {
    renderPage();

    await screen.findByText("Total Credits in Circulation");
    const suspTab = screen.getByRole("tab", { name: /Suspicious Activity/i });
    fireEvent.click(suspTab);

    expect(
      await screen.findByText(/Flagged Transactions/i),
    ).toBeInTheDocument();
  });
});

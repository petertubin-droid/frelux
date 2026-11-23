import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminRewardedAccess from "./AdminRewardedAccess";

const { mockFeatures, mockProviders, mockToolConfigs, updateEqMock, state } =
  vi.hoisted(() => {
    const mockFeatures = [
      {
        id: "feat-1",
        feature_key: "export_pdf",
        feature_name: "PDF Export",
        description: "Unlock full PDF export capability",
        is_enabled: true,
        unlock_duration_minutes: 60,
        daily_usage_limit: 5,
        cooldown_minutes: 10,
        reward_points: 100,
      },
    ];

    const mockProviders = [
      {
        id: "prov-1",
        name: "Google AdMob",
        is_active: true,
        priority: 1,
        ad_types: ["rewarded"],
      },
    ];

    const mockToolConfigs = [
      {
        id: "tool-1",
        tool_key: "paint_estimator",
        tool_label: "Paint Estimator",
        description: "Access premium paint calculation presets",
        is_enabled: true,
        unlock_duration_hours: 24,
        daily_unlock_limit: 3,
        cooldown_hours: 1,
      },
    ];

    const state = {
      fetchError: null as any,
      featuresList: [...mockFeatures],
    };

    return {
      mockFeatures,
      mockProviders,
      mockToolConfigs,
      updateEqMock: vi.fn().mockResolvedValue({ error: null }),
      state,
    };
  });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "rewarded_feature_config") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: state.fetchError ? null : state.featuresList,
              error: state.fetchError,
            }),
          }),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
        };
      }
      if (table === "ad_providers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockProviders,
                error: null,
              }),
            }),
          }),
        };
      }
      if (
        table === "rewarded_tool_config" ||
        table === "rewarded_tool_configs"
      ) {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockToolConfigs,
              error: null,
            }),
          }),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

vi.mock("@/lib/queries", () => ({
  fetchAllRewardedToolConfigs: vi.fn().mockResolvedValue({
    data: mockToolConfigs,
    error: null,
  }),
  fetchRewardedUnlockStats: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
  fetchRewardedAdEventStats: vi.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.featuresList = [...mockFeatures];
  state.fetchError = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminRewardedAccess />
    </MemoryRouter>,
  );
}

describe("AdminRewardedAccess", () => {
  it("renders page header and Feature Config tab by default", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Rewarded Ads Manager/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Feature Config/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tool Config/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Analytics/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("PDF Export")).toBeInTheDocument();
    expect(screen.getByText("export_pdf")).toBeInTheDocument();
  });

  it("toggles feature configuration enabled status", async () => {
    renderPage();

    await screen.findByText("PDF Export");
    const toggle = screen.getByLabelText("Enabled: PDF Export");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "feat-1");
    });
  });

  it("switches to Tool Config tab and displays tool cards", async () => {
    renderPage();

    await screen.findByText("PDF Export");
    const toolTabBtn = screen.getByRole("button", { name: /Tool Config/i });
    fireEvent.click(toolTabBtn);

    expect(await screen.findByText("Paint Estimator")).toBeInTheDocument();
    expect(screen.getByText("paint_estimator")).toBeInTheDocument();
  });

  it("toggles tool config enabled status", async () => {
    renderPage();

    await screen.findByText("PDF Export");
    const toolTabBtn = screen.getByRole("button", { name: /Tool Config/i });
    fireEvent.click(toolTabBtn);

    await screen.findByText("Paint Estimator");
    const toggle = screen.getByLabelText("Enabled: Paint Estimator");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "tool-1");
    });
  });

  it("switches to Analytics tab and displays stats view", async () => {
    renderPage();

    await screen.findByText("PDF Export");
    const analyticsTabBtn = screen.getByRole("button", { name: /Analytics/i });
    fireEvent.click(analyticsTabBtn);

    expect(await screen.findByText("Total Unlocks")).toBeInTheDocument();
  });

  it("displays error message when loading features fails", async () => {
    state.fetchError = { message: "Could not load rewarded features" };
    renderPage();

    expect(
      await screen.findByText("Could not load rewarded features"),
    ).toBeInTheDocument();
  });
});

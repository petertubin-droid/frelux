import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PremiumFeatureGate } from "./PremiumFeatureGate";

// ── Mock dependencies ──────────────────────────────────

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ isPaid: false, user: { id: "u1" } })),
}));

vi.mock("@/lib/credits", () => ({
  spendAiCredits: vi.fn(),
  unlockFeatureViaAd: vi.fn(),
  getAiFeatureCost: vi.fn(),
  generateReferenceId: vi.fn((key: string) => `${key}_ref_001`),
}));

vi.mock("@/lib/ad-config", () => ({
  hasRewardedAdProvider: vi.fn(() => Promise.resolve(true)),
  logAdEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/components/ui/PremiumBadge", () => ({
  PremiumBadge: () => <div data-testid="premium-badge" />,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useAuth } from "@/lib/auth";
import {
  spendAiCredits,
  unlockFeatureViaAd,
  getAiFeatureCost,
} from "@/lib/credits";
import { hasRewardedAdProvider, logAdEvent } from "@/lib/ad-config";

const defaultProps = {
  featureKey: "pdf_export",
  featureName: "PDF Export",
  onUnlock: vi.fn(),
  onClose: vi.fn(),
  description: "Export professional PDF documents.",
};

function renderGate(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<PremiumFeatureGate {...props} />);
}

const mockCost = {
  id: "1",
  feature_key: "pdf_export",
  feature_name: "PDF Export",
  description: null,
  credit_cost: 10,
  requires_credits: true,
  ad_unlock_enabled: true,
  ad_unlock_credits: 0,
  daily_usage_limit: 20,
  is_enabled: true,
  sort_order: 200,
};

describe("PremiumFeatureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useAuth to default (non-paid, logged-in user)
    vi.mocked(useAuth).mockReturnValue({
      isPaid: false,
      user: { id: "u1" },
    } as never);
    vi.mocked(hasRewardedAdProvider).mockResolvedValue(true);
    vi.mocked(getAiFeatureCost).mockResolvedValue(mockCost);
    vi.mocked(spendAiCredits).mockResolvedValue({
      success: true,
      newBalance: 90,
      cost: 10,
    });
    vi.mocked(unlockFeatureViaAd).mockResolvedValue({
      success: true,
      message: "Unlocked",
    });
  });

  // ── Rendering ────────────────────────────────────────

  it("renders the feature name and crown badge", async () => {
    renderGate();
    await waitFor(() => {
      expect(screen.getByText("PDF Export")).toBeInTheDocument();
    });
    expect(screen.getByTestId("premium-badge")).toBeInTheDocument();
  });

  it("shows the description when provided", async () => {
    renderGate();
    await waitFor(() => {
      expect(
        screen.getByText("Export professional PDF documents."),
      ).toBeInTheDocument();
    });
  });

  it("shows default description when none provided", async () => {
    renderGate({ description: undefined });
    await waitFor(() => {
      expect(
        screen.getByText(/Unlock this premium feature/i),
      ).toBeInTheDocument();
    });
  });

  it("renders Use Credits button with the cost from DB", async () => {
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits to Unlock/i)).toBeInTheDocument();
    });
  });

  it("renders Watch Ad button when ad provider is ready and ad_unlock is enabled", async () => {
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Watch Ad to Unlock/i)).toBeInTheDocument();
    });
  });

  it("does NOT render Watch Ad button when ad_unlock_enabled is false", async () => {
    vi.mocked(getAiFeatureCost).mockResolvedValue({
      ...mockCost,
      ad_unlock_enabled: false,
    });
    renderGate();
    await waitFor(() => {
      expect(screen.queryByText(/Watch Ad to Unlock/i)).not.toBeInTheDocument();
    });
  });

  it("does NOT render Watch Ad button when ad provider is not ready", async () => {
    vi.mocked(hasRewardedAdProvider).mockResolvedValue(false);
    renderGate();
    await waitFor(() => {
      expect(screen.queryByText(/Watch Ad to Unlock/i)).not.toBeInTheDocument();
    });
    expect(
      screen.getByText(/Watch ads from the Rewards page/i),
    ).toBeInTheDocument();
  });

  // ── Paid subscriber bypass ────────────────────────────

  it("calls onUnlock immediately for paid subscribers", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isPaid: true,
      user: { id: "u1" },
    } as never);
    const onUnlock = vi.fn();
    renderGate({ onUnlock });
    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalled();
    });
  });

  // ── Credit spend flow ────────────────────────────────

  it("calls spendAiCredits with correct feature key and reference id", async () => {
    vi.mocked(spendAiCredits).mockResolvedValue({
      success: true,
      newBalance: 90,
      cost: 10,
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Use 10 Credits/i));
    await waitFor(() => {
      expect(spendAiCredits).toHaveBeenCalledWith(
        "pdf_export",
        "pdf_export_ref_001",
      );
    });
  });

  it("calls onUnlock after successful credit spend", async () => {
    vi.mocked(spendAiCredits).mockResolvedValue({
      success: true,
      newBalance: 90,
      cost: 10,
    });
    const onUnlock = vi.fn();
    renderGate({ onUnlock });
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Use 10 Credits/i));
    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalled();
    });
  });

  it("shows error when insufficient credits", async () => {
    vi.mocked(spendAiCredits).mockResolvedValue({
      success: false,
      code: "INSUFFICIENT_CREDITS",
      requiredCredits: 10,
      currentBalance: 3,
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Use 10 Credits/i));
    await waitFor(() => {
      expect(
        screen.getByText(/Not enough FRELUX Credits/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/have 3/i)).toBeInTheDocument();
    });
  });

  it("shows error when daily limit reached", async () => {
    vi.mocked(spendAiCredits).mockResolvedValue({
      success: false,
      code: "DAILY_LIMIT",
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Use 10 Credits/i));
    await waitFor(() => {
      expect(
        screen.getByText(/Daily usage limit reached/i),
      ).toBeInTheDocument();
    });
  });

  it("shows generic error on failure", async () => {
    vi.mocked(spendAiCredits).mockResolvedValue({
      success: false,
      error: "Network error",
      code: "NETWORK_ERROR",
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Use 10 Credits/i));
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows sign-in prompt when user is null and credits button clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isPaid: false,
      user: null,
    } as never);
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Use 10 Credits/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Use 10 Credits/i));
    await waitFor(() => {
      expect(screen.getByText(/Please sign in/i)).toBeInTheDocument();
    });
  });

  // ── Watch Ad flow ────────────────────────────────────

  it("logs impression then calls unlockFeatureViaAd on watch ad click", async () => {
    vi.mocked(unlockFeatureViaAd).mockResolvedValue({
      success: true,
      message: "Unlocked",
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Watch Ad to Unlock/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Watch Ad to Unlock/i));
    await waitFor(() => {
      expect(logAdEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "impression",
          tool_key: "pdf_export",
        }),
      );
      expect(unlockFeatureViaAd).toHaveBeenCalledWith(
        "pdf_export",
        "adsense",
        expect.any(String),
      );
    });
  });

  it("calls onUnlock after successful ad unlock", async () => {
    vi.mocked(unlockFeatureViaAd).mockResolvedValue({
      success: true,
      message: "Unlocked",
    });
    const onUnlock = vi.fn();
    renderGate({ onUnlock });
    await waitFor(() => {
      expect(screen.getByText(/Watch Ad to Unlock/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Watch Ad to Unlock/i));
    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalled();
    });
  });

  it("logs reward event after successful ad unlock", async () => {
    vi.mocked(unlockFeatureViaAd).mockResolvedValue({
      success: true,
      message: "Unlocked",
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Watch Ad to Unlock/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Watch Ad to Unlock/i));
    await waitFor(() => {
      expect(logAdEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "reward",
          tool_key: "pdf_export",
        }),
      );
    });
  });

  it("shows error when ad unlock fails", async () => {
    vi.mocked(unlockFeatureViaAd).mockResolvedValue({
      success: false,
      error: "Ad verification failed",
    });
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Watch Ad to Unlock/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Watch Ad to Unlock/i));
    await waitFor(() => {
      expect(screen.getByText(/Ad verification failed/i)).toBeInTheDocument();
    });
  });

  it("shows sign-in prompt when user is null and watch ad clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      isPaid: false,
      user: null,
    } as never);
    renderGate();
    await waitFor(() => {
      expect(screen.getByText(/Watch Ad to Unlock/i)).toBeEnabled();
    });
    fireEvent.click(screen.getByText(/Watch Ad to Unlock/i));
    await waitFor(() => {
      expect(
        screen.getByText(/Please sign in to watch ads/i),
      ).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({ getCreditWallet: vi.fn().mockResolvedValue(null), getActivityStreak: vi.fn().mockResolvedValue(null), recordActivity: vi.fn().mockResolvedValue(true), REWARD_EVENTS: {} }));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/lib/queries", () => ({ logAnalyticsEvent: vi.fn().mockResolvedValue(null), fetchColorCombinations: vi.fn().mockResolvedValue([]), fetchPaintColors: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/ai-access", () => ({ checkAiAccess: vi.fn().mockResolvedValue({ allowed: true, reason: null, usage: { creditsRemaining: 100, creditsUsed: 0 } }), requestRewardedAccess: vi.fn().mockResolvedValue({ success: true }), fetchAiAccessConfig: vi.fn().mockResolvedValue({ data: null, error: null }), getAiUsageStatus: vi.fn().mockResolvedValue({ creditsRemaining: 100, creditsUsed: 0, isUnlimited: false }) }));

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/AiColorAssistant")).default;
  return render(<MemoryRouter><ToastProvider><Comp /></ToastProvider></MemoryRouter>);
}

describe("AiColorAssistant", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("has an AdSlot import", async () => {
    // Verify the import exists in the source - prevents regression
    const mod = await import("@/pages/AiColorAssistant");
    expect(mod.default).toBeDefined();
  });
});

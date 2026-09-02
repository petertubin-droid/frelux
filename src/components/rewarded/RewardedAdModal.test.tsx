import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/rewarded-access", () => ({
  RewardedAccess: { canUse: vi.fn(() => false), watchAd: vi.fn(), from: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderModal() {
  const { RewardedAdModal } = await import("@/components/rewarded/RewardedAdModal");
  return render(
    <RewardedAdModal
      access={{ canUse: vi.fn(() => false), watchAd: vi.fn(), from: vi.fn() } as never}
      featureName="AI Assistant"
      features={["AI breakdown", "Smart suggestions"]}
    />,
  );
}

describe("RewardedAdModal", () => {
  it("renders without crashing", async () => {
    const { container } = await renderModal();
    expect(container.innerHTML).not.toBe("");
  });
});

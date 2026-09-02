import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// vi.mock is hoisted - everything must be inside the factory
vi.mock("@/lib/supabase-lazy", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user" } },
      }),
    },
  };
  return {
    getSupabase: vi.fn().mockResolvedValue(mockSupabase),
    isSupabaseConfigured: false,
  };
});

vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
}));

vi.mock("@/lib/credits-context", () => ({
  useCredits: vi.fn(() => ({
    wallet: { balance: 150 },
    streak: null,
    loading: false,
    refresh: vi.fn(),
    awardEvent: vi.fn(),
    trackActivity: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreditsWallet", () => {
  it("renders without crashing", async () => {
    const { CreditsWallet } = await import("@/components/credits/CreditsWallet");
    const { container } = render(
      <MemoryRouter>
        <CreditsWallet userId="test-user" />
      </MemoryRouter>,
    );
    expect(container.innerHTML).not.toBe("");
  });
});

describe("AiFeatureGate", () => {
  it("renders children content", async () => {
    const { AiFeatureGate } = await import("@/components/credits/CreditsWallet");
    const { container } = render(
      <MemoryRouter>
        <AiFeatureGate
          featureName="test"
          creditCost={5}
          onSpend={vi.fn()}
        >
          <div data-testid="child">Content</div>
        </AiFeatureGate>
      </MemoryRouter>,
    );
    expect(container.innerHTML).not.toBe("");
  });
});

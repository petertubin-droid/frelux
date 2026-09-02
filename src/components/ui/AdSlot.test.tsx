import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: false })),
}));

vi.mock("@/lib/ad-config", () => ({
  fetchAdConfig: vi.fn().mockResolvedValue({ providers: [], placements: [] }),
  getProvidersForPlacement: vi.fn(() => []),
  getAdUnitId: vi.fn(() => null),
  shouldDisplayPlacement: vi.fn(() => false),
  logAdEvent: vi.fn(),
}));

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderAdSlot(props: Record<string, unknown> = {}) {
  const AdSlot = (await import("@/components/ui/AdSlot")).default;
  return render(
    <MemoryRouter>
      <AdSlot slotKey="test-slot" {...props} />
    </MemoryRouter>,
  );
}

describe("AdSlot", () => {
  it("renders null for paid users", async () => {
    const { useAuth } = await import("@/lib/auth");
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, isPaid: true } as never);
    const { container } = await renderAdSlot();
    expect(container.innerHTML).toBe("");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const rpc = vi.fn();

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(async () => ({ rpc })),
  isSupabaseConfigured: true,
}));

async function renderBand() {
  const { default: CommunityProof } =
    await import("@/components/home/CommunityProof");
  return render(
    <MemoryRouter>
      <CommunityProof />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  rpc.mockReset();
  sessionStorage.clear();
});

describe("CommunityProof", () => {
  it("stays blank below 100 accounts", async () => {
    rpc.mockResolvedValue({ data: 0, error: null });
    const { container } = await renderBand();
    await Promise.resolve();
    expect(container.innerHTML).toBe("");
  });

  it("shows the real count once the community reaches 100", async () => {
    rpc.mockResolvedValue({ data: 128, error: null });
    const { container } = await renderBand();
    expect(await screen.findByText("128")).toBeTruthy();
    expect(container.textContent).toContain("Trusted by");
    expect(rpc).toHaveBeenCalledWith("frelux_community_size");
  });

  it("renders nothing when the count cannot be verified", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    const { container } = await renderBand();
    await Promise.resolve();
    expect(container.innerHTML).toBe("");
  });
});

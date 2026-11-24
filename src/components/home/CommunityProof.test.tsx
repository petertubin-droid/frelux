import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityProof from "@/components/home/CommunityProof";

const rpc = vi.fn();
vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(async () => ({ rpc })),
}));
vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

beforeEach(() => {
  sessionStorage.clear();
  rpc.mockReset();
});

async function renderBand() {
  const result = render(<CommunityProof />);
  return result;
}

describe("CommunityProof", () => {
  it("displays verifiable engineering authority metrics when accounts are below 100", async () => {
    rpc.mockResolvedValue({ data: 12, error: null });
    const { container } = await renderBand();
    await Promise.resolve();
    expect(container.textContent).toContain("77+ Calibrated Calculators");
    expect(container.textContent).toContain("630+ Live Material Prices");
    expect(container.textContent).toContain("Eurocode, ISO & NIS Norms");
    expect(container.textContent).toContain("Tamper-Proof Verification");
  });

  it("shows the real count once the community reaches 100 verified users", async () => {
    rpc.mockResolvedValue({ data: 128, error: null });
    const { container } = await renderBand();
    expect(await screen.findByText("128")).toBeTruthy();
    expect(container.textContent).toContain("Trusted by");
    expect(rpc).toHaveBeenCalledWith("frelux_community_size");
  });

  it("falls back to engineering authority metrics when the count cannot be verified or errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    const { container } = await renderBand();
    await Promise.resolve();
    expect(container.textContent).toContain("77+ Calibrated Calculators");
  });
});

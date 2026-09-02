import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderOfferwall() {
  const { OfferwallAd } = await import("@/components/rewarded/OfferwallAd");
  return render(
    <MemoryRouter>
      <OfferwallAd userId="test-user-id" onBack={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("OfferwallAd", () => {
  it("renders without crashing", async () => {
    const { container } = await renderOfferwall();
    expect(container.innerHTML).not.toBe("");
  });
});

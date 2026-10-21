import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderComp() {
  const Comp = (await import("@/components/home/InteractiveEstimatePreview"))
    .default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("InteractiveEstimatePreview", () => {
  it("renders without crashing", async () => {
    const { container } = await renderComp();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows zero default paint allowance and separates it from pack rounding", async () => {
    await renderComp();
    expect(screen.getByText(/optional allowance: 0%/i)).toBeTruthy();
    expect(
      screen.getByText(/purchase rounded up to full buckets/i),
    ).toBeTruthy();
  });
});

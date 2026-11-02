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

  it("shows every area in square feet and never in square metres", async () => {
    const { container } = await renderComp();
    const text = container.textContent ?? "";
    expect(text).toMatch(/ft²/);
    expect(text).not.toMatch(/m²/);
  });

  it("states the coverage rate in square feet per litre for the customer", async () => {
    await renderComp();
    expect(screen.getByText(/ft² per litre per\s+coat/i)).toBeTruthy();
    expect(screen.queryByText(/internal/i)).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/queries", () => ({
  fetchPaintColors: vi.fn().mockResolvedValue({ data: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderMatcher() {
  const { PaintMatcher } = await import("@/components/ui/PaintMatcher");
  return render(
    <MemoryRouter>
      <PaintMatcher />
    </MemoryRouter>,
  );
}

describe("PaintMatcher", () => {
  it("renders without crashing", async () => {
    const { container } = await renderMatcher();
    expect(container.innerHTML).not.toBe("");
  });
});

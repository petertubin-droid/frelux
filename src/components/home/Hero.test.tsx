import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderHero() {
  const Hero = (await import("@/components/home/Hero")).default;
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

describe("Hero", () => {
  it("renders without crashing", async () => {
    const { container } = await renderHero();
    expect(container.innerHTML).not.toBe("");
  });
});

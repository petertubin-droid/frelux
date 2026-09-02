import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

async function renderComp() {
  const Comp = (await import("@/components/learn/AskAiWidget")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("AskAiWidget", () => {
  it("renders without crashing", async () => {
    const { container } = await renderComp();
    expect(container.innerHTML).not.toBe("");
  });
});

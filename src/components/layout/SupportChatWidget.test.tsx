import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderWidget() {
  const SupportChatWidget = (await import("@/components/layout/SupportChatWidget")).default;
  return render(
    <MemoryRouter>
      <SupportChatWidget />
    </MemoryRouter>,
  );
}

describe("SupportChatWidget", () => {
  it("renders without crashing", async () => {
    const { container } = await renderWidget();
    expect(container.innerHTML).not.toBe("");
  });
});

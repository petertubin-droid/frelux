import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/queries", async () => {
  const actual = await vi.importActual<any>("@/lib/queries");
  return {
    ...actual,
    fetchSharedResource: vi
      .fn()
      .mockResolvedValue({ data: null, error: "Link expired" }),
    fetchSharedProject: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

import { Route, Routes } from "react-router-dom";

async function renderPage(path = "/shared/test-link-id") {
  const Comp = (await import("@/pages/SharedProject")).default;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/shared/:id" element={<Comp />} />
          <Route path="*" element={<Comp />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("SharedProject", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("displays error when shared link is invalid or expired", async () => {
    const { findByText } = await renderPage();
    expect(
      await findByText(/This share link is invalid or has expired/i),
    ).toBeTruthy();
  });
});

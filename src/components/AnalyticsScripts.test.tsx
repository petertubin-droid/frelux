import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

async function renderComp() {
  const Comp = (await import("@/components/AnalyticsScripts")).default;
  return render(<MemoryRouter><Comp /></MemoryRouter>);
}

describe("AnalyticsScripts", () => {
  it("renders without crashing", async () => {
    const { container } = await renderComp();
    // May render null (empty) in dev mode - that's fine, just no crash
    expect(container).toBeTruthy();
  });
});

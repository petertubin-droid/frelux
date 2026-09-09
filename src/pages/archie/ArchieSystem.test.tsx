import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Infrastructure-cost query chain resolves to an empty, error-free result.
// Explicit type: the proxy references itself, which would otherwise
// be circular (TS7022).
const queryChain: unknown = new Proxy(() => queryChain, {
  get: (_t, prop) => {
    if (prop === "then")
      return (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null, count: null }).then(resolve);
    if (prop === "catch") return () => Promise.resolve({ data: null });
    return queryChain;
  },
  apply: () => queryChain,
});

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: async () => ({
    from: () => queryChain,
  }),
}));

import ArchieSystem from "@/pages/archie/ArchieSystem";

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(<ArchieSystem />);
}

describe("ArchieSystem", () => {
  it("renders the System (Infrastructure, API & PWA) page", () => {
    renderPage();
    expect(screen.getByText("System")).toBeTruthy();
  });

  it("mounts without crashing while costs are unresolved", () => {
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

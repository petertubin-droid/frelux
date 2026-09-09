import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const fetchMyPersonhood = vi.fn();
const fetchSharedConversations = vi.fn();
const fetchSharedKnowledge = vi.fn();

vi.mock("@/lib/archie/stage2-shared-client", () => ({
  fetchMyPersonhood: (...a: unknown[]) => fetchMyPersonhood(...a),
  fetchSharedConversations: (...a: unknown[]) => fetchSharedConversations(...a),
  fetchSharedKnowledge: (...a: unknown[]) => fetchSharedKnowledge(...a),
}));

import ArchieShared from "@/pages/archie/ArchieShared";

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyPersonhood.mockResolvedValue(null);
  fetchSharedConversations.mockResolvedValue([]);
  fetchSharedKnowledge.mockResolvedValue([]);
});

function renderPage() {
  return render(<ArchieShared />);
}

describe("ArchieShared", () => {
  it("renders the Shared with you page and states no access honestly", async () => {
    renderPage();
    expect(screen.getByText("Shared with you")).toBeTruthy();
    expect(await screen.findByText("No ARCHIE access yet.")).toBeTruthy();
  });

  it("mounts without crashing while shares are unresolved", () => {
    fetchMyPersonhood.mockReturnValue(new Promise(() => null));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

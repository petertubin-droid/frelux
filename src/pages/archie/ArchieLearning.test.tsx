import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const listLearningIngestions = vi.fn();

vi.mock("@/lib/archie/stage1-client", () => ({
  listLearningIngestions: (...a: unknown[]) => listLearningIngestions(...a),
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import ArchieLearning from "@/pages/archie/ArchieLearning";

beforeEach(() => {
  vi.clearAllMocks();
  listLearningIngestions.mockResolvedValue([]);
});

function renderPage() {
  return render(<ArchieLearning />);
}

describe("ArchieLearning", () => {
  it("renders the Learning console", () => {
    renderPage();
    expect(screen.getByText("Learning")).toBeTruthy();
  });

  it("lists ingested learning material once loaded", async () => {
    listLearningIngestions.mockResolvedValue([
      {
        id: "i1",
        title: "Roofing method",
        state: "AWAITING_APPROVAL",
        input_type: "TEXT",
        created_date: "2026-01-01T00:00:00Z",
      },
    ]);
    renderPage();
    expect(await screen.findByText("Roofing method")).toBeTruthy();
  });

  it("mounts without crashing while ingestions are unresolved", () => {
    listLearningIngestions.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

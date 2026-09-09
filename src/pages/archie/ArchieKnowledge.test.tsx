import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const listKnowledgeItems = vi.fn();
const listKnowledgeHistory = vi.fn();
const updateKnowledgeItem = vi.fn();
const rollbackKnowledgeItem = vi.fn();

vi.mock("@/lib/archie/stage2-knowledge-client", () => ({
  KNOWLEDGE_SCOPES: [
    { key: "GLOBAL", label: "Global", note: "Applies everywhere." },
    { key: "REGIONAL", label: "Regional", note: "Scoped to a region key." },
    { key: "PROJECT", label: "Project", note: "Scoped to one project." },
    { key: "PROPERTY", label: "Property", note: "Scoped to one property." },
    { key: "USER", label: "User", note: "Scoped to one user." },
  ],
  listKnowledgeItems: (...a: unknown[]) => listKnowledgeItems(...a),
  listKnowledgeHistory: (...a: unknown[]) => listKnowledgeHistory(...a),
  updateKnowledgeItem: (...a: unknown[]) => updateKnowledgeItem(...a),
  rollbackKnowledgeItem: (...a: unknown[]) => rollbackKnowledgeItem(...a),
}));

import ArchieKnowledge from "@/pages/archie/ArchieKnowledge";

beforeEach(() => {
  vi.clearAllMocks();
  listKnowledgeItems.mockResolvedValue([]);
  listKnowledgeHistory.mockResolvedValue([]);
  updateKnowledgeItem.mockResolvedValue({ ok: true });
  rollbackKnowledgeItem.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieKnowledge />);
}

describe("ArchieKnowledge", () => {
  it("renders the Knowledge Vault", () => {
    renderPage();
    expect(screen.getByText("Knowledge Vault")).toBeTruthy();
  });

  it("lists knowledge items once loaded", async () => {
    listKnowledgeItems.mockResolvedValue([
      {
        id: "k1",
        scope: "GLOBAL",
        topic: "Cement mix ratio",
        content: { ratio: "1:2:4" },
        status: "ACTIVE",
        version: 2,
      },
    ]);
    renderPage();
    expect(await screen.findByText("Cement mix ratio")).toBeTruthy();
  });

  it("mounts without crashing while items are unresolved", () => {
    listKnowledgeItems.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const listTerminology = vi.fn();
const createTerminology = vi.fn();
const setVerification = vi.fn();
const deleteTerminology = vi.fn();

vi.mock("@/lib/archie/stage2-terminology-client", () => ({
  TERMINOLOGY_DOMAINS: [
    "construction",
    "materials",
    "labour",
    "estimation",
    "property",
    "planning",
    "regulations",
    "general",
  ] as const,
  listTerminology: (...a: unknown[]) => listTerminology(...a),
  createTerminology: (...a: unknown[]) => createTerminology(...a),
  setVerification: (...a: unknown[]) => setVerification(...a),
  deleteTerminology: (...a: unknown[]) => deleteTerminology(...a),
}));

import ArchieTerminology from "@/pages/archie/ArchieTerminology";

beforeEach(() => {
  vi.clearAllMocks();
  listTerminology.mockResolvedValue([]);
  createTerminology.mockResolvedValue({ ok: true, id: "t1" });
  setVerification.mockResolvedValue({ ok: true });
  deleteTerminology.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieTerminology />);
}

describe("ArchieTerminology", () => {
  it("renders the TerminoBook console", () => {
    renderPage();
    expect(screen.getByText("TerminoBook")).toBeTruthy();
  });

  it("opens the add-terminology form which submits as UNVERIFIED", () => {
    renderPage();
    fireEvent.click(screen.getByText("+ Add terminology"));
    expect(screen.getByText("Add as UNVERIFIED")).toBeTruthy();
  });

  it("lists terminology entries once loaded", async () => {
    listTerminology.mockResolvedValue([
      {
        id: "t1",
        domain: "construction",
        language_code: "yo",
        canonical_term: "block",
        regional_term: "bloku",
        meaning_note: "Sandcrete block",
        verification_status: "VERIFIED",
        version: 1,
      },
    ]);
    renderPage();
    expect(await screen.findByText(/bloku/)).toBeTruthy();
  });

  it("mounts without crashing while entries are unresolved", () => {
    listTerminology.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

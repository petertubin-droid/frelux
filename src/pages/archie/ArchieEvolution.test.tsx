import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const fetchChangeRequests = vi.fn();
const fetchEvolutionSettings = vi.fn();
const fetchLanguageProfiles = vi.fn();
const saveEvolutionSettings = vi.fn();
const transitionChangeRequestServer = vi.fn();
const authorizeOwnerChange = vi.fn();
const buildApprovalView = vi.fn();

vi.mock("@/lib/archie/evolution/persistence", () => ({
  fetchChangeRequests: (...a: unknown[]) => fetchChangeRequests(...a),
  fetchEvolutionSettings: (...a: unknown[]) => fetchEvolutionSettings(...a),
  fetchLanguageProfiles: (...a: unknown[]) => fetchLanguageProfiles(...a),
  saveEvolutionSettings: (...a: unknown[]) => saveEvolutionSettings(...a),
  transitionChangeRequestServer: (...a: unknown[]) =>
    transitionChangeRequestServer(...a),
}));

vi.mock("@/lib/archie/evolution/change-request", () => ({
  buildApprovalView: (...a: unknown[]) => buildApprovalView(...a),
}));

vi.mock("@/lib/archie/mobile/owner-authorization", () => ({
  authorizeOwnerChange: (...a: unknown[]) => authorizeOwnerChange(...a),
}));

import ArchieEvolution from "@/pages/archie/ArchieEvolution";

beforeEach(() => {
  vi.clearAllMocks();
  fetchChangeRequests.mockResolvedValue({ ok: true, data: [] });
  fetchEvolutionSettings.mockResolvedValue({ ok: false, error: "none" });
  fetchLanguageProfiles.mockResolvedValue({ ok: true, data: [] });
  saveEvolutionSettings.mockResolvedValue({ ok: true });
  transitionChangeRequestServer.mockResolvedValue({ ok: true });
  authorizeOwnerChange.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieEvolution />);
}

describe("ArchieEvolution", () => {
  it("renders the Evolution control center", () => {
    renderPage();
    expect(screen.getByText("Evolution")).toBeTruthy();
  });

  it("exposes the settings and registry views", () => {
    renderPage();
    expect(screen.getByText("settings")).toBeTruthy();
    expect(screen.getByText("registry")).toBeTruthy();
  });

  it("shows language-learning toggles in the settings view", () => {
    renderPage();
    fireEvent.click(screen.getByText("settings"));
    expect(screen.getAllByText("Language learning").length).toBeGreaterThan(0);
  });

  it("does not save settings until the Owner acts", () => {
    renderPage();
    expect(saveEvolutionSettings).not.toHaveBeenCalled();
  });
});

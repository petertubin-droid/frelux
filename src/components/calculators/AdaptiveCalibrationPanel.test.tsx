import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CalibrationFeedback } from "@/lib/estimation/adaptive-calibration";

const { authState, repo, storage } = vi.hoisted(() => ({
  authState: {
    user: { id: "owner-1" } as { id: string } | null,
    isAdmin: false,
  },
  repo: {
    load: vi.fn(),
    persist: vi.fn(),
    review: vi.fn(),
    remove: vi.fn(),
    invalidate: vi.fn(),
  },
  storage: { subscribe: vi.fn(() => () => {}) },
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => authState }));
vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
vi.mock("@/lib/estimation/calibration-repository", () => ({
  loadCalibrationFeedback: repo.load,
  persistCalibrationFeedback: repo.persist,
  reviewCalibrationFeedback: repo.review,
  removeCalibrationFeedback: repo.remove,
  invalidateCalibrationCache: repo.invalidate,
}));
vi.mock("@/lib/estimation/calibration-storage", () => ({
  subscribeCalibrationFeedback: storage.subscribe,
}));

import { AdaptiveCalibrationPanel } from "./AdaptiveCalibrationPanel";
import { marketFromProject } from "@/lib/estimation/calibration-project";

const pendingRow: CalibrationFeedback = {
  id: "row-1",
  projectId: "p1",
  marketCode: "NG",
  materialKey: "block",
  measure: "material",
  estimatedQuantity: 100,
  actualQuantity: 110,
  unit: "piece",
  evidence: "self_attested",
  recordedAt: "2026-11-01T00:00:00.000Z",
  context: "takeoff",
  status: "pending_review",
  source: "cloud",
};

function renderPanel(data?: Record<string, unknown>) {
  return render(
    <AdaptiveCalibrationPanel
      project={{ id: "p1", name: "Lekki duplex", data }}
    />,
  );
}

async function open() {
  fireEvent.click(screen.getByRole("button", { name: /log actuals/i }));
  await screen.findByRole("region", {
    name: "Actuals, calibration and cost coding",
  });
  await screen.findByText(/evidence stored/i);
}

describe("adaptive calibration panel", () => {
  beforeEach(() => {
    repo.load.mockClear();
    repo.persist.mockClear();
    repo.review.mockClear();
    repo.remove.mockClear();
    authState.user = { id: "owner-1" };
    authState.isAdmin = false;
    repo.load.mockResolvedValue({
      rows: [pendingRow],
      mode: "cloud",
      error: null,
    });
    repo.persist.mockResolvedValue({ ok: true, mode: "cloud", reason: null });
    repo.review.mockResolvedValue({ ok: true, mode: "cloud", reason: null });
    repo.remove.mockResolvedValue({ ok: true, mode: "cloud", reason: null });
    repo.invalidate.mockClear();
  });

  it("announces itself as a disclosure that controls the panel", () => {
    renderPanel({ market: "NG" });
    const toggle = screen.getByRole("button", { name: /log actuals/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "calibration-panel-p1");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("region", {
        name: "Actuals, calibration and cost coding",
      }),
    ).toBeInTheDocument();
  });

  it("will not record anything until the project's market is known", async () => {
    renderPanel();
    await open();
    fireEvent.change(screen.getByLabelText("Material or trade"), {
      target: { value: "block" },
    });
    fireEvent.change(screen.getByLabelText("Unit"), {
      target: { value: "piece" },
    });
    fireEvent.change(screen.getByLabelText("Estimated quantity"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Actual quantity"), {
      target: { value: "110" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save actuals for review" }),
    );
    expect(
      await screen.findByText(/choose the project's market first/i),
    ).toBeInTheDocument();
    expect(repo.persist).not.toHaveBeenCalled();
  });

  it("saves a normalised record against the project market", async () => {
    renderPanel({ market: "NG" });
    await open();
    fireEvent.change(screen.getByLabelText("Material or trade"), {
      target: { value: "9 inch block" },
    });
    fireEvent.change(screen.getByLabelText("Unit"), {
      target: { value: "pieces" },
    });
    fireEvent.change(screen.getByLabelText("Estimated quantity"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Actual quantity"), {
      target: { value: "112" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save actuals for review" }),
    );
    await waitFor(() => expect(repo.persist).toHaveBeenCalledTimes(1));
    const saved = repo.persist.mock.calls[0][0];
    expect(saved.marketCode).toBe("NG");
    expect(saved.materialKey).toBe("block");
    expect(saved.unit).toBe("piece");
    expect(saved.evidence).toBe("self_attested");
    expect(saved.status).toBe("pending_review");
    expect(saved.context).toBe("takeoff");
  });

  it("keeps an owner review self attested", async () => {
    renderPanel({ market: "NG" });
    await open();
    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
    await waitFor(() => expect(repo.review).toHaveBeenCalledTimes(1));
    expect(repo.review.mock.calls[0][0].reviewerRole).toBe("owner");
  });

  it("lets an administrator verify the same record", async () => {
    authState.isAdmin = true;
    renderPanel({ market: "NG" });
    await open();
    fireEvent.click(await screen.findByRole("button", { name: "Verify" }));
    await waitFor(() => expect(repo.review).toHaveBeenCalledTimes(1));
    expect(repo.review.mock.calls[0][0].reviewerRole).toBe("admin");
    expect(repo.review.mock.calls[0][0].decision).toBe("accepted");
  });

  it("exports a saved record, not the empty form", async () => {
    renderPanel({ market: "NG", currency: "NGN" });
    await open();
    expect(
      await screen.findByRole("button", { name: "Export cost code for block" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Remove record for block" }),
    ).toBeInTheDocument();
  });

  it("says when it is showing the device copy", async () => {
    repo.load.mockResolvedValue({
      rows: [],
      mode: "device",
      error: "network",
    });
    renderPanel({ market: "NG" });
    await open();
    expect(
      await screen.findByText(/cloud unavailable, showing device copy/i),
    ).toBeInTheDocument();
  });

  it("refuses a currency code as a market", () => {
    expect(
      marketFromProject({ id: "p", name: "n", data: { market: "NGN" } }),
    ).toBe("");
    expect(
      marketFromProject({ id: "p", name: "n", data: { country: "Nigeria" } }),
    ).toBe("");
    expect(
      marketFromProject({ id: "p", name: "n", data: { marketCode: "ng" } }),
    ).toBe("NG");
    expect(marketFromProject({ id: "p", name: "n" })).toBe("");
  });
});

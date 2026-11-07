// =========================================================
// PLAN IMPORT PANEL TESTS
//
// What matters here: a guest is told to sign in, a read plan
// shows its values and only applies the ones left ticked, and
// nothing reaches the engine before the visitor presses
// "Use these values".
// =========================================================

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlanImportPanel from "./PlanImportPanel";

const requestPlanExtraction = vi.fn();

vi.mock("@/lib/plan-vision/extraction", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/plan-vision/extraction")
  >("@/lib/plan-vision/extraction");
  return {
    ...actual,
    requestPlanExtraction: (...args: unknown[]) =>
      requestPlanExtraction(...args),
  };
});

const authState: { user: { id: string } | null } = { user: null };

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: authState.user }),
}));

function extractionFixture() {
  const dim = (value: number) => ({
    value,
    unit: "m" as const,
    kind: "dimension_annotation" as const,
    confidence: 0.94,
  });
  const base = {
    provenance: { documentId: "doc1", page: 1, method: "vision_model" },
    confidence: 0.94,
    reviewStatus: "user_confirmed" as const,
    corrections: [],
    extractedAt: "2026-11-07T00:00:00Z",
    verifiedAt: "2026-11-07T00:01:00Z",
  };
  return {
    id: "ext1",
    documentId: "doc1",
    version: 1,
    scale: null,
    rooms: [],
    roof: null,
    buildingFacts: [
      {
        ...base,
        id: "f1",
        key: "building_length",
        label: "length",
        dimension: dim(15),
      },
      {
        ...base,
        id: "f2",
        key: "building_width",
        label: "width",
        dimension: dim(10),
      },
    ],
    notes: [],
    warnings: [],
    issues: [],
    nativeUnit: "m" as const,
    extractedAt: "2026-11-07T00:00:00Z",
  };
}

function renderPanel(onApply = vi.fn()) {
  render(
    <MemoryRouter>
      <PlanImportPanel onApply={onApply} />
    </MemoryRouter>,
  );
  return onApply;
}

function uploadAFile() {
  const input = screen.getByLabelText(
    "Choose a plan to read",
  ) as HTMLInputElement;
  const file = new File(["plan"], "ground-floor.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  authState.user = null;
  requestPlanExtraction.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PlanImportPanel", () => {
  it("asks a guest to sign in instead of failing silently", () => {
    renderPanel();
    expect(screen.getByText(/plan reading needs a free account/i)).toBeTruthy();
    expect(screen.getByText("Sign in")).toBeTruthy();
    const readButton = screen.getByRole("button", { name: /read this plan/i });
    expect((readButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows what the drawing stated and applies only ticked values", async () => {
    authState.user = { id: "u1" };
    requestPlanExtraction.mockResolvedValue(extractionFixture());
    const onApply = renderPanel();

    uploadAFile();
    fireEvent.click(screen.getByRole("button", { name: /read this plan/i }));

    await waitFor(() =>
      expect(screen.getByText("Found on the drawing")).toBeTruthy(),
    );
    expect(screen.getByText("15 m")).toBeTruthy();
    expect(screen.getByText("10 m")).toBeTruthy();
    // Nothing goes to the engine just because it was read.
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Use Overall width"));
    fireEvent.click(screen.getByRole("button", { name: /use these values/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const [patch, origin] = onApply.mock.calls[0];
    expect(patch.building_length).toBe(15);
    expect(patch.building_width).toBeUndefined();
    expect(origin).toBe("plan");
  });

  it("reports a failed read honestly and keeps the manual path open", async () => {
    authState.user = { id: "u1" };
    requestPlanExtraction.mockRejectedValue(
      new Error("The AI extraction is temporarily unavailable."),
    );
    const onApply = renderPanel();

    uploadAFile();
    fireEvent.click(screen.getByRole("button", { name: /read this plan/i }));

    await waitFor(() =>
      expect(screen.getByText(/could not be read/i)).toBeTruthy(),
    );
    expect(onApply).not.toHaveBeenCalled();
  });
});

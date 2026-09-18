// =========================================================
// CONSTRUCTION EXTRACTION PANEL TESTS
//
// The contract of the AI extraction layer, at the UI seam:
//   * the AI NEVER calculates — it only produces user-
//     confirmed input values; Apply is disabled until at
//     least one field is accepted/edited
//   * text_description mode requires a real description;
//     document mode requires a file — Analyse stays
//     disabled otherwise (no accidental empty analyses)
//   * extraction failure degrades gracefully to the manual
//     workflow with an honest message
//   * zero fields read = honest refusal, not a fake success
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/construction-extraction", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/construction-extraction")
  >("@/lib/construction-extraction");
  return {
    ...actual,
    requestConstructionExtraction: vi.fn(),
    saveExtractionRecord: vi.fn().mockResolvedValue({ ok: true }),
    ConstructionExtractionError: actual.ConstructionExtractionError,
  };
});

import { requestConstructionExtraction } from "@/lib/construction-extraction";
import { ConstructionExtractionPanel } from "@/components/estimation/ConstructionExtractionPanel";

const FIELDS = [
  {
    key: "building_length",
    label: "Building length",
    value: 12.5,
    unit: "m",
    confidence: 0.92,
    verification: "ai_detected" as const,
    source: "text_description" as const,
  },
  {
    key: "building_width",
    label: "Building width",
    value: 8,
    unit: "m",
    confidence: 0.88,
    verification: "ai_detected" as const,
    source: "text_description" as const,
  },
  {
    key: "floor_to_floor_height",
    label: "Floor-to-floor height",
    value: 3,
    unit: "m",
    confidence: 0.7,
    verification: "requires_confirmation" as const,
    source: "visual_estimate" as const,
  },
];

const RESULT = {
  documentKind: "text_description" as const,
  fields: FIELDS,
  notes: [],
  warnings: [],
  processedAt: "2026-09-18T00:00:00Z",
};

const onApply = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ConstructionExtractionPanel — input gating", () => {
  it("renders the honest framing: AI reads values, the deterministic engine calculates", () => {
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    expect(screen.getAllByText(/Analyse with AI/i).length).toBeGreaterThan(0);
    // Analyse disabled until there is something to analyse
    const btn = screen.getByRole("button", {
      name: /Analyse with AI/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("text_description mode requires a real description before analysis", async () => {
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    fireEvent.click(
      screen.getByText(/Text description/i, { selector: "button *" }),
    );
    const btn = screen.getByRole("button", {
      name: /Analyse with AI/i,
    }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, {
      target: { value: "A 12m by 8m bungalow with 3m walls" },
    });
    expect(btn.disabled).toBe(false);
    expect(requestConstructionExtraction).not.toHaveBeenCalled();
  });
});

describe("ConstructionExtractionPanel — review and apply", () => {
  it("a successful extraction reaches review with accept/edit/reject per field", async () => {
    vi.mocked(requestConstructionExtraction).mockResolvedValue(RESULT as never);
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    fireEvent.click(
      screen.getByText(/Text description/i, { selector: "button *" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "A 12m by 8m bungalow with 3m walls" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyse with AI/i }));
    expect(await screen.findByLabelText("Accept Building length")).toBeTruthy();
    expect(screen.getByLabelText("Reject Floor-to-floor height")).toBeTruthy();
    // high-confidence AI reads are pre-accepted by initialDecisions; the
    // 0.7-confidence visual estimate is left for the human to confirm.
    const apply = screen.getByRole("button", {
      name: /Use 2 confirmed values/i,
    }) as HTMLButtonElement;
    expect(apply.disabled).toBe(false);
    expect(screen.getByText(/Requires confirmation/i)).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("accepting a field and applying hands the patch to the manual estimator, AI never calculates", async () => {
    vi.mocked(requestConstructionExtraction).mockResolvedValue(RESULT as never);
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    fireEvent.click(
      screen.getByText(/Text description/i, { selector: "button *" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "A 12m by 8m bungalow with 3m walls" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyse with AI/i }));
    // accept the pending low-confidence read, then apply the confirmed inputs
    fireEvent.click(
      await screen.findByLabelText("Accept Floor-to-floor height"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Use 3 confirmed values/i }),
    );
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    const [patch, meta] = onApply.mock.calls[0];
    expect(patch.building_length).toBe(12.5);
    expect(patch.building_width).toBe(8);
    expect(meta.appliedCount).toBe(3);
    expect(await screen.findByText(/Applied, continue below/i)).toBeTruthy();
  });

  it("editing a value uses the human's correction, not the AI's read", async () => {
    vi.mocked(requestConstructionExtraction).mockResolvedValue(RESULT as never);
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    fireEvent.click(
      screen.getByText(/Text description/i, { selector: "button *" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "A 12m by 8m bungalow with 3m walls" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyse with AI/i }));
    // numeric fields edit directly — no dropdown, the human types the correction
    const edit = await screen.findByLabelText("Edit Building length in m");
    fireEvent.change(edit, { target: { value: "13" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Use 2 confirmed values/i }),
    );
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(onApply.mock.calls[0][0].building_length).toBe(13);
  });
});

describe("ConstructionExtractionPanel — honest failure modes", () => {
  it("a failed extraction degrades gracefully to the manual workflow", async () => {
    vi.mocked(requestConstructionExtraction).mockRejectedValue(
      new Error("vision service unavailable"),
    );
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    fireEvent.click(
      screen.getByText(/Text description/i, { selector: "button *" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "A 12m by 8m bungalow with 3m walls" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyse with AI/i }));
    // plain Error → the panel's honest fallback, never the raw stack
    expect(
      await screen.findByText(/enter your dimensions manually below/i),
    ).toBeTruthy();
    // the manual path is still available — kind selector back in view
    expect(screen.getByText(/Text description/i)).toBeTruthy();
  });

  it("zero fields read is an honest refusal, never a fake success", async () => {
    vi.mocked(requestConstructionExtraction).mockResolvedValue({
      ...RESULT,
      fields: [],
    } as never);
    render(
      <ConstructionExtractionPanel currentOpenings={[]} onApply={onApply} />,
    );
    fireEvent.click(
      screen.getByText(/Text description/i, { selector: "button *" }),
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "A 12m by 8m bungalow with 3m walls" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Analyse with AI/i }));
    expect(
      await screen.findByText(/could not read any construction information/i),
    ).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });
});

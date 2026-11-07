/**
 * Page-level guards for the Mathematical Plan Elevation screen.
 *
 * The engine and the unit module are tested on their own; what this file pins is
 * the wiring a reader actually meets: the questions on the page come from the
 * shared registry rather than a local copy, the unit toggle changes what the
 * length fields show and accepts, and the export and copy buttons reach the
 * helpers they claim to.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const downloadCsv = vi.fn();
vi.mock("@/lib/export-utils", () => ({
  downloadCsv: (...args: unknown[]) => downloadCsv(...args),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  // jsdom exposes clipboard as a getter, so define it rather than assign.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    get: () => ({ writeText }),
  });
});

async function renderPage() {
  const Comp = (await import("@/pages/MathematicalPlanElevation")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

// Stage two of the form (roof, walls, openings) is folded away until a reader
// asks for it, so these tests open it the way a person would.
async function openDetailStage() {
  const disclosure = screen.queryByRole("button", { name: /Step 2 of 3/i });
  if (disclosure) fireEvent.click(disclosure);
}

describe("MathematicalPlanElevation page", () => {
  it("renders the registry questions instead of a local copy", async () => {
    await renderPage();
    const { getToolFaqGroup } = await import("@/config/tool-faqs");
    const group = getToolFaqGroup("mathematical-plan-elevation");
    expect(group).toBeDefined();
    // Every registry question for this tool must be on the page.
    for (const question of group!.questions) {
      expect(screen.getAllByText(question.q).length).toBeGreaterThan(0);
    }
  });

  it("switches length fields to feet and keeps the engine in metres", async () => {
    await renderPage();
    await openDetailStage();
    expect(screen.getByText("Building Length (m)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imperial" }));

    expect(screen.getByText("Building Length (ft)")).toBeInTheDocument();
    const lengthField = screen
      .getByText("Building Length (ft)")
      .closest("div")!
      .querySelector("input") as HTMLInputElement;
    // The default 12 m footprint reads as 39.37 ft, not as 12 ft.
    expect(Number(lengthField.value)).toBeCloseTo(39.37, 2);

    fireEvent.click(screen.getByRole("button", { name: "Metric" }));
    expect(screen.getByText("Building Length (m)")).toBeInTheDocument();
  });

  it("accepts a footprint typed in feet", async () => {
    await renderPage();
    await openDetailStage();
    fireEvent.click(screen.getByRole("button", { name: "Imperial" }));
    const label = screen.getByText("Building Length (ft)");
    const input = label
      .closest("div")!
      .querySelector("input") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "30" } });

    // 30 ft is 9.14 m, so switching back must show metres, not 30.
    fireEvent.click(screen.getByRole("button", { name: "Metric" }));
    const metricInput = screen
      .getByText("Building Length (m)")
      .closest("div")!
      .querySelector("input") as HTMLInputElement;
    expect(Number(metricInput.value)).toBeCloseTo(9.14, 2);
  });

  it("exports a CSV whose rows follow the selected unit system", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Imperial" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Export takeoff CSV/i }),
    );

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, rows, columns] = downloadCsv.mock.calls[0];
    expect(filename).toBe("frelux-plan-elevation-takeoff");
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as unknown[]).length).toBeGreaterThan(0);
    expect(columns).toBeDefined();
    const units = (rows as { unit: string }[]).map((row) => row.unit);
    expect(units).toContain("cu ft");
    expect(units).not.toContain("m³");
  });

  it("copies a summary that states the unit system and the limits", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Imperial" }));
    fireEvent.click(screen.getByRole("button", { name: /Copy summary/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Imperial display");
    expect(text).toContain("Not a design check");
    expect(text).toContain("L1 Foundation");
    expect(text).not.toContain("—");
  });

  it("tells the reader the schematic stays in metres", async () => {
    await renderPage();
    expect(
      screen.getByText(
        /schematic and its dimension callouts are drawn in metres/i,
      ),
    ).toBeInTheDocument();
  });
});

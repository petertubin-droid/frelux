import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  // isPaid: true keeps the PDF export path ungated in tests so
  // the export contracts exercise the real export, not the gate.
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: true })),
}));

vi.mock("@/lib/ai-credit-gate", () => ({
  spendAiCredits: vi.fn().mockResolvedValue(true),
}));

// Persistence layer: driven per-test via the imported mocks.
vi.mock("@/lib/queries", () => ({
  saveAdvancedEstimate: vi.fn().mockResolvedValue({ id: null, error: null }),
  fetchAdvancedEstimates: vi.fn().mockResolvedValue({ data: [], error: null }),
  deleteAdvancedEstimate: vi
    .fn()
    .mockResolvedValue({ data: null, error: null }),
}));

// Supabase functions: the PAID ai-studio calls are the thing the
// stability contracts must count precisely.
const invoke = vi.fn(async () => ({
  data: { response: "AI analysis text" },
  error: null,
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...(a as [])) },
  },
  isSupabaseConfigured: true,
}));

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockClear();
  invoke.mockImplementation(async () => ({
    data: { response: "AI analysis text" },
    error: null,
  }));
});

const ESTIMATE = {
  id: "e1",
  title: "Paint estimate",
  total_cost: 0,
  currency: "NGN",
  estimate_data: {},
  created_at: "2026-10-14T09:00:00Z",
};

async function renderCalc(
  contextSummary = "Area: 50 sqm, Paint: 3 containers",
) {
  const { AdvancedCalculator } =
    await import("@/components/rewarded/AdvancedCalculator");
  return render(
    <MemoryRouter>
      <AdvancedCalculator
        contextSummary={contextSummary}
        clientHash="test-hash-123"
      />
    </MemoryRouter>,
  );
}

async function openTab(name: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(name, "i") }));
}

describe("AdvancedCalculator — stability contracts", () => {
  it("renders without crashing", async () => {
    const { container } = await renderCalc();
    expect(container.innerHTML).not.toBe("");
  });

  it("NEVER calls the paid AI on mount — even after renders settle", async () => {
    await renderCalc();
    // Let every effect settle. The old behavior fired an ai-studio
    // request per render here (mount + every re-render of the
    // parent page); zero is the contract now.
    await new Promise((r) => setTimeout(r, 30));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("fetches the AI breakdown exactly once when the AI Analysis tab opens", async () => {
    await renderCalc();
    await openTab("AI Analysis");
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    // The request goes to ai-studio with the context summary.
    expect(invoke).toHaveBeenCalledWith(
      "ai-studio",
      expect.objectContaining({
        body: expect.objectContaining({ tool: "chat" }),
      }),
    );
  });

  it("does NOT refetch on tab re-entry with unchanged context", async () => {
    await renderCalc();
    await openTab("AI Analysis");
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    // Leave and come back.
    await openTab("Saved");
    await openTab("AI Analysis");
    await new Promise((r) => setTimeout(r, 20));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("does NOT refetch while on the tab when the parent re-renders with the same content", async () => {
    const { rerender } = await renderCalc();
    await openTab("AI Analysis");
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const { AdvancedCalculator } =
      await import("@/components/rewarded/AdvancedCalculator");
    // New string IDENTITY, same content — the historical
    // runaway-fetch trigger.
    rerender(
      <MemoryRouter>
        <AdvancedCalculator
          contextSummary={"Area: 50 sqm, Paint: 3 containers"}
          clientHash="test-hash-123"
        />
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("clamps negative costs to 0 and percentages to [0, 100]", async () => {
    await renderCalc();
    await openTab("Cost Adjuster");
    const numberInputs = screen
      .getAllByRole("spinbutton")
      .map((el) => el as HTMLInputElement);
    // labour, transport, markup, profit, tax (waste is buttons)
    const labour = numberInputs.find((el) => el.value === "0");
    expect(labour).toBeDefined();
    fireEvent.change(labour!, { target: { value: "-500" } });
    expect((labour as HTMLInputElement).value).toBe("0");

    // tax is the last cost-adjustment input (labour, transport,
    // markup, profit, tax) — its default is now 0, never an
    // assumed jurisdiction rate
    const tax = numberInputs[numberInputs.length - 1];
    expect((tax as HTMLInputElement).value).toBe("0");
    fireEvent.change(tax!, { target: { value: "150" } });
    expect((tax as HTMLInputElement).value).toBe("100");
    fireEvent.change(tax!, { target: { value: "-10" } });
    expect((tax as HTMLInputElement).value).toBe("0");
  });

  it("a FAILED delete keeps the row and surfaces the error — never a silent removal", async () => {
    const { fetchAdvancedEstimates, deleteAdvancedEstimate } =
      await import("@/lib/queries");
    vi.mocked(fetchAdvancedEstimates).mockResolvedValue({
      data: [ESTIMATE],
      error: null,
    } as never);
    vi.mocked(deleteAdvancedEstimate).mockResolvedValue({
      data: null,
      error: "network unreachable",
    } as never);
    await renderCalc();
    await openTab("Saved");
    expect(await screen.findByText("Paint estimate")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /error deleting estimate: network unreachable/i,
      ),
    );
    // The row is still there — it still exists server-side.
    expect(screen.getByText("Paint estimate")).toBeInTheDocument();
  });

  it("a successful delete removes the row", async () => {
    const { fetchAdvancedEstimates, deleteAdvancedEstimate } =
      await import("@/lib/queries");
    vi.mocked(fetchAdvancedEstimates).mockResolvedValue({
      data: [ESTIMATE],
      error: null,
    } as never);
    vi.mocked(deleteAdvancedEstimate).mockResolvedValue({
      data: null,
      error: null,
    } as never);
    await renderCalc();
    await openTab("Saved");
    expect(await screen.findByText("Paint estimate")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    await waitFor(() =>
      expect(screen.queryByText("Paint estimate")).toBeNull(),
    );
  });

  it("exports the CLICKED saved estimate, never the currently loaded content", async () => {
    const { fetchAdvancedEstimates } = await import("@/lib/queries");
    vi.mocked(fetchAdvancedEstimates).mockResolvedValue({
      data: [
        {
          ...ESTIMATE,
          id: "e1",
          title: "Saved ceiling estimate",
          estimate_data: {
            contextSummary: "SAVED-CONTEXT: POP ceiling 12 sqm",
            aiBreakdown: "SAVED-BREAKDOWN",
            costAdjust: {
              labourCost: 100,
              transportCost: 50,
              wastePercentage: 10,
              markupPercentage: 5,
              profitPercentage: 0,
              taxPercentage: 7.5,
            },
          },
        },
      ],
      error: null,
    } as never);
    const writes: string[] = [];
    const fakeWin = {
      document: {
        write: (h: string) => void writes.push(h),
        close: () => undefined,
      },
      print: () => undefined,
    };
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => fakeWin as unknown as Window);
    await renderCalc("LIVE-CONTEXT: paint 50 sqm (must NOT appear in export)");
    await openTab("Saved");
    expect(
      await screen.findByText("Saved ceiling estimate"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));
    await waitFor(() => expect(writes.length).toBe(1));
    // The printed document is built from the SAVED row's data.
    expect(writes[0]).toContain("Saved ceiling estimate");
    expect(writes[0]).toContain("SAVED-CONTEXT: POP ceiling 12 sqm");
    expect(writes[0]).toContain("SAVED-BREAKDOWN");
    expect(writes[0]).not.toContain("LIVE-CONTEXT");
    openSpy.mockRestore();
  });

  it("never shows a fake '0' cost for AI text estimates", async () => {
    const { fetchAdvancedEstimates } = await import("@/lib/queries");
    vi.mocked(fetchAdvancedEstimates).mockResolvedValue({
      data: [ESTIMATE],
      error: null,
    } as never);
    await renderCalc();
    await openTab("Saved");
    expect(await screen.findByText("Paint estimate")).toBeInTheDocument();
    expect(screen.getByText(/AI text estimate/i)).toBeInTheDocument();
    expect(screen.queryByText(/NGN 0/i)).toBeNull();
  });
});

/**
 * AdminEngineStudio conformance (admin coverage tranche 2, 2026-11-23).
 *
 * Asserts engine selection, form coercion (inputs are parsed as numbers
 * rather than typed strings), execution result display, error handling,
 * and JSON payload mode.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEngineStudio from "@/pages/admin/AdminEngineStudio";
import { executeEngine } from "@/lib/ai-foundation/engines-registry";

vi.mock("@/lib/ai-foundation/engines-registry", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/ai-foundation/engines-registry")
    >();
  return {
    ...actual,
    registerEngine: vi.fn(),
    listEngines: vi.fn().mockReturnValue([
      {
        id: "engine-fence-block",
        title: "Perimeter Fence Block Engine",
        domain: "masonry",
        description:
          "Calculates block count, mortar bags, sand tonnes and pillars",
        version: "1.2.0",
        category: "masonry",
        run: vi.fn(),
      },
    ]),
    executeEngine: vi.fn(),
  };
});

vi.mock("@/lib/ai-foundation/requirements", () => ({
  TASK_REQUIREMENTS: {
    fence: {
      engineId: "engine-fence-block",
      fields: [
        {
          name: "length_m",
          label: "Fence Length (meters)",
          unit: "m",
          required: true,
        },
        {
          name: "height_m",
          label: "Fence Height (meters)",
          unit: "m",
          required: true,
        },
      ],
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      engines: [
        { path: "src/engines/fence.ts", name: "engine-fence-block" },
        { path: "src/engines/unregistered.ts", name: "engine-unregistered" },
      ],
    }),
  } as unknown as Response);
});

describe("AdminEngineStudio", () => {
  it("renders Engine Studio admin title, metrics and lists registered engines", async () => {
    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Engine Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Perimeter Fence Block Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/1 registered engines/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Adapter coverage/i)).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 engine modules/i)).toBeInTheDocument();
    });
  });

  it("coerces numeric form inputs and executes the selected engine", async () => {
    vi.mocked(executeEngine).mockResolvedValueOnce({
      ok: true,
      quantities: [
        { label: "Vibrated Blocks (9 inch)", quantity: 1450, unit: "pcs" },
        { label: "Portland Cement (50kg)", quantity: 32, unit: "bags" },
      ],
      costs: { currency: "NGN", total: 1850000 },
    });

    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    const inputs = screen.getAllByRole("textbox");
    // inputs[0] is length_m, inputs[1] is height_m
    fireEvent.change(inputs[0], { target: { value: "45.5" } });
    fireEvent.change(inputs[1], { target: { value: "3" } });

    const runBtn = screen.getByRole("button", { name: /Run this engine/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(executeEngine).toHaveBeenCalledWith("engine-fence-block", {
        length_m: 45.5,
        height_m: 3,
      });
    });

    expect(await screen.findByText(/Vibrated Blocks \(9 inch\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1450 pcs/i)).toBeInTheDocument();
    expect(screen.getByText(/32 bags/i)).toBeInTheDocument();
    expect(screen.getByText(/NGN 1850000/i)).toBeInTheDocument();
  });

  it("surfaces errors when engine execution fails", async () => {
    vi.mocked(executeEngine).mockRejectedValueOnce(
      new Error("Soil bearing capacity calculation failed"),
    );

    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    const runBtn = screen.getByRole("button", { name: /Run this engine/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/The engine refused/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Soil bearing capacity calculation failed/i),
      ).toBeInTheDocument();
    });
  });

  it("switches to JSON mode and executes with raw JSON payload", async () => {
    vi.mocked(executeEngine).mockResolvedValueOnce({
      ok: true,
      quantities: [],
      costs: { currency: "USD", total: 500 },
    });

    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    const switchBtn = screen.getByRole("button", { name: /Switch to JSON/i });
    fireEvent.click(switchBtn);

    const jsonTextarea = screen.getByLabelText(/Test Payload \(JSON\)/i);
    fireEvent.change(jsonTextarea, {
      target: { value: '{"marketCode": "GH", "custom_param": 100}' },
    });

    const runBtn = screen.getByRole("button", { name: /Run with JSON payload/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(executeEngine).toHaveBeenCalledWith("engine-fence-block", {
        marketCode: "GH",
        custom_param: 100,
      });
    });

    expect(await screen.findByText(/USD 500/i)).toBeInTheDocument();
  });

  it("rejects invalid JSON in JSON mode without calling executeEngine", async () => {
    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Switch to JSON/i }));

    const jsonTextarea = screen.getByLabelText(/Test Payload \(JSON\)/i);
    fireEvent.change(jsonTextarea, {
      target: { value: "{ invalid-json: true " },
    });

    fireEvent.click(screen.getByRole("button", { name: /Run with JSON payload/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON input payload/i)).toBeInTheDocument();
    });
    expect(executeEngine).not.toHaveBeenCalled();
  });
});

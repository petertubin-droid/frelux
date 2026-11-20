import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEngineStudio from "@/pages/admin/AdminEngineStudio";

vi.mock("@/lib/ai-foundation/engines-registry", () => ({
  listEngines: vi.fn().mockReturnValue([
    {
      id: "engine-fence-block",
      title: "Perimeter Fence Block Engine",
      domain: "masonry",
      description: "Calculates block count, mortar bags, sand tonnes and pillars",
      version: "1.2.0",
      category: "masonry",
      run: vi.fn().mockResolvedValue({
        ok: true,
        quantities: { blocks: 1450, cement_bags: 32, sand_tonnes: 12 },
        costs: { total_ngn: 1850000 },
      }),
    },
  ]),
  executeEngine: vi.fn().mockResolvedValue({
    ok: true,
    quantities: { blocks: 1450, cement_bags: 32 },
    costs: { total_ngn: 1850000 },
  }),
}));

vi.mock("@/lib/ai-foundation/requirements", () => ({
  TASK_REQUIREMENTS: {
    fence: {
      engineId: "engine-fence-block",
      fields: [
        { name: "length_m", label: "Fence Length (meters)", unit: "m", required: true },
        { name: "height_m", label: "Fence Height (meters)", unit: "m", required: true },
      ],
    },
  },
}));

describe("AdminEngineStudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Engine Studio admin title and surface tracker", async () => {
    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Engine Studio/i)).toBeDefined();
    expect(screen.getByText(/Every registered engine/i)).toBeDefined();
  });

  it("lists registered calculation engines in selector", async () => {
    render(
      <MemoryRouter>
        <AdminEngineStudio />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Perimeter Fence Block Engine/i)).toBeDefined();
    });
  });
});

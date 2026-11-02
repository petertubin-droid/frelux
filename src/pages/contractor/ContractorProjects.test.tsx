import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { DbContractorProject } from "@/types/database";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/contractor", () => ({
  fetchContractorProjects: vi.fn().mockResolvedValue([]),
  deleteContractorProject: vi.fn().mockResolvedValue(undefined),
  duplicateContractorProject: vi.fn().mockResolvedValue({}),
  archiveContractorProject: vi.fn().mockResolvedValue(undefined),
  restoreContractorProject: vi.fn().mockResolvedValue(undefined),
}));
import {
  duplicateContractorProject,
  fetchContractorProjects,
} from "@/lib/contractor";

beforeEach(() => {
  vi.clearAllMocks();
});

const project = {
  id: "project-1",
  name: "Kitchen refresh",
  project_type: "painting",
  status: "draft",
  progress_percentage: 25,
  building_type: "residential",
  client_name: "Alex",
  total_project_cost: 1200,
  currency_symbol: "$",
  updated_at: "2026-10-14T00:00:00.000Z",
} as unknown as DbContractorProject;

describe("ContractorProjects", () => {
  it("module exports something", async () => {
    const mod = await import("@/pages/contractor/ContractorProjects");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("uses a semantic theme surface for the project action busy overlay", async () => {
    vi.mocked(fetchContractorProjects).mockResolvedValueOnce([project]);
    let finishDuplicate!: () => void;
    vi.mocked(duplicateContractorProject).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishDuplicate = () => resolve(project);
        }),
    );

    const ContractorProjects = (
      await import("@/pages/contractor/ContractorProjects")
    ).default;
    render(
      <MemoryRouter>
        <ContractorProjects />
      </MemoryRouter>,
    );

    await screen.findByText("Kitchen refresh");
    fireEvent.click(screen.getByRole("button", { name: "Project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    const busyStatus = await screen.findByRole("status", {
      name: "Updating project",
    });
    expect(busyStatus.className).toContain("bg-background/70");

    finishDuplicate();
    await waitFor(() =>
      expect(fetchContractorProjects).toHaveBeenCalledTimes(2),
    );
  });
});

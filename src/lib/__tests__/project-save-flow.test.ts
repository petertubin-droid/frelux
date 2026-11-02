import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveUserProject } from "@/lib/queries";
import { getLocalProjects } from "@/lib/local-projects";

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    },
    isSupabaseConfigured: vi.fn(() => false),
    supabaseWithClientHash: vi.fn(),
  };
});

vi.mock("@/lib/rewards-integration", () => ({
  trackProjectSaveWithRewards: vi.fn(),
}));

describe("Project Save Flow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("persists guest estimate locally when user is unauthenticated", async () => {
    const res = await saveUserProject(
      "Test Living Room POP",
      "pop_ceiling",
      { totalCost: 150000, area: 45 },
      "Guest POP project",
    );

    expect(res.error).toBeNull();
    const locals = getLocalProjects();
    expect(locals.length).toBe(1);
    expect(locals[0].name).toBe("Test Living Room POP");
    expect(locals[0].type).toBe("pop_calc");
    expect((locals[0].data as any).totalCost).toBe(150000);
  });

  it("normalizes unknown or alias project types gracefully", async () => {
    const res = await saveUserProject(
      "Kitchen Tile Estimate",
      "tile_estimate",
      { tileCost: 80000, sqm: 30 },
    );

    expect(res.error).toBeNull();
    const locals = getLocalProjects();
    expect(locals.length).toBe(1);
    expect(locals[0].name).toBe("Kitchen Tile Estimate");
    expect(locals[0].type).toBe("tile_calc");
  });
});

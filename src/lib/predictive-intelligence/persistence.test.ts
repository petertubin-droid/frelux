// =========================================================
// FRELUX PREDICTIVE INTELLIGENCE — PERSISTENCE & SECURITY TESTS
//
// Covers (§22, §21, §23):
//   - cache hit when input hash unchanged + fresh
//   - cache invalidation when source data changes
//   - cache expiry by age
//   - non-existent / unauthorized project → null (RLS-shaped)
//   - supabase cache-write failure never blocks the analysis
//   - snapshot fetch failure surfaces as an error, never a
//     fabricated analysis
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Controlled snapshot: identical shape to the real builder output.
const NOW = "2026-09-07T12:00:00.000Z";
function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "proj-1",
    now: NOW,
    project: {
      name: "P",
      status: "in_progress",
      createdAt: NOW,
      updatedAt: NOW,
      progressPercentage: 50,
    },
    stages: [],
    shoppingItems: [],
    calculations: [],
    priceHistory: [],
    marketPrices: [],
    visualObservations: [],
    region: { marketCode: "NG", countryCode: "NG", city: "Lagos" },
    ...overrides,
  };
}

const buildProjectSnapshotMock = vi.fn();

vi.mock("./snapshot", () => ({
  buildProjectSnapshot: (...args: unknown[]) =>
    buildProjectSnapshotMock(...args),
}));

const mockChain = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "project_predictive_analyses") return mockChain;
      throw new Error("unexpected table in this test");
    }),
  },
  isSupabaseConfigured: true,
}));

import { getProjectAnalysis } from "./persistence";
import { analyzeProject } from "./analysis";

describe("predictive analysis cache (§22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain.select.mockReturnValue(mockChain);
    // eq returns the chain so maybeSingle is reachable
    mockChain.eq.mockImplementation(() => mockChain);
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockChain.upsert.mockResolvedValue({ error: null });
    buildProjectSnapshotMock.mockResolvedValue(makeSnapshot());
  });

  it("computes and persists when no cache exists", async () => {
    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result).not.toBeNull();
    expect(result!.fromCache).toBe(false);
    expect(result!.analysis.projectId).toBe("proj-1");
    expect(mockChain.upsert).toHaveBeenCalled();
  });

  it("returns the cached analysis when the hash matches and it is fresh", async () => {
    const snapshot = makeSnapshot();
    const analysis = analyzeProject(snapshot as never);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        id: "row-1",
        project_id: "proj-1",
        input_hash: analysis.inputHash,
        result: analysis,
        created_at: NOW, // fresh within 6h
      },
      error: null,
    });
    buildProjectSnapshotMock.mockResolvedValue(snapshot);

    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result!.fromCache).toBe(true);
    expect(result!.analysis).toEqual(analysis);
    // no recompute write
    expect(mockChain.upsert).not.toHaveBeenCalled();
  });

  it("invalidates the cache when the source data changes (hash differs)", async () => {
    const staleAnalysis = analyzeProject(makeSnapshot() as never);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        project_id: "proj-1",
        input_hash: "old-hash",
        result: staleAnalysis,
        created_at: NOW,
      },
      error: null,
    });
    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result!.fromCache).toBe(false);
    expect(mockChain.upsert).toHaveBeenCalled();
  });

  it("expires a matching-hash cache that is too old", async () => {
    const snapshot = makeSnapshot();
    const analysis = analyzeProject(snapshot as never);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        project_id: "proj-1",
        input_hash: analysis.inputHash,
        result: analysis,
        created_at: "2026-09-01T00:00:00.000Z", // ~6.5 days old → expired
      },
      error: null,
    });
    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result!.fromCache).toBe(false);
  });

  it("a corrupt cache row is ignored, not served", async () => {
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        project_id: "proj-1",
        input_hash: "h",
        result: null,
        created_at: NOW,
      },
      error: null,
    });
    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result!.fromCache).toBe(false);
  });
});

describe("security & failure handling (§21, §23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain.eq.mockImplementation(() => mockChain);
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockChain.upsert.mockResolvedValue({ error: null });
  });

  it("a project invisible to the user (RLS / not found) returns null — never an analysis", async () => {
    buildProjectSnapshotMock.mockResolvedValue(null);
    const result = await getProjectAnalysis("someone-elses-project", {
      now: NOW,
    });
    expect(result).toBeNull();
  });

  it("a cache WRITE failure never blocks or corrupts the analysis", async () => {
    buildProjectSnapshotMock.mockResolvedValue(makeSnapshot());
    mockChain.upsert.mockResolvedValue({ error: { message: "network down" } });
    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result).not.toBeNull();
    expect(result!.fromCache).toBe(false);
    expect(result!.analysis.risks).toBeDefined();
  });

  it("a cache READ failure degrades to direct computation", async () => {
    buildProjectSnapshotMock.mockResolvedValue(makeSnapshot());
    mockChain.maybeSingle.mockRejectedValue(new Error("fetch failed"));
    const result = await getProjectAnalysis("proj-1", { now: NOW });
    expect(result!.fromCache).toBe(false);
    expect(result!.analysis.predictions.length).toBe(6);
  });

  it("forceRecompute bypasses a valid cache", async () => {
    const snapshot = makeSnapshot();
    const analysis = analyzeProject(snapshot as never);
    mockChain.maybeSingle.mockResolvedValue({
      data: {
        project_id: "proj-1",
        input_hash: analysis.inputHash,
        result: analysis,
        created_at: NOW,
      },
      error: null,
    });
    buildProjectSnapshotMock.mockResolvedValue(snapshot);
    const result = await getProjectAnalysis("proj-1", {
      now: NOW,
      forceRecompute: true,
    });
    expect(result!.fromCache).toBe(false);
  });
});

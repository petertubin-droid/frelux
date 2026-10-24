import { describe, expect, it } from "vitest";
import { WALL_FINISHING_CANDIDATE_COUNT, WALL_FINISHING_LIBRARY_MARKETS, WALL_FINISHING_NATIVE_MARKET_COUNT, WALL_FINISHING_THEMES, getWallFinishingCandidates } from "../knowledge-library";

describe("wall finishing knowledge library registry", () => {
  it("covers selector markets without implying wall-finishing evidence", () => {
    expect(WALL_FINISHING_LIBRARY_MARKETS).toHaveLength(32);
    expect(WALL_FINISHING_NATIVE_MARKET_COUNT).toBe(20);
  });
  it("creates five editorial themes per existing catalog candidate only", () => {
    expect(WALL_FINISHING_THEMES).toHaveLength(5);
    expect(WALL_FINISHING_CANDIDATE_COUNT).toBe(87);
    expect(getWallFinishingCandidates().every((candidate) => candidate.title.length > 0)).toBe(true);
  });
});

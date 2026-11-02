import { describe, it, expect } from "vitest";
import {
  PIPELINE_SOURCE_LABELS,
  PIPELINE_STAGE_LABELS,
  executeSharedPipeline,
  canSharePipeline,
} from "./shared-engine-pipeline";

describe("measurement/shared-engine-pipeline", () => {
  it("PIPELINE_SOURCE_LABELS has labels for all sources", () => {
    expect(PIPELINE_SOURCE_LABELS.building_to_roof).toBeTruthy();
    expect(PIPELINE_SOURCE_LABELS.ai_image_estimator).toBeTruthy();
  });

  it("PIPELINE_STAGE_LABELS has labels for stages", () => {
    expect(Object.keys(PIPELINE_STAGE_LABELS).length).toBeGreaterThan(0);
  });

  it("canSharePipeline returns true for any source", () => {
    expect(canSharePipeline("building_to_roof")).toBe(true);
    expect(canSharePipeline("ai_image_estimator")).toBe(true);
  });

  it("executeSharedPipeline processes spaces and returns result", () => {
    const result = executeSharedPipeline({
      source: "building_to_roof",
      projectName: "Test Project",
      unit: "meters",
      spaces: [
        {
          id: "s1",
          name: "Living Room",
          type: "living_room",
          length: 5,
          width: 4,
        },
      ],
      measurementVerification: "pending" as unknown as never,
    } as unknown as never);

    expect(result).toBeTruthy();
    expect(result.trace).toBeTruthy();
    expect(Array.isArray(result.trace)).toBe(true);
  });

  it("executeSharedPipeline accumulates total area from spaces", () => {
    const result = executeSharedPipeline({
      source: "building_to_roof",
      projectName: "Area Test",
      unit: "meters",
      spaces: [
        { id: "s1", name: "A", type: "bedroom", length: 5, width: 4 },
        { id: "s2", name: "B", type: "bedroom", length: 3, width: 3 },
      ],
      measurementVerification: "pending" as unknown as never,
    } as unknown as never);

    // 5*4 + 3*3 = 20 + 9 = 29
    expect(result.stages.measurement.totalAreaM2).toBe(29);
  });
});

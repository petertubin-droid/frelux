import { describe, it, expect } from "vitest";
import {
  createDetectedRoom,
  createPlanDetectionResult,
  startRoomReview,
  editDetectedRoom,
  confirmDetectedRoom,
} from "./plan-intelligence";

describe("measurement/plan-intelligence", () => {
  it("createDetectedRoom creates room with defaults", () => {
    const room = createDetectedRoom({
      name: "Living Room",
      spaceType: "living_room",
      length: 5,
      width: 4,
      unit: "meters",
    });
    expect(room.name).toBe("Living Room");
    expect(room.spaceType).toBe("living_room");
    expect(room.length).toBe(5);
    expect(room.unit).toBe("meters");
    expect(room.id).toBeTruthy();
    expect(room.verificationState).toBeTruthy();
  });

  it("createDetectedRoom respects aiConfidence", () => {
    const room = createDetectedRoom({
      name: "Bedroom",
      spaceType: "bedroom",
      length: 3,
      unit: "feet",
      aiConfidence: 85,
      aiConfidenceLevel: "high",
    });
    expect(room.aiConfidence).toBe(85);
    expect(room.aiConfidenceLevel).toBe("high");
  });

  it("createPlanDetectionResult creates result with rooms", () => {
    const room = createDetectedRoom({
      name: "Kitchen",
      spaceType: "kitchen",
      length: 4,
      unit: "meters",
    });
    const result = createPlanDetectionResult({
      planReference: "plan-001",
      rooms: [room],
      detectedUnit: "meters",
    });
    expect(result.planReference).toBe("plan-001");
    expect(result.rooms.length).toBe(1);
    expect(result.id).toBeTruthy();
    expect(result.scaleVerified).toBe(false);
  });

  it("startRoomReview transitions ai_detected to review state", () => {
    const room = createDetectedRoom({
      name: "LR",
      spaceType: "living_room",
      length: 5,
      unit: "meters",
    });
    const reviewing = startRoomReview(room);
    expect(reviewing.verificationState).not.toBe(room.verificationState);
  });

  it("editDetectedRoom marks as corrected and tracks changes", () => {
    const room = createDetectedRoom({
      name: "LR",
      spaceType: "living_room",
      length: 5,
      width: 4,
      unit: "meters",
    });
    const edited = editDetectedRoom(room, { length: 6, name: "Big LR" });
    expect(edited.length).toBe(6);
    expect(edited.name).toBe("Big LR");
  });

  it("confirmDetectedRoom transitions to confirmed state", () => {
    const room = createDetectedRoom({
      name: "LR",
      spaceType: "living_room",
      length: 5,
      unit: "meters",
    });
    const confirmed = confirmDetectedRoom(room);
    expect(confirmed.verificationState).toBeTruthy();
    expect(confirmed.verificationState).not.toBe(room.verificationState);
  });
});
